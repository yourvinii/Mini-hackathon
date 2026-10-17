const mongoose = require('mongoose');

const ProtectedZoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Protected zone name is required'],
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    category: {
      type: String,
      enum: ['FOREST', 'WATERBODY', 'WILDLIFE', 'RESTRICTED_LAND', 'OTHER'],
      default: 'FOREST'
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
    source: {
      type: String,
      enum: ['OFFICIAL', 'DEMO'],
      default: 'DEMO'
    }
  },
  {
    timestamps: true
  }
);

ProtectedZoneSchema.index({ boundary: '2dsphere' });

module.exports = mongoose.model('ProtectedZone', ProtectedZoneSchema);
