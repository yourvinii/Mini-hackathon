#!/usr/bin/env python3
"""
LandWatch Change-Detection Pipeline
-----------------------------------
A lightweight, robust multi-temporal satellite image difference pipeline using NumPy and Pillow.

Pipeline Steps:
1. Load baseline (T1) and post-event (T2) images.
2. Confirm / normalize image dimensions.
3. Compute Euclidean color difference & spectral difference indices.
4. Apply thresholding and morphological neighborhood noise filtering.
5. Cluster contiguous pixels into anomaly regions (connected components).
6. Classify changes using documented spectral shift rules (VEGETATION_LOSS, WATER_CHANGE, NEW_CONSTRUCTION, OTHER).
7. Calculate genuine area metrics based on ground sample distance (resolutionMeters).
8. Project pixel coordinates to geographic coordinates (latitude, longitude) if bounds provided.
9. Check geometric intersection with official protected reserves.
10. Generate transparent change-mask and composite overlay PNG artifacts.
11. Output structured JSON to stdout for Express backend consumption.
"""

import sys
import os
import json
import argparse
import traceback
import math

try:
    import numpy as np
    from PIL import Image, ImageDraw, ImageFont, ImageFilter
except ImportError as e:
    sys.stderr.write(f"Missing required Python dependencies: {e}\n")
    sys.exit(2)


def parse_args():
    parser = argparse.ArgumentParser(description="LandWatch Satellite Image Change Detection Pipeline")
    parser.add_argument("--earlier", required=True, help="Path or filename of earlier baseline scene")
    parser.add_argument("--later", required=True, help="Path or filename of later comparison scene")
    parser.add_argument("--output-dir", required=True, help="Directory to save generated mask and overlay artifacts")
    parser.add_argument("--analysis-id", default="live", help="Unique identifier for output artifacts")
    parser.add_argument("--bounds", default="", help="GeoJSON boundary coordinates or bounding box JSON string")
    parser.add_argument("--protected-zones", default="[]", help="JSON string array of protected zones")
    parser.add_argument("--resolution", type=float, default=10.0, help="Ground sample distance in meters per pixel")
    parser.add_argument("--threshold", type=float, default=28.0, help="Pixel difference threshold (0-255)")
    parser.add_argument("--min-pixels", type=int, default=250, help="Minimum cluster size in pixels to filter noise")
    return parser.parse_args()


def resolve_image_path(path_str):
    """
    Resolves an image path. If an SVG path is given or file doesn't exist,
    checks for a PNG counterpart with the same base name.
    """
    if os.path.exists(path_str):
        if path_str.lower().endswith(".svg"):
            png_candidate = os.path.splitext(path_str)[0] + ".png"
            if os.path.exists(png_candidate):
                return png_candidate
        return path_str

    # Check with .png extension
    base, ext = os.path.splitext(path_str)
    png_candidate = base + ".png"
    if os.path.exists(png_candidate):
        return png_candidate

    raise FileNotFoundError(f"Image asset not found: {path_str}")


def extract_bbox_bounds(bounds_input):
    """
    Extracts [min_lng, min_lat, max_lng, max_lat] from a GeoJSON Polygon or bounding box array.
    """
    if not bounds_input:
        return None

    try:
        if isinstance(bounds_input, str):
            data = json.loads(bounds_input)
        else:
            data = bounds_input

        # Check if coordinates array provided
        coords = data.get("coordinates") if isinstance(data, dict) else data
        if not coords:
            return None

        min_lng, max_lng = 180.0, -180.0
        min_lat, max_lat = 90.0, -90.0
        found = False

        def traverse(pts):
            nonlocal min_lng, max_lng, min_lat, max_lat, found
            if not isinstance(pts, (list, tuple)):
                return
            if len(pts) >= 2 and isinstance(pts[0], (int, float)) and isinstance(pts[1], (int, float)):
                lng, lat = float(pts[0]), float(pts[1])
                if -180.0 <= lng <= 180.0 and -90.0 <= lat <= 90.0:
                    min_lng = min(min_lng, lng)
                    max_lng = max(max_lng, lng)
                    min_lat = min(min_lat, lat)
                    max_lat = max(max_lat, lat)
                    found = True
            else:
                for item in pts:
                    traverse(item)

        traverse(coords)
        if found and min_lng < max_lng and min_lat < max_lat:
            return [min_lng, min_lat, max_lng, max_lat]
    except Exception:
        pass
    return None


