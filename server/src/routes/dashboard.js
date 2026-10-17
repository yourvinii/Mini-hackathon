const express = require('express');
const router = express.Router();
const { MonitoringArea, ChangeAnalysis, InspectionTask, ProtectedZone } = require('../models');

// GET /api/health
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// GET /api/dashboard
router.get('/dashboard', async (req, res, next) => {
  try {
    const [
      monitoredAreas,
      completedAnalyses,
      pendingInspections,
      verifiedInspections,
      dismissedInspections,
      highPriorityOpenTasks,
      totalProtectedZones,
      urgentTasks,
      recentAnalyses
    ] = await Promise.all([
      MonitoringArea.countDocuments({ status: 'ACTIVE' }),
      ChangeAnalysis.countDocuments({ status: 'COMPLETED' }),
      InspectionTask.countDocuments({ status: { $in: ['OPEN', 'IN_PROGRESS'] } }),
      InspectionTask.countDocuments({ status: 'VERIFIED' }),
      InspectionTask.countDocuments({ status: 'DISMISSED' }),
      InspectionTask.countDocuments({ priority: 'HIGH', status: { $in: ['OPEN', 'IN_PROGRESS'] } }),
      ProtectedZone.countDocuments(),
      InspectionTask.find({ priority: 'HIGH', status: { $in: ['OPEN', 'IN_PROGRESS'] } })
        .populate('monitoringArea', 'name region')
        .sort({ createdAt: -1 })
        .limit(3)
        .lean(),
      ChangeAnalysis.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('monitoringArea', 'name region')
        .populate('earlierScene', 'acquisitionDate')
        .populate('laterScene', 'acquisitionDate')
        .lean()
    ]);

    // Protected zone alerts: active high-priority open buffer intersections, falling back to active zones count
    const protectedZoneAlerts = highPriorityOpenTasks > 0 ? highPriorityOpenTasks : totalProtectedZones;

    res.json({
      summary: {
        monitoredAreas,
        completedAnalyses,
        pendingInspections,
        protectedZoneAlerts,
        verifiedInspections,
        dismissedInspections
      },
      urgentTasks: urgentTasks || [],
      recentAnalyses: recentAnalyses.map(analysis => ({
        ...analysis,
        regionsCount: analysis.regions ? analysis.regions.length : 0
      }))
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
