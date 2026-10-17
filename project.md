# PROJECT: LandWatch — AI-Powered Satellite Change Detection & Land Protection Platform (Hackathon MVP)

You are building a hackathon prototype. We have approximately 3 hours total and 2 developers, so prioritize a WORKING END-TO-END DEMO over completeness.

Keep code simple, readable, modular enough to maintain, and runnable locally. DO NOT do deployment, Docker, or CI/CD work. We will handle deployment at the end.

Build BOTH the frontend and backend. Do not build a backend-only prototype.

Build ONE chunk at a time. When a chunk is finished, explain how to run and test it, then STOP. Wait for me to explicitly request the next chunk.

# 1. THE IDEA

LandWatch is a satellite-based land monitoring platform that helps environmental officers and local authorities identify potential changes in land use, such as:

- New construction and built-up expansion
- Vegetation loss
- Possible encroachment into protected areas
- Shrinking water bodies
- Land disturbances requiring field inspection

The problem is that manually inspecting large areas is slow, and changes may remain unnoticed for months or years.

LandWatch compares satellite imagery of the same geographical area from two different dates, identifies regions that have changed, visualizes those regions on an interactive map, and creates inspection tasks for an authorized officer.

The application does NOT automatically declare construction illegal or prove that encroachment has occurred. It identifies potential changes that require verification.

## CORE LOOP

Select an area → select two dates → load satellite images → align and compare images → identify changed regions → display change overlays on a map → estimate affected area → flag changes inside protected zones → create inspection tasks → assign an inspector → upload or record field inspection evidence → verify or dismiss the finding → display the updated status and history.

For the hackathon demo, use a small set of pre-downloaded satellite-image pairs covering a few known areas.

If real satellite imagery is unavailable, the system must still run with clearly labelled demo imagery. Never present simulated changes as real satellite-derived findings.

# 2. HACKATHON PRIORITIES

Build a polished, working vertical slice instead of implementing every advanced remote-sensing feature.

The main demonstration must prove these five things:

1. An officer can select a known monitoring area.
2. The officer can compare imagery from two dates.
3. The application can show actual image differences or a clearly labelled prepared demonstration result.
4. The officer can create and manage an inspection task.
5. The officer can verify or dismiss a finding, and the UI updates accordingly.

Prefer one genuine image-comparison workflow over a complicated but nonfunctional AI pipeline.

# 3. TECH STACK — FIXED

## Frontend

- React with Vite
- JavaScript (do not introduce TypeScript unless the repository already uses it)
- Tailwind CSS for all application styling
- React Router for navigation
- React Leaflet + Leaflet for the interactive map
- Lucide React for icons
- Axios for API requests
- React Compare Slider or a small custom React component for the before/after image slider
- Recharts for compact dashboard charts, only if time permits

Use a Tailwind version compatible with the existing project. If starting from scratch, use the simplest supported Vite integration and verify that Tailwind styles actually render.

Do not mix Tailwind with a large UI component framework. Use Tailwind utility classes and a small set of reusable components.

## Backend

- Node.js
- Express
- Mongoose
- MongoDB using a connection string from `.env`
- dotenv
- CORS
- express-validator or equivalent lightweight request validation
- JWT + bcryptjs for officer authentication if authentication fits within the time budget
- Multer for optional inspection-photo uploads
- Centralized error-handling middleware

## Satellite imagery and change detection

Primary imagery source:
- Sentinel-2 imagery, preferably pre-downloaded GeoTIFF or exported RGB image tiles for a few selected areas and dates.

For the hackathon, prepare a small set of image pairs in advance. Avoid building a complex live satellite data acquisition system during the 3-hour session.

Use:
- Python 3 for the offline image-preparation script if needed
- Rasterio and NumPy for GeoTIFF handling and pixel-based change calculations, if compatible with the available environment
- OpenCV only if useful for alignment or image processing
- A small Python script that produces a georeferenced change mask or a simplified overlay artifact

The Express backend can invoke a local Python script only if the environment supports it and the processing time is reasonable. Otherwise, prepare the imagery and change-mask artifacts before the demo and serve the generated assets.

For the MVP, genuine image-difference processing is sufficient. Do not claim to have trained an AI model if no model has been trained.

If a suitable precomputed change mask is used, label it as a prepared analysis result.

## Database

- MongoDB
- Mongoose schemas
- GeoJSON geometry for areas and protected zones
- 2dsphere indexes where spatial queries are required and supported by the actual query

## Development setup

- Monorepo with `/client` and `/server`
- Local frontend: `http://localhost:5173`
- Local backend: `http://localhost:5000`
- Client API base URL: `VITE_API_URL=http://localhost:5000/api`