def point_in_polygon(lng, lat, polygon_coords):
    """
    Ray-casting algorithm to test if (lng, lat) is inside a GeoJSON polygon ring.
    """
    if not polygon_coords or not isinstance(polygon_coords, (list, tuple)):
        return False

    ring = polygon_coords[0] if isinstance(polygon_coords[0], (list, tuple)) and len(polygon_coords[0]) > 0 and isinstance(polygon_coords[0][0], (list, tuple)) else polygon_coords
    inside = False
    n = len(ring)
    if n < 3:
        return False

    j = n - 1
    for i in range(n):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]

        intersect = ((yi > lat) != (yj > lat)) and (lng < (xj - xi) * (lat - yi) / (yj - yi + 1e-12) + xi)
        if intersect:
            inside = not inside
        j = i
    return inside


def filter_noise_simple(binary_mask):
    """
    Applies 3x3 neighborhood thresholding to remove isolated noise pixels
    and fill small holes using pure NumPy operations.
    """
    h, w = binary_mask.shape
    # Count neighbors with a 3x3 sliding window sum
    pad = np.pad(binary_mask.astype(np.int8), 1, mode='constant', constant_values=0)
    neighbor_count = (
        pad[0:h, 0:w] + pad[0:h, 1:w+1] + pad[0:h, 2:w+2] +
        pad[1:h+1, 0:w]                  + pad[1:h+1, 2:w+2] +
        pad[2:h+2, 0:w] + pad[2:h+2, 1:w+1] + pad[2:h+2, 2:w+2]
    )

    # Keep active pixels that have at least 2 active neighbors (removes isolated dots)
    filtered = (binary_mask & (neighbor_count >= 2))
    # Fill small gaps: turn on pixels that have >= 6 active neighbors
    filtered = filtered | (neighbor_count >= 6)
    return filtered


def cluster_connected_components(binary_mask, min_cluster_pixels=200):
    """
    Identifies connected components and computes their bounding boxes, areas, and centroids.
    Returns list of clusters: dict(id, pixel_count, bbox=[min_x, min_y, max_x, max_y], centroid=[cx, cy], mask_slice)
    """
    h, w = binary_mask.shape
    visited = np.zeros((h, w), dtype=bool)
    clusters = []

    # Downsample grid for clustering efficiency if image is large
    # Grid step of 2 gives 4x speedup while preserving regional accuracy
    step = 2
    cluster_idx = 1

    for y in range(0, h, step):
        for x in range(0, w, step):
            if binary_mask[y, x] and not visited[y, x]:
                # Start Breadth-First-Search flood fill
                queue = [(x, y)]
                visited[y, x] = True
                comp_pixels = []

                min_cx, max_cx = x, x
                min_cy, max_cy = y, y
                sum_x, sum_y = 0, 0

                while queue:
                    curr_x, curr_y = queue.pop()
                    comp_pixels.append((curr_x, curr_y))
                    sum_x += curr_x
                    sum_y += curr_y

                    min_cx = min(min_cx, curr_x)
                    max_cx = max(max_cx, curr_x)
                    min_cy = min(min_cy, curr_y)
                    max_cy = max(max_cy, curr_y)

                    # Check 4-connected neighbors with step
                    for dx, dy in [(-step, 0), (step, 0), (0, -step), (0, step)]:
                        nx, ny = curr_x + dx, curr_y + dy
                        if 0 <= nx < w and 0 <= ny < h:
                            if binary_mask[ny, nx] and not visited[ny, nx]:
                                visited[ny, nx] = True
                                queue.append((nx, ny))

                # Approximate actual pixel count (scaled by step*step)
                est_pixels = len(comp_pixels) * (step * step)

                if est_pixels >= min_cluster_pixels:
                    centroid_x = int(sum_x / len(comp_pixels))
                    centroid_y = int(sum_y / len(comp_pixels))

                    # Pad bounding box slightly
                    bbox = [
                        max(0, min_cx - 4),
                        max(0, min_cy - 4),
                        min(w - 1, max_cx + 4),
                        min(h - 1, max_cy + 4)
                    ]

                    clusters.append({
                        "id": f"REG-{cluster_idx:03d}",
                        "pixels": est_pixels,
                        "bbox": bbox,
                        "centroid": [centroid_x, centroid_y]
                    })
                    cluster_idx += 1

    # Sort descending by pixel area
    clusters.sort(key=lambda c: c["pixels"], reverse=True)
    return clusters[:8]  # Retain top 8 significant clusters


