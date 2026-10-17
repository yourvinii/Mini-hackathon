const mongoose = require('mongoose');

const ChangeRegionSchema = new mongoose.Schema(
  {
    regionId: {
      type: String,
      required: true
    },
    category: {
      type: String,
      enum: ['NEW_CONSTRUCTION', 'VEGETATION_LOSS', 'WATER_CHANGE', 'OTHER'],
      default: 'OTHER'
    },
    geometry: {
      type: {
        type: String,
        enum: ['Polygon'],
        default: 'Polygon'
      },
      coordinates: [[[Number]]]
    },
    centroid: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: [Number]
    },
    areaSqMeters: {
      type: Number,
      default: 0
    },
    confidence: {
      type: Number,
      default: 0.85
    },
    protectedZoneOverlap: {
      type: Boolean,
      default: false
    },
    reviewStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'DISMISSED'],
      default: 'PENDING'
    }
  },
  { _id: false }
);

const ChangeAnalysisSchema = new mongoose.Schema(
  {
    monitoringArea: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MonitoringArea',
      required: [true, 'MonitoringArea reference is required']
    },
    earlierScene: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SatelliteScene',
      required: [true, 'Earlier scene reference is required']
    },
    laterScene: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SatelliteScene',
      required: [true, 'Later scene reference is required']
    },
    method: {
      type: String,
      enum: ['PIXEL_DIFFERENCE', 'PREPARED_RESULT'],
      default: 'PREPARED_RESULT'
    },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'PENDING'
    },
    changeMaskUrl: {
      type: String,
      default: ''
    },
    overlayUrl: {
      type: String,
      default: ''
    },
    changedAreaSqMeters: {
      type: Number,
      default: 0
    },
    changedAreaHectares: {
      type: Number,
      default: 0
    },
    regions: [ChangeRegionSchema],
    qualityNotes: {
      type: [String],
      default: []
    },
    completedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

ChangeAnalysisSchema.index({ monitoringArea: 1, createdAt: -1 });

module.exports = mongoose.model('ChangeAnalysis', ChangeAnalysisSchema);
