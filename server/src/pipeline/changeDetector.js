const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');

// Determine Python executable path (configurable via environment variable)
const PYTHON_PATH = process.env.PYTHON_PATH || 'python';
const SCRIPT_PATH = path.join(__dirname, '../../scripts/change_detection.py');
const OUTPUT_DIR = path.join(__dirname, '../../public/assets/analyses');

/**
 * Resolves a public URL or asset path to a local absolute filesystem path.
 */
function resolveLocalAssetPath(assetUrlOrPath) {
  if (!assetUrlOrPath) return '';

  // If already an absolute path
  if (path.isAbsolute(assetUrlOrPath) && fs.existsSync(assetUrlOrPath)) {
    return assetUrlOrPath;
  }

  // If it's a URL like http://localhost:5000/assets/scenes/wg_2023.svg
  const match = assetUrlOrPath.match(/\/assets\/(.*)$/);
  if (match) {
    const relPath = match[1];
    const candidatePath = path.join(__dirname, '../../public/assets', relPath);

    // If svg was specified, check if png exists
    if (candidatePath.toLowerCase().endsWith('.svg')) {
      const pngCandidate = candidatePath.slice(0, -4) + '.png';
      if (fs.existsSync(pngCandidate)) {
        return pngCandidate;
      }
    }

    if (fs.existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  // Check directly under public/assets/scenes/
  const basename = path.basename(assetUrlOrPath);
  const candidateScenes = path.join(__dirname, '../../public/assets/scenes', basename);
  if (fs.existsSync(candidateScenes)) {
    return candidateScenes;
  }

  // Check with .png replacement
  const baseWithoutExt = basename.replace(/\.[^/.]+$/, '');
  const candidatePng = path.join(__dirname, '../../public/assets/scenes', `${baseWithoutExt}.png`);
  if (fs.existsSync(candidatePng)) {
    return candidatePng;
  }

  return assetUrlOrPath;
}

/**
 * Executes the Python change detection pipeline with try/catch,
 * timeout protection, and guaranteed fallback to prepared results.
 */
async function runChangeDetectionPipeline({
  area,
  earlierScene,
  laterScene,
  method = 'PIXEL_DIFFERENCE',
  threshold = 28,
  resolutionMeters = 10,
  protectedZones = []
}) {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const isPulicat = area?.name?.toLowerCase().includes('pulicat');

  // Fallback payload in case of errors or when PREPARED_RESULT is explicitly requested
  const getPreparedFallback = (fallbackReason = null) => {
    const earlierDateStr = new Date(earlierScene.acquisitionDate).toISOString().slice(0, 10);
    const laterDateStr = new Date(laterScene.acquisitionDate).toISOString().slice(0, 10);

    const maskUrl = isPulicat
      ? 'http://localhost:5000/assets/scenes/pulicat_mask.svg'
      : 'http://localhost:5000/assets/scenes/wg_mask.svg';

    const qualityNotes = [
      'Prepared demonstration analysis result with aligned multi-temporal Sentinel-2 imagery.',
      `Baseline pass: ${earlierDateStr} (${earlierScene.source === 'SENTINEL_2' ? 'Sentinel-2 RGB' : 'Prepared Demo'}).`,
      `Comparison pass: ${laterDateStr} (${laterScene.source === 'SENTINEL_2' ? 'Sentinel-2 RGB' : 'Prepared Demo'}).`,
      'Ground sample resolution: 10m/pixel. Geometric alignment RMSE < 0.5px.'
    ];

    if (fallbackReason) {
      qualityNotes.push(
        `Fallback advisory: Automated pipeline transitioned to prepared result (${fallbackReason}).`
      );
    }

    const regions = isPulicat
      ? [
          {
            regionId: 'REG-001',
            category: 'WATER_CHANGE',
            areaSqMeters: 52000,
            confidence: 0.89,
            protectedZoneOverlap: true,
            reviewStatus: 'PENDING'
          },
          {
            regionId: 'REG-002',
            category: 'NEW_CONSTRUCTION',
            areaSqMeters: 33000,
            confidence: 0.82,
            protectedZoneOverlap: false,
            reviewStatus: 'PENDING'
          }
        ]
      : [
          {
            regionId: 'REG-001',
            category: 'VEGETATION_LOSS',
            areaSqMeters: 92000,
            confidence: 0.91,
            protectedZoneOverlap: true,
            reviewStatus: 'PENDING'
          },
          {
            regionId: 'REG-002',
            category: 'NEW_CONSTRUCTION',
            areaSqMeters: 56000,
            confidence: 0.84,
            protectedZoneOverlap: false,
            reviewStatus: 'PENDING'
          }
        ];

    return {
      method: 'PREPARED_RESULT',
      status: 'COMPLETED',
      changeMaskUrl: maskUrl,
      overlayUrl: laterScene.imageUrl,
      changedAreaSqMeters: isPulicat ? 85000 : 148000,
      changedAreaHectares: isPulicat ? 8.5 : 14.8,
      regions,
      qualityNotes,
      completedAt: new Date()
    };
  };

  // If prepared result is explicitly requested, return immediately
  if (method === 'PREPARED_RESULT') {
    return getPreparedFallback();
  }

  // Attempt live Python pixel-difference execution
  try {
    const earlierFile = resolveLocalAssetPath(earlierScene.imageUrl);
    const laterFile = resolveLocalAssetPath(laterScene.imageUrl);

    if (!fs.existsSync(earlierFile) || !fs.existsSync(laterFile)) {
      console.warn(`[Pipeline] Raster file not found (${earlierFile} or ${laterFile}). Falling back.`);
      return getPreparedFallback('Source raster files not located on local disk');
    }

    const analysisId = `run_${Date.now()}`;
    const boundsJson = JSON.stringify(area.boundary || earlierScene.bounds || {});
    const pzJson = JSON.stringify(
      (protectedZones || []).map((pz) => ({
        name: pz.name,
        category: pz.category,
        boundary: pz.boundary
      }))
    );

    const args = [
      SCRIPT_PATH,
      '--earlier', earlierFile,
      '--later', laterFile,
      '--output-dir', OUTPUT_DIR,
      '--analysis-id', analysisId,
      '--bounds', boundsJson,
      '--protected-zones', pzJson,
      '--resolution', String(earlierScene.resolutionMeters || resolutionMeters || 10),
      '--threshold', String(threshold || 28),
      '--min-pixels', '200'
    ];

    // Execute with 12-second timeout
    const pyResult = await new Promise((resolve, reject) => {
      execFile(PYTHON_PATH, args, { timeout: 12000, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          return reject(error);
        }
        try {
          const parsed = JSON.parse(stdout.trim());
          resolve(parsed);
        } catch (parseErr) {
          reject(new Error(`Failed to parse Python JSON output: ${stdout || stderr}`));
        }
      });
    });

    if (pyResult && pyResult.success) {
      console.log(`[Pipeline] Python change detection completed successfully (${pyResult.changedAreaHectares} ha detected).`);

      return {
        method: 'PIXEL_DIFFERENCE',
        status: 'COMPLETED',
        changeMaskUrl: pyResult.artifacts?.maskUrl || '',
        overlayUrl: pyResult.artifacts?.overlayUrl || laterScene.imageUrl,
        changedAreaSqMeters: pyResult.changedAreaSqMeters || 0,
        changedAreaHectares: pyResult.changedAreaHectares || 0,
        regions: (pyResult.regions || []).map((r) => ({
          regionId: r.regionId,
          category: r.category || 'OTHER',
          geometry: r.geometry || null,
          centroid: r.centroid || null,
          areaSqMeters: r.areaSqMeters || 0,
          confidence: r.confidence || 0.85,
          protectedZoneOverlap: Boolean(r.protectedZoneOverlap),
          reviewStatus: 'PENDING'
        })),
        qualityNotes: pyResult.qualityNotes || [
          'Differential pixel analysis completed using local NumPy pipeline.'
        ],
        completedAt: new Date()
      };
    } else {
      console.warn('[Pipeline] Python script returned failure. Falling back to prepared result.');
      return getPreparedFallback('Pipeline execution reported non-success');
    }
  } catch (err) {
    console.error('[Pipeline Error] Python execution failed:', err.message);
    // Graceful fallback to prepared result without crashing server
    return getPreparedFallback(err.message || 'Execution error in change detection script');
  }
}

module.exports = {
  runChangeDetectionPipeline,
  resolveLocalAssetPath
};

