import { Router } from 'express';
import { Attempt } from '../models/Attempt.js';
import { Exam } from '../models/Exam.js';
import { ProctorEvent } from '../models/ProctorEvent.js';
import { authenticateToken, requireStudent } from '../middleware/auth.js';
import {
  validateCreateAttempt,
  validateSubmitAttempt,
  validateEventsBatch,
  validateObjectId,
} from '../middleware/validate.js';
import { sanitizeExamForStudent } from './examRoutes.js';
import { calculateRiskScore } from '../utils/riskScoring.js';

const router = Router();

// All attempt routes require authentication
router.use(authenticateToken);

// Helper to check attempt ownership/teacher authorization
const getAuthorizedAttempt = async (attemptId, user) => {
  const attempt = await Attempt.findById(attemptId).populate('exam');
  if (!attempt) {
    const error = new Error('Attempt not found');
    error.statusCode = 404;
    throw error;
  }

  const isStudentOwner = attempt.student.toString() === user._id.toString();
  const isTeacherOwner =
    user.role === 'TEACHER' &&
    attempt.exam &&
    attempt.exam.createdBy.toString() === user._id.toString();

  if (!isStudentOwner && !isTeacherOwner) {
    const error = new Error('Not authorized to access this attempt');
    error.statusCode = 403;
    throw error;
  }

  return { attempt, isStudentOwner, isTeacherOwner };
};

// GET /api/attempts — Student views own attempts, Teacher views attempts for their exams
router.get('/', async (req, res, next) => {
  try {
    if (req.user.role === 'STUDENT') {
      const attempts = await Attempt.find({ student: req.user._id })
        .populate('exam', 'title durationSeconds status')
        .sort({ startedAt: -1 });
      return res.status(200).json({ attempts });
    }

    if (req.user.role === 'TEACHER') {
      const teacherExams = await Exam.find({ createdBy: req.user._id }).select('_id');
      const examIds = teacherExams.map(e => e._id);
      const attempts = await Attempt.find({ exam: { $in: examIds } })
        .populate('student', 'name email')
        .populate('exam', 'title durationSeconds')
        .sort({ startedAt: -1 });
      return res.status(200).json({ attempts });
    }

    return res.status(200).json({ attempts: [] });
  } catch (error) {
    next(error);
  }
});

// POST /api/attempts — Student starts an attempt
router.post('/', requireStudent, validateCreateAttempt, async (req, res, next) => {
  try {
    const { examId, cameraConsent } = req.body;

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    if (exam.status !== 'PUBLISHED') {
      return res.status(400).json({ error: 'Exam is not currently published for attempts' });
    }

    // Check if student already has an active attempt for this exam
    const existingActive = await Attempt.findOne({
      exam: examId,
      student: req.user._id,
      status: 'IN_PROGRESS',
    });

    if (existingActive) {
      // Check if deadline passed
      if (new Date() > existingActive.deadlineAt) {
        existingActive.status = 'EXPIRED';
        await existingActive.save();
      } else {
        return res.status(200).json({
          message: 'Resuming active attempt',
          attempt: existingActive,
          exam: sanitizeExamForStudent(exam),
          serverTime: new Date(),
        });
      }
    }

    const startedAt = new Date();
    const deadlineAt = new Date(startedAt.getTime() + (exam.durationSeconds * 1000));

    const attempt = await Attempt.create({
      exam: exam._id,
      student: req.user._id,
      status: 'IN_PROGRESS',
      startedAt,
      deadlineAt,
      cameraConsentGiven: cameraConsent,
      riskScore: 0,
      riskLevel: 'LOW',
      eventCount: 0,
    });

    return res.status(201).json({
      attempt,
      exam: sanitizeExamForStudent(exam),
      serverTime: new Date(),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/attempts/:id — View attempt details
router.get('/:id', validateObjectId('id'), async (req, res, next) => {
  try {
    const { attempt, isStudentOwner } = await getAuthorizedAttempt(req.params.id, req.user);

    const examData = isStudentOwner
      ? sanitizeExamForStudent(attempt.exam)
      : attempt.exam;

    return res.status(200).json({
      attempt,
      exam: examData,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/attempts/:id/submit — Student submits completed answers
router.post('/:id/submit', requireStudent, validateObjectId('id'), validateSubmitAttempt, async (req, res, next) => {
  try {
    const attempt = await Attempt.findById(req.params.id);
    if (!attempt) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    if (attempt.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only submit your own attempt' });
    }

    if (attempt.status === 'SUBMITTED') {
      return res.status(400).json({ error: 'Exam has already been submitted', attempt });
    }

    const now = new Date();
    const isLate = now > new Date(attempt.deadlineAt.getTime() + 15000); // 15s grace for network latency

    attempt.answers = req.body.answers;
    attempt.submittedAt = now;
    attempt.status = isLate ? 'EXPIRED' : 'SUBMITTED';

    await attempt.save();

    return res.status(200).json({
      message: isLate ? 'Exam submitted after deadline (marked expired)' : 'Exam submitted successfully',
      attempt,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/attempts/:id/events — Student ingests batch of proctoring events
router.post('/:id/events', requireStudent, validateObjectId('id'), validateEventsBatch, async (req, res, next) => {
  try {
    const attempt = await Attempt.findById(req.params.id);
    if (!attempt) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    if (attempt.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only record events for your own attempt' });
    }

    if (attempt.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: `Cannot record events for attempt with status ${attempt.status}` });
    }

    const incomingEvents = req.body.events;

    // Create ProctorEvent records
    const eventDocs = incomingEvents.map(evt => ({
      attempt: attempt._id,
      type: evt.type,
      timestamp: evt.timestamp ? new Date(evt.timestamp) : new Date(),
      durationMs: evt.durationMs || 0,
      confidence: typeof evt.confidence === 'number' ? evt.confidence : undefined,
      severity: evt.severity || (evt.type === 'PHONE_DETECTED' || evt.type === 'MULTIPLE_FACES' ? 'HIGH' : evt.type === 'HEAD_TURN' ? 'LOW' : 'MEDIUM'),
      explanation: evt.explanation || `System detected ${evt.type}`,
      reviewStatus: 'PENDING',
    }));

    await ProctorEvent.insertMany(eventDocs);

    // Fetch all events for this attempt and recalculate server-side risk score
    const allEvents = await ProctorEvent.find({ attempt: attempt._id });
    const { riskScore, riskLevel } = calculateRiskScore(allEvents);

    attempt.riskScore = riskScore;
    attempt.riskLevel = riskLevel;
    attempt.eventCount = allEvents.length;
    await attempt.save();

    return res.status(201).json({
      success: true,
      count: incomingEvents.length,
      riskScore: attempt.riskScore,
      riskLevel: attempt.riskLevel,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/attempts/:id/events — View timeline of events for an attempt
router.get('/:id/events', validateObjectId('id'), async (req, res, next) => {
  try {
    await getAuthorizedAttempt(req.params.id, req.user);

    const events = await ProctorEvent.find({ attempt: req.params.id }).sort({ timestamp: 1 });

    return res.status(200).json({ events });
  } catch (error) {
    next(error);
  }
});

export default router;
