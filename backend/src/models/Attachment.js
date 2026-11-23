const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, 'R2 object key is required'],
      unique: true,
      trim: true,
      index: true
    },
    filename: {
      type: String,
      required: [true, 'Original filename is required'],
      trim: true
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
      trim: true
    },
    size: {
      type: Number,
      required: [true, 'File size in bytes is required']
    },
    url: {
      type: String,
      default: ''
    },
    isPublic: {
      type: Boolean,
      default: false
    },
    storageProvider: {
      type: String,
      enum: ['r2', 'local'],
      default: 'r2'
    },
    reportRef: {
      type: String,
      trim: true,
      index: true,
      default: null
    },
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Report',
      index: true,
      default: null
    },
    category: {
      type: String,
      enum: ['sign_photo', 'profile_avatar', 'condition_plate', 'site_sketch', 'document', 'other'],
      default: 'sign_photo',
      index: true
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      default: null
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

attachmentSchema.index({ reportRef: 1, createdAt: -1 });
attachmentSchema.index({ uploadedBy: 1, category: 1 });

const Attachment = mongoose.model('Attachment', attachmentSchema);
module.exports = Attachment;