# 4. UI/UX REQUIREMENTS — HIGH PRIORITY

The UI must look like a polished modern environmental intelligence product, not a generic admin template.

Use Tailwind CSS out of the box. Make the interface visually coherent, responsive, accessible, and ready for a live presentation.

## Visual direction

Create a clean geospatial intelligence dashboard inspired by modern mapping and environmental monitoring applications.

- Neutral off-white or light slate backgrounds
- Dark forest-green primary accents
- Subtle borders, restrained shadows and rounded-lg/rounded-xl surfaces
- Strong typography hierarchy
- Clear labels, consistent spacing and compact information density
- Professional map controls and legends
- Avoid excessive gradients, glowing effects, giant cards and unnecessary animations
- Use consistent spacing and colors throughout the app
- Use Lucide React icons instead of emoji icons
- Provide useful loading, error, empty and success states
- Include responsive desktop and mobile layouts

The main map and imagery comparison should occupy the largest part of the workspace. Do not bury the main feature under rows of decorative statistics cards.

## Required pages

### A. Dashboard — `/`

Build a landing dashboard with:

- Sidebar navigation
- Top header with application name, selected area and officer profile
- Compact summary cards for pending inspections, detected changes and protected-zone alerts
- Recent change-detection activity
- A map preview showing monitored areas
- A prominent “Start New Analysis” action
- A clear indication of whether the current data is live, precomputed or demonstration data

### B. Change Analysis — `/analysis`

This is the core page and must receive the most UI/UX attention.

Layout:
- Main map with zoom controls and a clear legend
- Area-of-interest selector
- Earlier-date and later-date selectors
- “Compare Images” action
- Before/after image comparison slider
- Toggle for showing the change mask or highlighted changed regions
- Change summary with affected area and change category
- Confidence or quality indicator, if actually supported by the analysis
- List of detected regions with their coordinates or map location
- Protected-zone overlap warning when the geometry supports that conclusion
- “Create Inspection Task” action

Keep the comparison controls easy to understand. Do not force users to switch between many pages to compare imagery.

### C. Monitoring Areas — `/areas`

- List of configured monitoring areas
- Area name and geographic extent
- Last analysis date
- Latest analysis status
- Button to open an area in Change Analysis
- Ability to add a monitoring area by drawing a polygon on the map if time permits

### D. Inspections — `/inspections`

- Inspection task list
- Filter by status and priority
- Task details
- Assigned inspector
- Change finding associated with each task
- Actions to mark a task IN_PROGRESS, VERIFIED or DISMISSED
- Optional field-inspection notes and photo upload

### E. Protected Zones — `/protected-zones`

- List of protected areas
- Map visualization of their boundaries
- Add/edit/delete protected zones if time permits
- Show which detected changes intersect protected boundaries

### F. Login — `/login`

If authentication is implemented:
- Simple officer login
- Clear validation errors
- Seeded development account
- Do not build public registration for the MVP

## Shared UI components

Create reusable components only where they simplify implementation:

- `AppLayout`
- `Sidebar`
- `Topbar`
- `StatusBadge`
- `SummaryCard`
- `MapView`
- `DateRangeControls`
- `BeforeAfterSlider`
- `ChangeRegionList`
- `InspectionTaskForm`
- `EmptyState`
- `LoadingState`
- `ErrorMessage`
- `ConfirmDialog`

Avoid creating dozens of tiny files unnecessarily.

## UI behavior

- Use toast notifications or inline status messages for successful actions and errors.
- Disable actions while requests are pending.
- Show skeletons or loading indicators for map and analysis data.
- Use confirmation before destructive actions.
- Make forms keyboard accessible.
- Keep map legends visible and understandable.
- Preserve the selected area and dates when navigating back from an inspection task.
- Never display fake live-progress percentages.
- Distinguish real analysis results, prepared results and mock data with visible labels.

# 5. DATA MODEL — MONGOOSE

## MonitoringArea

Fields:
- `name`: String, required
- `description`: String
- `boundary`: GeoJSON Polygon
- `centroid`: GeoJSON Point
- `region`: String
- `status`: enum `ACTIVE | ARCHIVED`
- `createdAt`: Date
- `updatedAt`: Date

Create a 2dsphere index for `boundary` only if required by the spatial queries being implemented.

## SatelliteScene

Fields:
- `monitoringArea`: ObjectId reference to MonitoringArea
- `acquisitionDate`: Date
- `source`: enum `SENTINEL_2 | PREPARED_DEMO`
- `imageUrl`: String
- `thumbnailUrl`: String, optional
- `cloudCoverPercent`: Number, optional
- `resolutionMeters`: Number, optional
- `bounds`: GeoJSON Polygon, optional
- `processingStatus`: enum `READY | UNAVAILABLE`
- `createdAt`: Date

