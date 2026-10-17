import mongoose from 'mongoose';

const attemptSchema = new mongoose.Schema({
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: [true, 'Exam reference is required'],
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student reference is required'],
  },
  status: {
    type: String,
    enum: ['IN_PROGRESS', 'SUBMITTED', 'EXPIRED'],
    default: 'IN_PROGRESS',
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  deadlineAt: {
    type: Date,
    required: [true, 'Deadline is required'],
  },
  submittedAt: {
    type: Date,
  },
  answers: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  riskScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  riskLevel: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    default: 'LOW',
  },
  eventCount: {
    type: Number,
    default: 0,
  },
  cameraConsentGiven: {
    type: Boolean,
    default: true,
  },
});

export const Attempt = mongoose.model('Attempt', attemptSchema);
export default Attempt;
