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
    body('description').optional().trim(),
    body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH']).withMessage('Invalid priority level'),
    body('assignedTo').optional().trim(),
    body('evidenceUrls').optional().isArray().withMessage('evidenceUrls must be an array of image URLs'),
    body('inspectionNotes').optional().trim(),
    validate
  ],
  async (req, res, next) => {
    try {
      const {
        analysisId,
        regionId,
        title,
        description,
        priority,
        assignedTo = 'Unassigned',
        evidenceUrls = [],
        inspectionNotes = ''
      } = req.body;

      const analysis = await ChangeAnalysis.findById(analysisId);
      if (!analysis) {
        return res.status(404).json({
          success: false,
          error: { message: 'Referenced change analysis not found', code: 'NOT_FOUND' }
        });
      }

      // Find region details if present in analysis
      const region = analysis.regions ? analysis.regions.find(r => r.regionId === regionId) : null;
      const defaultTitle = region
        ? `Field Inspection: ${region.category.replace('_', ' ')} (${regionId})`
        : `Field Inspection Task for ${regionId}`;

      // Default priority based on protected-zone overlap if not explicitly supplied
      let taskPriority = priority;
      if (!taskPriority) {
        taskPriority = (region && region.protectedZoneOverlap) ? 'HIGH' : 'MEDIUM';
      }

      const newTask = await InspectionTask.create({
        analysis: analysis._id,
        monitoringArea: analysis.monitoringArea,
        regionId,
        title: title || defaultTitle,
        description: description || `Automated inspection dispatched for detected land anomaly ${regionId}.`,
        priority: taskPriority,
        status: 'OPEN',
        assignedTo,
        evidenceUrls: Array.isArray(evidenceUrls) ? evidenceUrls : [],
        inspectionNotes
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
    body('title').optional().trim(),
    body('description').optional().trim(),
    body('assignedTo').optional().trim(),
    body('inspectionNotes').optional().trim(),
    body('evidenceUrls').optional().isArray().withMessage('evidenceUrls must be an array of image URLs'),
    body('evidenceUrl').optional().trim(),
    body('reviewedBy').optional().trim(),
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
      if (req.body.title !== undefined) updates.title = req.body.title;
      if (req.body.description !== undefined) updates.description = req.body.description;
      if (req.body.priority) updates.priority = req.body.priority;
      if (req.body.assignedTo !== undefined) updates.assignedTo = req.body.assignedTo;
      if (req.body.inspectionNotes !== undefined) updates.inspectionNotes = req.body.inspectionNotes;

      // Handle evidence URLs
      if (req.body.evidenceUrls !== undefined) {
        updates.evidenceUrls = req.body.evidenceUrls;
      } else if (req.body.evidenceUrl) {
        updates.$push = { evidenceUrls: req.body.evidenceUrl };
      }

      // Handle status transitions and authorized review mandate
      if (req.body.status) {
        updates.status = req.body.status;

        if (req.body.status === 'VERIFIED' || req.body.status === 'DISMISSED') {
          updates.reviewedAt = new Date();
          updates.reviewedBy = req.body.reviewedBy || 'Authorized Review Officer';

          // Synchronize reviewStatus in the associated ChangeAnalysis region
          if (task.analysis && task.regionId) {
            await ChangeAnalysis.updateOne(
              { _id: task.analysis, 'regions.regionId': task.regionId },
              { $set: { 'regions.$.reviewStatus': req.body.status } }
            );
          }
        } else {
          // Re-opened or in progress: reset review verification
          updates.reviewedAt = null;
          updates.reviewedBy = null;

          if (task.analysis && task.regionId) {
            await ChangeAnalysis.updateOne(
              { _id: task.analysis, 'regions.regionId': task.regionId },
              { $set: { 'regions.$.reviewStatus': 'PENDING' } }
            );
          }
        }
      }

      const updatedTask = await InspectionTask.findByIdAndUpdate(
        req.params.id,
        updates.$push ? { $set: updates, $push: updates.$push } : { $set: updates },
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

// POST /api/inspections/:id/evidence
// Convenient endpoint to attach field photo evidence with an optional timestamped note
router.post(
  '/:id/evidence',
  [
    param('id').isMongoId().withMessage('Valid Inspection MongoID is required'),
    body('evidenceUrl').notEmpty().withMessage('evidenceUrl is required'),
    body('caption').optional().trim(),
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

      const { evidenceUrl, caption } = req.body;
      task.evidenceUrls.push(evidenceUrl);

      if (caption) {
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        task.inspectionNotes = task.inspectionNotes
          ? `${task.inspectionNotes}\n[${timestamp}] Added Photo Evidence: ${caption}`
          : `[${timestamp}] Added Photo Evidence: ${caption}`;
      }

      await task.save();

      const populated = await InspectionTask.findById(task._id)
        .populate('monitoringArea', 'name region')
        .populate('analysis', 'method status');

      res.json({ task: populated });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
