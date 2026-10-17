const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const { SatelliteScene } = require('../models');

// GET /api/scenes
router.get(
  '/',
  [query('areaId').optional().isMongoId().withMessage('Invalid areaId format'), validate],
  async (req, res, next) => {
    try {
      const filter = {};
      if (req.query.areaId) {
        filter.monitoringArea = req.query.areaId;
      }

      const scenes = await SatelliteScene.find(filter)
        .populate('monitoringArea', 'name region')
        .sort({ acquisitionDate: -1 })
        .lean();

      res.json({ scenes });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/scenes/:id
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Valid Scene MongoID is required'), validate],
  async (req, res, next) => {
    try {
      const scene = await SatelliteScene.findById(req.params.id)
        .populate('monitoringArea', 'name region boundary')
        .lean();

      if (!scene) {
        return res.status(404).json({
          success: false,
          error: { message: 'Satellite scene not found', code: 'NOT_FOUND' }
        });
      }

      res.json({ scene });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/scenes
router.post(
  '/',
  [
    body('monitoringArea').isMongoId().withMessage('Valid monitoringArea ID required'),
    body('acquisitionDate').isISO8601().toDate().withMessage('Valid acquisitionDate required'),
    body('imageUrl').notEmpty().withMessage('imageUrl is required'),
    validate
  ],
  async (req, res, next) => {
    try {
      const newScene = await SatelliteScene.create(req.body);
      res.status(201).json({ scene: newScene });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
