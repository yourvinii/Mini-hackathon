import { Router } from 'express';
import { Exam } from '../models/Exam.js';
import { Attempt } from '../models/Attempt.js';
import { ProctorEvent, EVENT_TYPES } from '../models/ProctorEvent.js';
import { ReviewDecision } from '../models/ReviewDecision.js';
import { authenticateToken, requireTeacher } from '../middleware/auth.js';
import { validateReviewDecision, validateObjectId } from '../middleware/validate.js';
import { calculateRiskScore } from '../utils/riskScoring.js';

const router = Router();

// All teacher routes require authentication and TEACHER role
router.use(authenticateToken, requireTeacher);

// GET /api/teacher/dashboard — Overview of exams, active attempts, recent events and risk bands
router.get('/dashboard', async (req, res, next) => {
  try {
    const exams = await Exam.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
    const examIds = exams.map(e => e._id);

    const activeAttempts = await Attempt.find({
      exam: { $in: examIds },
      status: 'IN_PROGRESS',
    })
      .populate('student', 'name email')
      .populate('exam', 'title durationSeconds')
      .sort({ startedAt: -1 });

    const allTeacherAttempts = await Attempt.find({ exam: { $in: examIds } }).select('_id riskLevel status');
    const attemptIds = allTeacherAttempts.map(a => a._id);

    const recentEvents = await ProctorEvent.find({ attempt: { $in: attemptIds } })
      .sort({ timestamp: -1 })
      .limit(20)
      .populate({
        path: 'attempt',
        select: 'student exam riskLevel riskScore status',
        populate: [
          { path: 'student', select: 'name email' },
          { path: 'exam', select: 'title' },
        ],
      });

    const riskSummary = {
      totalAttempts: allTeacherAttempts.length,
      low: allTeacherAttempts.filter(a => a.riskLevel === 'LOW').length,
      medium: allTeacherAttempts.filter(a => a.riskLevel === 'MEDIUM').length,
      high: allTeacherAttempts.filter(a => a.riskLevel === 'HIGH').length,
    };

    return res.status(200).json({
      exams,
      activeAttempts,
      recentEvents,
      riskSummary,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/teacher/attempts/:id/review — Complete attempt detail for teacher audit
router.get('/attempts/:id/review', validateObjectId('id'), async (req, res, next) => {
  try {
    const attempt = await Attempt.findById(req.params.id)
      .populate('student', 'name email')
      .populate('exam');

    if (!attempt) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    if (!attempt.exam || attempt.exam.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You are not authorized to review attempts for this exam' });
    }

    const events = await ProctorEvent.find({ attempt: attempt._id }).sort({ timestamp: 1 });
    const reviewDecisions = await ReviewDecision.find({ attempt: attempt._id })
      .populate('reviewer', 'name email')
      .sort({ createdAt: -1 });

    const riskDetails = calculateRiskScore(events);

    return res.status(200).json({
      attempt,
      events,
      reviewDecisions,
      riskDetails,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/teacher/events/:id/review — Record teacher review decision on a single event
router.patch('/events/:id/review', validateObjectId('id'), validateReviewDecision, async (req, res, next) => {
  try {
    const { decision, note } = req.body;

    const event = await ProctorEvent.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Proctor event not found' });
    }

    const attempt = await Attempt.findById(event.attempt).populate('exam');
    if (!attempt) {
      return res.status(404).json({ error: 'Associated attempt not found' });
    }

    if (!attempt.exam || attempt.exam.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You are not authorized to review events for this exam' });
    }

    // Update event review status
    event.reviewStatus = decision;
    await event.save();

    // Create or update ReviewDecision audit record
    let reviewDecision = await ReviewDecision.findOne({ event: event._id });
    if (reviewDecision) {
      reviewDecision.decision = decision;
      reviewDecision.note = note !== undefined ? note : reviewDecision.note;
      reviewDecision.reviewer = req.user._id;
      await reviewDecision.save();
    } else {
      reviewDecision = await ReviewDecision.create({
        event: event._id,
        attempt: attempt._id,
        reviewer: req.user._id,
        decision,
        note: note || '',
      });
    }

    // Recalculate attempt risk score with updated false-alarm status
    const allEvents = await ProctorEvent.find({ attempt: attempt._id });
    const { riskScore, riskLevel } = calculateRiskScore(allEvents);

    attempt.riskScore = riskScore;
    attempt.riskLevel = riskLevel;
    await attempt.save();

    return res.status(200).json({
      message: 'Review decision recorded and risk score updated',
      reviewDecision,
      event,
      attempt: {
        id: attempt._id,
        riskScore: attempt.riskScore,
        riskLevel: attempt.riskLevel,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/teacher/detection-stats — Aggregate detection statistics for teacher
router.get('/detection-stats', async (req, res, next) => {
  try {
    const exams = await Exam.find({ createdBy: req.user._id }).select('_id');
    const examIds = exams.map(e => e._id);

    const attempts = await Attempt.find({ exam: { $in: examIds } }).select('_id');
    const attemptIds = attempts.map(a => a._id);

    const events = await ProctorEvent.find({ attempt: { $in: attemptIds } });

    const totalEvents = events.length;
    const falseAlarms = events.filter(e => e.reviewStatus === 'FALSE_ALARM').length;
    const validActivities = events.filter(e => e.reviewStatus === 'VALID_ACTIVITY').length;
    const pendingReviews = events.filter(e => e.reviewStatus === 'PENDING').length;
    const reviewedTotal = falseAlarms + validActivities;

    const byType = {};
    for (const type of EVENT_TYPES) {
      const typeEvents = events.filter(e => e.type === type);
      byType[type] = {
        total: typeEvents.length,
        pending: typeEvents.filter(e => e.reviewStatus === 'PENDING').length,
        valid: typeEvents.filter(e => e.reviewStatus === 'VALID_ACTIVITY').length,
        falseAlarm: typeEvents.filter(e => e.reviewStatus === 'FALSE_ALARM').length,
      };
    }

    return res.status(200).json({
      stats: {
        totalEvents,
        falseAlarms,
        validActivities,
        pendingReviews,
        reviewedCount: reviewedTotal,
        falseAlarmRate: reviewedTotal > 0 ? Number((falseAlarms / reviewedTotal).toFixed(3)) : 0,
        byType,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
