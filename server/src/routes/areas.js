const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { MonitoringArea, SatelliteScene } = require('../models');

// GET /api/areas
router.get('/', async (req, res, next) => {
  try {
    const areas = await MonitoringArea.find().sort({ createdAt: -1 }).lean();
    
    // Attach scene count and latest analysis date to each area
    const areasWithStats = await Promise.all(
      areas.map(async (area) => {
        const scenesCount = await SatelliteScene.countDocuments({ monitoringArea: area._id });
        const latestScene = await SatelliteScene.findOne({ monitoringArea: area._id })
          .sort({ acquisitionDate: -1 })
          .select('acquisitionDate')
          .lean();

        return {
          ...area,
          scenesCount,
          latestAnalysisDate: latestScene ? latestScene.acquisitionDate : null
        };
      })
    );

    res.json({ areas: areasWithStats });
  } catch (error) {
    next(error);
  }
});

// GET /api/areas/:id
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Valid Area MongoID is required'), validate],
  async (req, res, next) => {
    try {
      const area = await MonitoringArea.findById(req.params.id);
      if (!area) {
        return res.status(404).json({
          success: false,
          error: { message: 'Monitoring area not found', code: 'NOT_FOUND' }
        });
      }

      const scenes = await SatelliteScene.find({ monitoringArea: area._id })
        .sort({ acquisitionDate: 1 })
        .lean();

      res.json({ area, scenes });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/areas/:id/scenes
router.get(
  '/:id/scenes',
  [param('id').isMongoId().withMessage('Valid Area MongoID is required'), validate],
  async (req, res, next) => {
    try {
      const area = await MonitoringArea.findById(req.params.id);
      if (!area) {
        return res.status(404).json({
          success: false,
          error: { message: 'Monitoring area not found', code: 'NOT_FOUND' }
        });
      }

      const scenes = await SatelliteScene.find({ monitoringArea: req.params.id })
        .sort({ acquisitionDate: 1 })
        .lean();

      res.json({ scenes });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/areas
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Area name is required'),
    body('boundary').isObject().withMessage('Boundary GeoJSON Polygon is required'),
    body('boundary.type').equals('Polygon').withMessage('Boundary type must be Polygon'),
    body('boundary.coordinates').isArray({ min: 1 }).withMessage('Boundary coordinates required'),
    validate
  ],
  async (req, res, next) => {
    try {
      const { name, description, region, boundary, centroid } = req.body;

      // Compute centroid if not provided
      let calculatedCentroid = centroid;
      if (!calculatedCentroid && boundary?.coordinates?.[0]?.length > 0) {
        const ring = boundary.coordinates[0];
        const avgLng = ring.reduce((sum, pt) => sum + pt[0], 0) / ring.length;
        const avgLat = ring.reduce((sum, pt) => sum + pt[1], 0) / ring.length;
        calculatedCentroid = { type: 'Point', coordinates: [avgLng, avgLat] };
      }

      const newArea = await MonitoringArea.create({
        name,
        description: description || '',
        region: region || 'General',
        boundary,
        centroid: calculatedCentroid || { type: 'Point', coordinates: [0, 0] }
      });

      res.status(201).json({ area: newArea });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
