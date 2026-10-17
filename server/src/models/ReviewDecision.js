import mongoose from 'mongoose';

const reviewDecisionSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProctorEvent',
    required: [true, 'Event reference is required'],
    index: true,
  },
  attempt: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attempt',
    required: [true, 'Attempt reference is required'],
    index: true,
  },
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Reviewer reference is required'],
  },
  decision: {
    type: String,
    enum: ['VALID_ACTIVITY', 'FALSE_ALARM'],
    required: [true, 'Decision is required'],
  },
  note: {
    type: String,
    default: '',
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const ReviewDecision = mongoose.model('ReviewDecision', reviewDecisionSchema);
export default ReviewDecision;