Use local static image paths or local assets for the hackathon if remote imagery fetching is unreliable.

## ChangeAnalysis

Fields:
- `monitoringArea`: ObjectId reference to MonitoringArea
- `earlierScene`: ObjectId reference to SatelliteScene
- `laterScene`: ObjectId reference to SatelliteScene
- `method`: enum `PIXEL_DIFFERENCE | PREPARED_RESULT`
- `status`: enum `PENDING | PROCESSING | COMPLETED | FAILED`
- `changeMaskUrl`: String, optional
- `overlayUrl`: String, optional
- `changedAreaSqMeters`: Number, optional
- `changedAreaHectares`: Number, optional
- `regions`: array of:
  - `regionId`: String
  - `category`: enum `NEW_CONSTRUCTION | VEGETATION_LOSS | WATER_CHANGE | OTHER`
  - `geometry`: GeoJSON Polygon, if available
  - `centroid`: GeoJSON Point, if available
  - `areaSqMeters`: Number, optional
  - `confidence`: Number, optional
  - `protectedZoneOverlap`: Boolean
  - `reviewStatus`: enum `PENDING | VERIFIED | DISMISSED`
- `qualityNotes`: array of Strings
- `createdAt`: Date
- `completedAt`: Date, optional

Important: pixel difference does not automatically establish the category of a change. If no reliable classifier exists, label the finding `OTHER` or `UNCLASSIFIED` instead of inventing a classification.

## ProtectedZone

Fields:
- `name`: String
- `description`: String
- `category`: enum `FOREST | WATERBODY | WILDLIFE | RESTRICTED_LAND | OTHER`
- `boundary`: GeoJSON Polygon
- `source`: enum `OFFICIAL | DEMO`
- `createdAt`: Date
- `updatedAt`: Date

## InspectionTask

Fields:
- `analysis`: ObjectId reference to ChangeAnalysis
- `monitoringArea`: ObjectId reference to MonitoringArea
- `regionId`: String
- `title`: String
- `description`: String
- `priority`: enum `LOW | MEDIUM | HIGH`
- `status`: enum `OPEN | IN_PROGRESS | VERIFIED | DISMISSED`
- `assignedTo`: String, optional for the MVP
- `inspectionNotes`: String, optional
- `evidenceUrls`: array of Strings
- `reviewedBy`: String, optional
- `reviewedAt`: Date, optional
- `createdAt`: Date
- `updatedAt`: Date

Inspection results must be editable only through authorized API routes.

# 6. API CONTRACT

Keep API response structures consistent. Implement these endpoints in the backend and create matching functions in `client/src/api.js`.

## Public or read-only demo endpoints

### `GET /api/health`

Returns:
`{ status: "ok" }`

### `GET /api/dashboard`

Returns:
`{ summary: { monitoredAreas, completedAnalyses, pendingInspections, protectedZoneAlerts }, recentAnalyses: [] }`

### `GET /api/areas`

Returns:
`{ areas: [...] }`

### `GET /api/areas/:id`

Returns:
`{ area: {...}, scenes: [...] }`

### `GET /api/areas/:id/scenes`

Returns available scenes for the area, ordered by acquisition date.

### `GET /api/analyses`

Returns:
`{ analyses: [...] }`

Allow filtering by `areaId` and `status`.

### `GET /api/analyses/:id`

Returns a single analysis with its area, scenes, detected regions and quality notes.

### `POST /api/analyses`

Body:
`{ areaId, earlierSceneId, laterSceneId, method? }`

Creates a change analysis. Validate that both scenes belong to the selected monitoring area and have different acquisition dates.

For the MVP, process the analysis synchronously if it finishes quickly. Otherwise return a processing status and provide a way to retrieve the result.

### `GET /api/protected-zones`

Returns:
`{ protectedZones: [...] }`

### `GET /api/inspections`

Returns:
`{ tasks: [...] }`

Allow filtering by status and priority.

### `POST /api/inspections`

Body:
`{ analysisId, regionId, title?, description?, priority? }`

Creates an inspection task for an existing detected region.

### `GET /api/inspections/:id`

Returns the inspection task and associated analysis details.

### `PATCH /api/inspections/:id`

Body may contain:
`{ status?, assignedTo?, inspectionNotes? }`

Validate status transitions and persist the changes.

### `POST /api/inspections/:id/evidence`

Optional. Accept one or more inspection photos with file-size and file-type limits.