def classify_cluster(arr1, arr2, cluster):
    """
    Classifies a cluster using documented spectral shift rules:
    - VEGETATION_LOSS: Sharp drop in green vegetation index.
    - WATER_CHANGE: Sharp drop in water body absorption / drying up.
    - NEW_CONSTRUCTION: High increase in structural reflectance / concrete brightness.
    - OTHER: General spectral variance.
    """
    bbox = cluster["bbox"]
    x1, y1, x2, y2 = bbox
    patch1 = arr1[y1:y2+1, x1:x2+1].astype(np.float32)
    patch2 = arr2[y1:y2+1, x1:x2+1].astype(np.float32)

    if patch1.size == 0 or patch2.size == 0:
        return "OTHER", 0.80

    # Channels: 0=R, 1=G, 2=B
    r1, g1, b1 = patch1[:, :, 0], patch1[:, :, 1], patch1[:, :, 2]
    r2, g2, b2 = patch2[:, :, 0], patch2[:, :, 1], patch2[:, :, 2]

    # Greenness Index proxy: (G - R) / (G + R + 1)
    gi1 = (g1 - r1) / (g1 + r1 + 1.0)
    gi2 = (g2 - r2) / (g2 + r2 + 1.0)
    delta_veg = np.mean(gi2 - gi1)

    # Water Index proxy: (B - R) / (B + R + 1)
    wi1 = (b1 - r1) / (b1 + r1 + 1.0)
    wi2 = (b2 - r2) / (b2 + r2 + 1.0)
    delta_water = np.mean(wi2 - wi1)

    # Brightness change proxy: (R + G + B) / 3
    mean_bright1 = np.mean((r1 + g1 + b1) / 3.0)
    mean_bright2 = np.mean((r2 + g2 + b2) / 3.0)
    delta_brightness = mean_bright2 - mean_bright1

    # Apply documented classification rules
    if delta_veg < -0.10:
        category = "VEGETATION_LOSS"
        confidence = min(0.96, 0.82 + abs(delta_veg) * 0.4)
    elif delta_water < -0.12 or (delta_water > 0.15):
        category = "WATER_CHANGE"
        confidence = min(0.95, 0.80 + abs(delta_water) * 0.4)
    elif delta_brightness > 20.0:
        category = "NEW_CONSTRUCTION"
        confidence = min(0.94, 0.80 + (delta_brightness / 100.0) * 0.25)
    else:
        category = "OTHER"
        confidence = 0.81

    return category, round(float(confidence), 2)


