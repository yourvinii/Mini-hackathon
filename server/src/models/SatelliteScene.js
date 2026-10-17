const mongoose = require('mongoose');

const SatelliteSceneSchema = new mongoose.Schema(
  {
    monitoringArea: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MonitoringArea',
      required: [true, 'MonitoringArea reference is required']
    },
    acquisitionDate: {
      type: Date,
      required: [true, 'Acquisition date is required']
    },
    source: {
      type: String,
      enum: ['SENTINEL_2', 'PREPARED_DEMO'],
      default: 'PREPARED_DEMO'
    },
    imageUrl: {
      type: String,
      required: [true, 'Image URL or path is required']
    },
    thumbnailUrl: {
      type: String,
      default: ''
    },
    cloudCoverPercent: {
      type: Number,
      default: 0
    },
    resolutionMeters: {
      type: Number,
      default: 10
    },
    bounds: {
      type: {
        type: String,
        enum: ['Polygon'],
        default: 'Polygon'
      },
      coordinates: [[[Number]]]
    },
    processingStatus: {
      type: String,
      enum: ['READY', 'UNAVAILABLE'],
      default: 'READY'
    }
  },
  {
    timestamps: true
  }
);

SatelliteSceneSchema.index({ monitoringArea: 1, acquisitionDate: 1 });

module.exports = mongoose.model('SatelliteScene', SatelliteSceneSchema);
