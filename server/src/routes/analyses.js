const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const { ChangeAnalysis, SatelliteScene, MonitoringArea } = require('../models');

// GET /api/analyses
router.get(
  '/',
  [
    query('areaId').optional().isMongoId().withMessage('Invalid areaId format'),
    query('status').optional().isIn(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']).withMessage('Invalid status filter'),
    validate
  ],
  async (req, res, next) => {
    try {
      const filter = {};
      if (req.query.areaId) filter.monitoringArea = req.query.areaId;
      if (req.query.status) filter.status = req.query.status;

      const analyses = await ChangeAnalysis.find(filter)
        .populate('monitoringArea', 'name region boundary')
        .populate('earlierScene', 'acquisitionDate imageUrl source')
        .populate('laterScene', 'acquisitionDate imageUrl source')
        .sort({ createdAt: -1 })
        .lean();

      res.json({ analyses });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/analyses/:id
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Valid Analysis MongoID is required'), validate],
  async (req, res, next) => {
    try {
      const analysis = await ChangeAnalysis.findById(req.params.id)
        .populate('monitoringArea', 'name region boundary centroid')
        .populate('earlierScene', 'acquisitionDate imageUrl cloudCoverPercent resolutionMeters source')
        .populate('laterScene', 'acquisitionDate imageUrl cloudCoverPercent resolutionMeters source')
        .lean();

      if (!analysis) {
        return res.status(404).json({
          success: false,
          error: { message: 'Change analysis not found', code: 'NOT_FOUND' }
        });
      }

      res.json({ analysis });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/analyses
router.post(
  '/',
  [
    body('areaId').isMongoId().withMessage('Valid areaId is required'),
    body('earlierSceneId').isMongoId().withMessage('Valid earlierSceneId is required'),
    body('laterSceneId').isMongoId().withMessage('Valid laterSceneId is required'),
    body('method').optional().isIn(['PIXEL_DIFFERENCE', 'PREPARED_RESULT']).withMessage('Invalid analysis method'),
    validate
  ],
  async (req, res, next) => {
    try {
      const { areaId, earlierSceneId, laterSceneId, method = 'PREPARED_RESULT' } = req.body;

      if (earlierSceneId === laterSceneId) {
        return res.status(400).json({
          success: false,
          error: { message: 'Earlier and later scenes must be different scenes', code: 'BAD_REQUEST' }
        });
      }

      const area = await MonitoringArea.findById(areaId);
      if (!area) {
        return res.status(404).json({
          success: false,
          error: { message: 'Monitoring area not found', code: 'NOT_FOUND' }
        });
      }

      const earlierScene = await SatelliteScene.findById(earlierSceneId);
      const laterScene = await SatelliteScene.findById(laterSceneId);

      if (!earlierScene || !laterScene) {
        return res.status(404).json({
          success: false,
          error: { message: 'One or both satellite scenes not found', code: 'NOT_FOUND' }
        });
      }

      if (
        earlierScene.monitoringArea.toString() !== areaId ||
        laterScene.monitoringArea.toString() !== areaId
      ) {
        return res.status(400).json({
          success: false,
          error: { message: 'Both scenes must belong to the specified monitoring area', code: 'BAD_REQUEST' }
        });
      }

      if (new Date(earlierScene.acquisitionDate).getTime() === new Date(laterScene.acquisitionDate).getTime()) {
        return res.status(400).json({
          success: false,
          error: { message: 'Scenes must have different acquisition dates', code: 'BAD_REQUEST' }
        });
      }

      // Chunk 0 Foundation: create functional stub analysis ready for Chunk 3 full pipeline
      const newAnalysis = await ChangeAnalysis.create({
        monitoringArea: areaId,
        earlierScene: earlierSceneId,
        laterScene: laterSceneId,
        method,
        status: 'COMPLETED',
        changedAreaSqMeters: 45000,
        changedAreaHectares: 4.5,
        regions: [
          {
            regionId: `REG-${Date.now().toString().slice(-4)}`,
            category: 'VEGETATION_LOSS',
            areaSqMeters: 45000,
            confidence: 0.86,
            protectedZoneOverlap: false,
            reviewStatus: 'PENDING'
          }
        ],
        qualityNotes: [
          'Prepared demonstration analysis result (Chunk 0 stub)',
          `Compared scenes from ${new Date(earlierScene.acquisitionDate).toISOString().slice(0, 10)} and ${new Date(laterScene.acquisitionDate).toISOString().slice(0, 10)}`
        ],
        completedAt: new Date()
      });

      const populated = await ChangeAnalysis.findById(newAnalysis._id)
        .populate('monitoringArea', 'name region')
        .populate('earlierScene', 'acquisitionDate imageUrl')
        .populate('laterScene', 'acquisitionDate imageUrl');

      res.status(201).json({ analysis: populated });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
