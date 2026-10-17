const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const { ChangeAnalysis, SatelliteScene, MonitoringArea, ProtectedZone } = require('../models');
const { runChangeDetectionPipeline } = require('../pipeline/changeDetector');

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
    body('threshold').optional().isFloat({ min: 1, max: 255 }).withMessage('Threshold must be between 1 and 255'),
    body('forceRerun').optional().isBoolean().withMessage('forceRerun must be a boolean'),
    validate
  ],
  async (req, res, next) => {
    try {
      const {
        areaId,
        earlierSceneId,
        laterSceneId,
        method = 'PIXEL_DIFFERENCE',
        threshold = 28,
        forceRerun = false
      } = req.body;

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

      // Check if an existing analysis matches if not forced rerun
      if (!forceRerun) {
        const existing = await ChangeAnalysis.findOne({
          monitoringArea: areaId,
          method,
          $or: [
            { earlierScene: earlierSceneId, laterScene: laterSceneId },
            { earlierScene: laterSceneId, laterScene: earlierSceneId }
          ]
        })
          .populate('monitoringArea', 'name region boundary centroid')
          .populate('earlierScene', 'acquisitionDate imageUrl cloudCoverPercent resolutionMeters source')
          .populate('laterScene', 'acquisitionDate imageUrl cloudCoverPercent resolutionMeters source');

        if (existing) {
          return res.status(200).json({ analysis: existing });
        }
      }

      // Fetch protected zones for geometric intersection
      const protectedZones = await ProtectedZone.find({}).lean();

      // Execute Python pipeline with timeout and fallback
      const pipelineResult = await runChangeDetectionPipeline({
        area,
        earlierScene,
        laterScene,
        method,
        threshold: Number(threshold) || 28,
        resolutionMeters: earlierScene.resolutionMeters || 10,
        protectedZones
      });

      const newAnalysis = await ChangeAnalysis.create({
        monitoringArea: areaId,
        earlierScene: earlierSceneId,
        laterScene: laterSceneId,
        method: pipelineResult.method,
        status: pipelineResult.status,
        changeMaskUrl: pipelineResult.changeMaskUrl,
        overlayUrl: pipelineResult.overlayUrl,
        changedAreaSqMeters: pipelineResult.changedAreaSqMeters,
        changedAreaHectares: pipelineResult.changedAreaHectares,
        regions: pipelineResult.regions,
        qualityNotes: pipelineResult.qualityNotes,
        completedAt: pipelineResult.completedAt || new Date()
      });

      const populated = await ChangeAnalysis.findById(newAnalysis._id)
        .populate('monitoringArea', 'name region boundary centroid')
        .populate('earlierScene', 'acquisitionDate imageUrl cloudCoverPercent resolutionMeters source')
        .populate('laterScene', 'acquisitionDate imageUrl cloudCoverPercent resolutionMeters source');

      res.status(201).json({ analysis: populated });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
