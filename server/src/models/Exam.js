import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
  },
  options: {
    type: [String],
    required: true,
    validate: [arr => arr.length >= 2, 'Each question must have at least 2 options'],
  },
  correctAnswer: {
    type: mongoose.Schema.Types.Mixed, // Can be option index (0, 1, 2) or option text
    required: true,
  },
}, { _id: true });

const examSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Exam title is required'],
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  questions: {
    type: [questionSchema],
    default: [],
  },
  durationSeconds: {
    type: Number,
    required: [true, 'Duration in seconds is required'],
    min: [60, 'Exam duration must be at least 60 seconds'],
    default: 600, // 10 minutes default
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required'],
  },
  status: {
    type: String,
    enum: ['DRAFT', 'PUBLISHED', 'CLOSED'],
    default: 'DRAFT',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Exam = mongoose.model('Exam', examSchema);
export default Exam;
