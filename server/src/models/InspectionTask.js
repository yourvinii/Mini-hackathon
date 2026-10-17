const mongoose = require('mongoose');

const InspectionTaskSchema = new mongoose.Schema(
  {
    analysis: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChangeAnalysis',
      required: [true, 'ChangeAnalysis reference is required']
    },
    monitoringArea: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MonitoringArea',
      required: [true, 'MonitoringArea reference is required']
    },
    regionId: {
      type: String,
      required: [true, 'Region ID is required']
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'MEDIUM'
    },
    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'VERIFIED', 'DISMISSED'],
      default: 'OPEN'
    },
    assignedTo: {
      type: String,
      default: 'Unassigned'
    },
    inspectionNotes: {
      type: String,
      default: ''
    },
    evidenceUrls: {
      type: [String],
      default: []
    },
    reviewedBy: {
      type: String
    },
    reviewedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

InspectionTaskSchema.index({ status: 1, priority: 1 });
InspectionTaskSchema.index({ monitoringArea: 1 });

module.exports = mongoose.model('InspectionTask', InspectionTaskSchema);