For the MVP, this endpoint can be omitted if photo uploads threaten the timeline. Never accept arbitrary files.

## Optional protected endpoints

If authentication is implemented, protect write endpoints using JWT and role checks.

- `POST /api/areas`
- `PATCH /api/areas/:id`
- `POST /api/protected-zones`
- `PATCH /api/protected-zones/:id`
- `DELETE /api/protected-zones/:id`

For a three-hour demo, seeded monitoring areas and protected zones are sufficient. Do not spend the first hour building elaborate account management.

# 7. IMAGE PROCESSING REQUIREMENTS

## Preferred MVP method

Implement a real, small-scale image-comparison pipeline where practical.

1. Load two prepared images for the same area.
2. Confirm they represent the same geographic extent.
3. Normalize image dimensions and align the images if necessary.
4. Compare the images using a simple documented pixel-difference or normalized-difference method.
5. Generate a binary change mask.
6. Apply a threshold and simple noise filtering.
7. Calculate changed-pixel statistics.
8. Generate an overlay image.
9. Save or expose the result for the frontend.
10. Store analysis metadata and display quality limitations.

If georeferenced rasters are available, use their coordinate reference systems and pixel sizes when calculating area.

If only ordinary RGB images are available, report changed pixel counts or a clearly labelled approximate image-space estimate. Do not claim square metres or hectares unless the georeferencing and spatial resolution support that calculation.

## Change categories

The MVP can support:
- `NEW_CONSTRUCTION`
- `VEGETATION_LOSS`
- `WATER_CHANGE`
- `OTHER`

Only assign a category when an actual rule, model or prepared labelled dataset supports it.

If only pixel differences are available, report `OTHER` or `UNCLASSIFIED` and let an officer review the result.

## Protected-zone overlap

If both the detected region and protected-zone boundary have valid geographic geometries:
- Check whether they intersect.
- Flag the finding if an overlap is detected.
- Display the intersecting region on the map.
- Explain that overlap indicates a location requiring inspection, not proof of illegality.

Do not calculate intersections from unrelated or unaligned image coordinates.

## Fallback behavior

If the Python runtime, imagery, geospatial libraries or processing pipeline is unavailable:
- Keep the application functional.
- Use a prepared before/after image pair and a precomputed mask.
- Set `method` to `PREPARED_RESULT`.
- Display a visible `Prepared demo result` label.
- Do not claim that a live model processed the images.

Every processing operation must handle errors without crashing the server.

# 8. BUILD ORDER — ONE CHUNK AT A TIME

## CHUNK 0: FOUNDATION (BUILD THIS FIRST)

Inspect the current repository before changing anything.

### Backend
- Scaffold `/server`.
- Configure Express, CORS, dotenv, Mongoose and centralized error handling.
- Connect MongoDB using `MONGO_URI`.
- Create the models: MonitoringArea, SatelliteScene, ChangeAnalysis, ProtectedZone and InspectionTask.
- Create route files for dashboard, areas, scenes, analyses, protected zones and inspections.
- Implement every required API route with the correct response shape; minimal functional stubs are acceptable where later chunks add real logic.
- Add request validation and a consistent JSON error format.
- Add `server/seed.js` with:
  - Three fictional or clearly labelled demonstration monitoring areas.
  - At least two image scenes for one area.
  - One prepared change analysis.
  - Two protected zones.
  - Three inspection tasks in different statuses.
- Add `npm run seed`.

### Frontend
- Scaffold `/client` using Vite + React.
- Configure Tailwind CSS and verify it works before creating pages.
- Configure React Router.
- Install and configure React Leaflet, Leaflet, Axios and Lucide React.
- Create `src/api.js` with a function for each implemented endpoint.
- Create the shared AppLayout, sidebar, topbar, status badges and reusable loading/error states.
- Build the initial Dashboard, Analysis, Areas, Inspections and Protected Zones pages.
- Make navigation work and load real API responses or seeded data.
- Add the responsive UI foundation immediately; do not postpone all styling until the end.

### Repository
- Write `CONTRACT.md` with example request and response JSON for every endpoint.
- Add root-level instructions or a README with commands to start both applications.
- Keep the frontend and backend in separate folders within the same repository.

At the end of Chunk 0, the application must start locally, show a polished dashboard, navigate between pages and display seeded areas and inspection tasks.

Do not implement live satellite ingestion or the full image-processing pipeline in this chunk.

## CHUNK 1: SATELLITE SCENE LOADING

- Implement scene listing by monitoring area.
- Add date selectors to the Analysis page.
- Load the selected earlier and later scenes.
- Show image previews and acquisition dates.
- Handle missing imagery with an understandable empty state.
- Add a clearly visible source badge indicating whether imagery is prepared demo data or a verified satellite source.
- Ensure the two scenes belong to the same area.

