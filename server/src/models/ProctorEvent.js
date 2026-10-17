import mongoose from 'mongoose';

export const EVENT_TYPES = [
  'NO_FACE',
  'MULTIPLE_FACES',
  'HEAD_TURN',
  'PHONE_DETECTED',
  'TAB_HIDDEN',
  'CAMERA_UNAVAILABLE',
];

const proctorEventSchema = new mongoose.Schema({
  attempt: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attempt',
    required: [true, 'Attempt reference is required'],
    index: true,
  },
  type: {
    type: String,
    enum: EVENT_TYPES,
    required: [true, 'Event type is required'],
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  durationMs: {
    type: Number,
    default: 0,
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
  },
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    default: 'LOW',
  },
  explanation: {
    type: String,
    default: '',
  },
  reviewStatus: {
    type: String,
    enum: ['PENDING', 'VALID_ACTIVITY', 'FALSE_ALARM'],
    default: 'PENDING',
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const ProctorEvent = mongoose.model('ProctorEvent', proctorEventSchema);
export default ProctorEvent;
