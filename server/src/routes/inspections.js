const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const { InspectionTask, ChangeAnalysis } = require('../models');

// GET /api/inspections
router.get(
  '/',
  [
    query('status').optional().isIn(['OPEN', 'IN_PROGRESS', 'VERIFIED', 'DISMISSED']).withMessage('Invalid status filter'),
    query('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH']).withMessage('Invalid priority filter'),
    query('areaId').optional().isMongoId().withMessage('Invalid areaId format'),
    validate
  ],
  async (req, res, next) => {
    try {
      const filter = {};
      if (req.query.status) filter.status = req.query.status;
      if (req.query.priority) filter.priority = req.query.priority;
      if (req.query.areaId) filter.monitoringArea = req.query.areaId;

      const tasks = await InspectionTask.find(filter)
        .populate('monitoringArea', 'name region')
        .populate('analysis', 'method status changedAreaHectares')
        .sort({ createdAt: -1 })
        .lean();

      res.json({ tasks });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/inspections/:id
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Valid Inspection MongoID is required'), validate],
  async (req, res, next) => {
    try {
      const task = await InspectionTask.findById(req.params.id)
        .populate('monitoringArea', 'name region boundary centroid')
        .populate({
          path: 'analysis',
          populate: [
            { path: 'earlierScene', select: 'acquisitionDate imageUrl' },
            { path: 'laterScene', select: 'acquisitionDate imageUrl' }
          ]
        })
        .lean();

      if (!task) {
        return res.status(404).json({
          success: false,
          error: { message: 'Inspection task not found', code: 'NOT_FOUND' }
        });
      }

      res.json({ task });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/inspections
router.post(
  '/',
  [
    body('analysisId').isMongoId().withMessage('Valid analysisId is required'),
    body('regionId').notEmpty().withMessage('regionId is required'),
    body('title').optional().trim(),
    body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH']).withMessage('Invalid priority level'),
    validate
  ],
  async (req, res, next) => {
    try {
      const { analysisId, regionId, title, description, priority = 'MEDIUM', assignedTo = 'Unassigned' } = req.body;

      const analysis = await ChangeAnalysis.findById(analysisId);
      if (!analysis) {
        return res.status(404).json({
          success: false,
          error: { message: 'Referenced change analysis not found', code: 'NOT_FOUND' }
        });
      }

      // Find region details if present in analysis
      const region = analysis.regions.find(r => r.regionId === regionId);
      const defaultTitle = region
        ? `Field Inspection: ${region.category.replace('_', ' ')} (${regionId})`
        : `Field Inspection Task for ${regionId}`;

      const newTask = await InspectionTask.create({
        analysis: analysis._id,
        monitoringArea: analysis.monitoringArea,
        regionId,
        title: title || defaultTitle,
        description: description || `Automated inspection dispatched for detected land anomaly ${regionId}.`,
        priority,
        status: 'OPEN',
        assignedTo
      });

      const populated = await InspectionTask.findById(newTask._id)
        .populate('monitoringArea', 'name region')
        .populate('analysis', 'method status');

      res.status(201).json({ task: populated });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/inspections/:id
router.patch(
  '/:id',
  [
    param('id').isMongoId().withMessage('Valid Inspection MongoID is required'),
    body('status').optional().isIn(['OPEN', 'IN_PROGRESS', 'VERIFIED', 'DISMISSED']).withMessage('Invalid status'),
    body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH']).withMessage('Invalid priority'),
    body('assignedTo').optional().trim(),
    body('inspectionNotes').optional().trim(),
    validate
  ],
  async (req, res, next) => {
    try {
      const task = await InspectionTask.findById(req.params.id);
      if (!task) {
        return res.status(404).json({
          success: false,
          error: { message: 'Inspection task not found', code: 'NOT_FOUND' }
        });
      }

      const updates = {};
      if (req.body.status) {
        updates.status = req.body.status;
        if (req.body.status === 'VERIFIED' || req.body.status === 'DISMISSED') {
          updates.reviewedAt = new Date();
          updates.reviewedBy = req.body.reviewedBy || 'Authorized Officer';
        }
      }
      if (req.body.priority) updates.priority = req.body.priority;
      if (req.body.assignedTo !== undefined) updates.assignedTo = req.body.assignedTo;
      if (req.body.inspectionNotes !== undefined) updates.inspectionNotes = req.body.inspectionNotes;

      const updatedTask = await InspectionTask.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true, runValidators: true }
      )
        .populate('monitoringArea', 'name region')
        .populate('analysis', 'method status');

      res.json({ task: updatedTask });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
