import { Router } from 'express';
import { Exam } from '../models/Exam.js';
import { authenticateToken, requireTeacher } from '../middleware/auth.js';
import { validateCreateExam, validateObjectId } from '../middleware/validate.js';

const router = Router();

// Helper to remove answer keys when returning exams to students
export const sanitizeExamForStudent = (examDoc) => {
  const exam = examDoc.toObject ? examDoc.toObject() : { ...examDoc };
  if (Array.isArray(exam.questions)) {
    exam.questions = exam.questions.map(q => {
      const { correctAnswer, ...rest } = q;
      return rest;
    });
  }
  return exam;
};

// All exam routes require authentication
router.use(authenticateToken);

// POST /api/exams — Teacher only creates draft exam
router.post('/', requireTeacher, validateCreateExam, async (req, res, next) => {
  try {
    const { title, description, questions, durationSeconds } = req.body;

    const exam = await Exam.create({
      title,
      description: description || '',
      questions: questions || [],
      durationSeconds: durationSeconds || 600,
      createdBy: req.user._id,
      status: 'DRAFT',
    });

    return res.status(201).json({ exam });
  } catch (error) {
    next(error);
  }
});

// GET /api/exams — Teacher sees own exams, student sees published exams (answers stripped)
router.get('/', async (req, res, next) => {
  try {
    if (req.user.role === 'TEACHER') {
      const exams = await Exam.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
      return res.status(200).json({ exams });
    }

    // Student role: only published exams, answers masked
    const publishedExams = await Exam.find({ status: 'PUBLISHED' }).sort({ createdAt: -1 });
    const sanitized = publishedExams.map(sanitizeExamForStudent);
    return res.status(200).json({ exams: sanitized });
  } catch (error) {
    next(error);
  }
});

// GET /api/exams/:id — Single exam with role authorization
router.get('/:id', validateObjectId('id'), async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    if (req.user.role === 'TEACHER') {
      if (exam.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'You are not authorized to view this exam' });
      }
      return res.status(200).json({ exam });
    }

    // Student access: only published exams, sanitized answers
    if (exam.status !== 'PUBLISHED') {
      return res.status(403).json({ error: 'This exam is not yet available for students' });
    }

    return res.status(200).json({ exam: sanitizeExamForStudent(exam) });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/exams/:id/publish — Teacher only publishes own exam
router.patch('/:id/publish', requireTeacher, validateObjectId('id'), async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    if (exam.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only publish exams you created' });
    }

    exam.status = 'PUBLISHED';
    await exam.save();

    return res.status(200).json({
      message: 'Exam successfully published',
      exam,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/exams/:id — Teacher only edits own exam
router.put('/:id', requireTeacher, validateObjectId('id'), validateCreateExam, async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    if (exam.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only edit exams you created' });
    }

    const { title, description, questions, durationSeconds } = req.body;
    if (title) exam.title = title;
    if (description !== undefined) exam.description = description;
    if (questions) exam.questions = questions;
    if (durationSeconds) exam.durationSeconds = durationSeconds;

    await exam.save();

    return res.status(200).json({
      message: 'Exam updated successfully',
      exam,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