def main():
    args = parse_args()

    earlier_path = resolve_image_path(args.earlier)
    later_path = resolve_image_path(args.later)
    os.makedirs(args.output_dir, exist_ok=True)

    # 1. Load images
    img1 = Image.open(earlier_path).convert("RGB")
    img2 = Image.open(later_path).convert("RGB")

    # 2. Confirm & normalize dimensions
    quality_notes = [
        "Executed local NumPy differential pixel analysis pipeline.",
        f"Algorithm: Normalized Euclidean RGB delta with threshold={args.threshold:.1f}."
    ]

    if img1.size != img2.size:
        img1 = img1.resize(img2.size, Image.Resampling.BILINEAR)
        quality_notes.append(f"Image dimensions normalized to {img2.size[0]}x{img2.size[1]} px.")

    w, h = img2.size
    total_pixels = w * h

    # 3. Compute pixel differences
    arr1 = np.array(img1, dtype=np.float32)
    arr2 = np.array(img2, dtype=np.float32)

    diff_rgb = np.linalg.norm(arr2 - arr1, axis=2)
    raw_mask = diff_rgb > args.threshold

    # 4. Noise filtering
    filtered_mask = filter_noise_simple(raw_mask)
    changed_pixels = int(np.sum(filtered_mask))
    change_pct = round((changed_pixels / total_pixels) * 100.0, 2)

    # Area calculation based on spatial resolution
    res_m = float(args.resolution)
    pixel_area_sqm = res_m * res_m
    total_changed_sqm = int(changed_pixels * pixel_area_sqm)
    total_changed_ha = round(total_changed_sqm / 10000.0, 2)

    quality_notes.append(
        f"Spatial resolution: {res_m}m ground sampling distance ({pixel_area_sqm:.0f} m² per pixel)."
    )
    quality_notes.append(
        f"Identified {changed_pixels:,} changed pixels ({change_pct}% of surface extent) totaling {total_changed_ha} ha."
    )

    # 5. Connected components clustering
    clusters = cluster_connected_components(filtered_mask, min_cluster_pixels=args.min_pixels)
    if not clusters and changed_pixels > 0:
        # Fallback single region if no discrete cluster met threshold
        clusters = [{
            "id": "REG-001",
            "pixels": changed_pixels,
            "bbox": [0, 0, w - 1, h - 1],
            "centroid": [w // 2, h // 2]
        }]

    # 6. Parse geographic bounds & protected zones
    geo_bbox = extract_bbox_bounds(args.bounds)
    protected_zones = []
    try:
        if args.protected_zones:
            protected_zones = json.loads(args.protected_zones)
    except Exception:
        pass

    regions_data = []

    # Colors for categories
    color_map = {
        "VEGETATION_LOSS": (239, 68, 68),     # Red
        "NEW_CONSTRUCTION": (245, 158, 11),   # Amber/Orange
        "WATER_CHANGE": (2, 132, 199),        # Cyan/Blue
        "OTHER": (168, 85, 247)               # Purple
    }

    # Prepare mask and overlay canvas
    mask_canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    mask_draw = ImageDraw.Draw(mask_canvas)

    overlay_img = img2.copy()
    overlay_draw = ImageDraw.Draw(overlay_img)

    for cluster in clusters:
        cat, conf = classify_cluster(arr1, arr2, cluster)
        cluster_sqm = int(cluster["pixels"] * pixel_area_sqm)
        bbox = cluster["bbox"]
        cx, cy = cluster["centroid"]

        # Real-world geographic coordinates mapping if bounds available
        geom_geojson = None
        centroid_geojson = None
        overlaps_protected = False
        zone_name_matched = ""

        if geo_bbox:
            min_lng, min_lat, max_lng, max_lat = geo_bbox
            # Project pixel (x, y) to (lng, lat)
            def px_to_geo(px, py):
                lng = min_lng + (px / float(w)) * (max_lng - min_lng)
                lat = max_lat - (py / float(h)) * (max_lat - min_lat)
                return [round(lng, 5), round(lat, 5)]

            # Bounding polygon
            geo_ring = [
                px_to_geo(bbox[0], bbox[1]),
                px_to_geo(bbox[2], bbox[1]),
                px_to_geo(bbox[2], bbox[3]),
                px_to_geo(bbox[0], bbox[3]),
                px_to_geo(bbox[0], bbox[1])
            ]
            geom_geojson = {
                "type": "Polygon",
                "coordinates": [geo_ring]
            }

            geo_centroid = px_to_geo(cx, cy)
            centroid_geojson = {
                "type": "Point",
                "coordinates": geo_centroid
            }

            # Check protected zone intersection
            for pz in protected_zones:
                pz_boundary = pz.get("boundary", {})
                pz_coords = pz_boundary.get("coordinates")
                if pz_coords:
                    if point_in_polygon(geo_centroid[0], geo_centroid[1], pz_coords):
                        overlaps_protected = True
                        zone_name_matched = pz.get("name", "Protected Zone")
                        break

        # Draw on mask canvas
        cat_color = color_map.get(cat, (245, 158, 11))
        fill_rgba = cat_color + (110,)
        stroke_rgba = cat_color + (230,)

        # Draw rectangle or ellipse around the cluster
        mask_draw.rectangle(bbox, fill=fill_rgba, outline=stroke_rgba, width=3)

        # Label badge on mask
        label_text = f"{cluster['id']} ({cat.replace('_', ' ')})"
        mask_draw.rectangle([bbox[0], max(0, bbox[1] - 22), bbox[0] + len(label_text) * 8 + 12, bbox[1]], fill=cat_color + (220,))
        mask_draw.text((bbox[0] + 6, max(2, bbox[1] - 18)), label_text, fill=(255, 255, 255, 255))

        # Draw on composite overlay
        overlay_draw.rectangle(bbox, outline=cat_color, width=3)

        regions_data.append({
            "regionId": cluster["id"],
            "category": cat,
            "areaSqMeters": cluster_sqm,
            "confidence": conf,
            "geometry": geom_geojson,
            "centroid": centroid_geojson,
            "protectedZoneOverlap": overlaps_protected,
            "protectedZoneName": zone_name_matched,
            "reviewStatus": "PENDING"
        })

    # Save artifacts
    mask_filename = f"mask_{args.analysis_id}.png"
    overlay_filename = f"overlay_{args.analysis_id}.png"

    mask_output_path = os.path.join(args.output_dir, mask_filename)
    overlay_output_path = os.path.join(args.output_dir, overlay_filename)

    mask_canvas.save(mask_output_path, "PNG")
    overlay_img.save(overlay_output_path, "PNG")

    if any(r["protectedZoneOverlap"] for r in regions_data):
        quality_notes.append(
            "Overlap detected with official gazetted protected reserve boundary. Field verification flagged."
        )

    # 7. Output structured JSON
    result = {
        "success": True,
        "method": "PIXEL_DIFFERENCE",
        "changedAreaSqMeters": total_changed_sqm,
        "changedAreaHectares": total_changed_ha,
        "changedPixelCount": changed_pixels,
        "totalPixelCount": total_pixels,
        "changePercentage": change_pct,
        "resolutionMeters": res_m,
        "artifacts": {
            "maskFilename": mask_filename,
            "overlayFilename": overlay_filename,
            "maskUrl": f"http://localhost:5000/assets/analyses/{mask_filename}",
            "overlayUrl": f"http://localhost:5000/assets/analyses/{overlay_filename}"
        },
        "regions": regions_data,
        "qualityNotes": quality_notes
    }

    # Print JSON output to stdout
    print(json.dumps(result))
    sys.exit(0)


if __name__ == "__main__":
    try:
        main()
    except Exception as err:
        error_info = {
            "success": False,
            "error": str(err),
            "traceback": traceback.format_exc()
        }
        sys.stderr.write(json.dumps(error_info) + "\n")
        sys.exit(1)

