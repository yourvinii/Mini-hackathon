import mongoose from 'mongoose';
import { EVENT_TYPES } from '../models/ProctorEvent.js';

export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email address is required' });
  }
  if (!password || typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({ error: 'Password is required' });
  }
  next();
};

export const validateCreateExam = (req, res, next) => {
  const { title, durationSeconds, questions } = req.body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: 'Exam title is required' });
  }

  if (durationSeconds !== undefined) {
    const dur = Number(durationSeconds);
    if (isNaN(dur) || dur < 60) {
      return res.status(400).json({ error: 'Duration must be a number of at least 60 seconds' });
    }
  }

  if (questions !== undefined) {
    if (!Array.isArray(questions)) {
      return res.status(400).json({ error: 'Questions must be an array' });
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question || typeof q.question !== 'string') {
        return res.status(400).json({ error: `Question #${i + 1} must have question text` });
      }
      if (!Array.isArray(q.options) || q.options.length < 2) {
        return res.status(400).json({ error: `Question #${i + 1} must have at least 2 options` });
      }
      if (q.correctAnswer === undefined || q.correctAnswer === null) {
        return res.status(400).json({ error: `Question #${i + 1} must specify correctAnswer` });
      }
    }
  }

  next();
};

export const validateCreateAttempt = (req, res, next) => {
  const { examId, cameraConsent } = req.body;

  if (!examId || !mongoose.Types.ObjectId.isValid(examId)) {
    return res.status(400).json({ error: 'Valid examId is required' });
  }

  if (cameraConsent !== true) {
    return res.status(400).json({
      error: 'Explicit camera consent is required to start a monitored exam attempt',
    });
  }

  next();
};

export const validateSubmitAttempt = (req, res, next) => {
  const { answers } = req.body;
  if (answers === undefined || typeof answers !== 'object') {
    return res.status(400).json({ error: 'Answers payload is required as an object or map' });
  }
  next();
};

export const validateEventsBatch = (req, res, next) => {
  const { events } = req.body;

  if (!events || !Array.isArray(events)) {
    return res.status(400).json({ error: 'Events field must be an array' });
  }

  if (events.length === 0) {
    return res.status(400).json({ error: 'Events array must contain at least 1 event' });
  }

  if (events.length > 50) {
    return res.status(400).json({ error: 'Maximum 50 events allowed per batch request' });
  }

  for (let i = 0; i < events.length; i++) {
    const evt = events[i];
    if (!evt || typeof evt !== 'object') {
      return res.status(400).json({ error: `Event at index ${i} is not a valid object` });
    }
    if (!evt.type || !EVENT_TYPES.includes(evt.type)) {
      return res.status(400).json({
        error: `Invalid event type at index ${i}. Allowed types: ${EVENT_TYPES.join(', ')}`,
      });
    }
  }

  next();
};

export const validateReviewDecision = (req, res, next) => {
  const { decision } = req.body;
  const allowed = ['VALID_ACTIVITY', 'FALSE_ALARM'];

  if (!decision || !allowed.includes(decision)) {
    return res.status(400).json({
      error: `Decision must be one of: ${allowed.join(', ')}`,
    });
  }

  next();
};

export const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const val = req.params[paramName];
    if (!val || !mongoose.Types.ObjectId.isValid(val)) {
      return res.status(400).json({ error: `Invalid ${paramName} parameter: must be a valid ID` });
    }
    next();
  };
};