## CHUNK 2: BEFORE/AFTER COMPARISON

- Build an interactive before/after slider.
- Allow users to move the divider between the two images.
- Add a change-mask toggle.
- Add a map overlay if valid geographic bounds are available.
- Display the analysis method, dates and quality notes.
- Make the comparison work on desktop and mobile.

## CHUNK 3: CHANGE-DETECTION PIPELINE

- Implement the smallest reliable image-difference pipeline available in the environment.
- Prefer pre-downloaded, aligned image pairs.
- Use a local Python script with NumPy and Rasterio if installed and suitable.
- Generate a change mask and overlay.
- Save the results as local assets or accessible analysis artifacts.
- Calculate meaningful changed-area metrics only when spatial metadata supports them.
- Record the processing method and limitations.
- Add try/catch, timeouts where appropriate, and failure states.
- Keep the prepared-result fallback functional.

Do not attempt to train a new deep-learning model within the hackathon unless the required dataset and model are already available.

## CHUNK 4: MAP VISUALIZATION AND PROTECTED ZONES

- Display monitoring areas on an interactive React Leaflet map.
- Render protected-zone boundaries with a clear legend.
- Show detected regions only when their geometry is valid.
- Highlight supported intersections between detected regions and protected zones.
- Provide popups with the finding category, area, date and review status.
- Keep the map responsive and ensure the Leaflet CSS and map container height are configured correctly.

## CHUNK 5: INSPECTION WORKFLOW

- Implement task creation from a detected region.
- Show a form for task title, description and priority.
- Persist tasks in MongoDB.
- Allow task status changes: OPEN, IN_PROGRESS, VERIFIED and DISMISSED.
- Show inspection notes and assigned inspector.
- Add optional field-photo evidence if time permits.
- Update the dashboard counts after task changes.
- Make clear that only an authorized reviewer can verify or dismiss a finding.

## CHUNK 6: FINAL DEMO AND QUALITY CHECKS

Test the complete flow:

1. Open the dashboard.
2. Select a monitoring area.
3. Select imagery from two dates.
4. Run a real comparison or open a clearly labelled prepared result.
5. View the change mask and affected region.
6. Inspect a possible protected-zone overlap.
7. Create an inspection task.
8. Open the Inspections page.
9. Mark the task IN_PROGRESS.
10. Verify or dismiss the finding.
11. Confirm that the dashboard and task list reflect the updated status.

Also check:
- Empty and loading states.
- API failures.
- Missing imagery.
- Responsive layout.
- Correct image attribution and source labels.
- No invented live analysis results.
- No unsupported area calculations.
- No exposed secrets.
- No broken navigation.

# 9. GENERAL RULES

- Work only on the current chunk.
- Inspect existing files before overwriting them.
- Use the simplest architecture that satisfies the requirements.
- Do not generate huge files with unrelated logic.
- Do not install unnecessary dependencies.
- Do not use placeholder buttons that appear functional but do nothing.
- Every major UI action must call the appropriate API or display an honest disabled/unavailable state.
- Use consistent model names and API contracts.
- Keep analysis results, scene metadata and inspection records persistent in MongoDB.
- Keep image artifacts in a predictable local directory for the MVP; do not store large binary images directly inside MongoDB documents.
- Validate all incoming IDs, dates, geometry and status values.
- Never expose server secrets through Vite environment variables.
- Clearly distinguish genuine results from prepared demo results.
- Do not present potential land changes as proof of illegal activity.

After every chunk, report:
1. Files created or modified.
2. Commands to run.
3. A quick manual or API test.
4. Required `.env` variables.
5. Known limitations.
6. What the next chunk will implement.

# 10. ENVIRONMENT VARIABLES

Server `.env`:

- `PORT=5000`
- `MONGO_URI=your_mongodb_connection_string`
- `CLIENT_URL=http://localhost:5173`
- `NODE_ENV=development`

Client `.env`:

- `VITE_API_URL=http://localhost:5000/api`

Do not add satellite API credentials unless the chosen imagery provider actually requires them. Prefer prepared imagery for the hackathon.

# FIRST ACTION

Start with CHUNK 0 only.

Inspect the workspace and repository. Preserve useful existing code. Build both the frontend and backend foundations, verify Tailwind is working, create the data models and API stubs, seed the demo database, and implement a polished initial UI with working navigation.

Start both applications locally and verify the dashboard loads data from the backend.

Do not proceed to Chunk 1 until I explicitly say to continue.