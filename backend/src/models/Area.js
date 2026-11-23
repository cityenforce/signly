const mongoose = require('mongoose');

const areaSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Area code is required'],
      unique: true,
      trim: true,
      match: [/^\d{5}$/, 'Area code must be exactly 5 digits'],
      index: true
    },
    name: {
      type: String,
      required: [true, 'Area name is required'],
      trim: true,
      maxlength: [100, 'Area name cannot exceed 100 characters']
    },
    suburbs: {
      type: [String],
      default: []
    },
    poly: {
      type: [[Number]], // Array of [lat, lng] pairs
      default: null
    }
  },
  {
    timestamps: true
  }
);

const Area = mongoose.model('Area', areaSchema);
module.exports = Area;

