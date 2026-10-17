const mongoose = require('mongoose');

const MonitoringAreaSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Monitoring area name is required'],
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    boundary: {
      type: {
        type: String,
        enum: ['Polygon'],
        required: true,
        default: 'Polygon'
      },
      coordinates: {
        type: [[[Number]]],
        required: true
      }
    },
    centroid: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true
      }
    },
    region: {
      type: String,
      default: 'General'
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'ARCHIVED'],
      default: 'ACTIVE'
    }
  },
  {
    timestamps: true
  }
);

// Spatial index for boundary queries if needed
MonitoringAreaSchema.index({ boundary: '2dsphere' });
MonitoringAreaSchema.index({ centroid: '2dsphere' });

module.exports = mongoose.model('MonitoringArea', MonitoringAreaSchema);
