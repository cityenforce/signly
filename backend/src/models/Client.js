const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Client name is required'],
      unique: true,
      trim: true,
      maxlength: [120, 'Client name cannot exceed 120 characters'],
      index: true
    },
    suburbs: {
      type: [String],
      default: []
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

const Client = mongoose.model('Client', clientSchema);
module.exports = Client;

