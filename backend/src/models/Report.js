const mongoose = require('mongoose');

const conditionSchema = new mongoose.Schema(
  {
    rule: { type: String, required: true },
    custom: { type: String, default: '' },
    speed: { type: String, default: '' },
    arrow: { type: String, default: 'no' },
    day: { type: String, default: 'All days' },
    days: { type: [String], default: [] },
    dayText: { type: String, default: '' },
    time: { type: String, default: 'All times' },
    timeText: { type: String, default: '' },
    start: { type: String, default: '' },
    end: { type: String, default: '' }
  },
  { _id: false }
);

const signSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    conds: { type: [conditionSchema], default: [] }
  },
  { _id: false }
);

const reportSchema = new mongoose.Schema(
  {
    ref: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    code: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    signCode: {
      type: String,
      trim: true
    },
    created: {
      type: Date,
      default: Date.now,
      index: true
    },
    submitted: {
      type: Date,
      default: Date.now,
      index: true
    },
    updated: {
      type: Date,
      default: null
    },
    client: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    suburb: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    street: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    from: {
      type: String,
      trim: true,
      default: ''
    },
    to: {
      type: String,
      trim: true,
      default: ''
    },
    side: {
      type: String,
      enum: ['North', 'South', 'East', 'West', 'Odd', 'Even', 'Centre', ''],
      default: ''
    },
    address: {
      type: String,
      trim: true,
      default: ''
    },
    gps: {
      type: String,
      trim: true,
      default: ''
    },
    gpsCoords: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null }
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    signs: {
      type: [signSchema],
      default: []
    },
    photoCount: {
      type: Number,
      default: 0
    },
    photos: {
      type: [String],
      default: []
    },
    photoKeys: {
      type: [String],
      default: []
    },
    attachments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Attachment'
      }
    ],
    officer: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: { type: String, default: 'Unassigned' },
      no: { type: String, default: '' }
    },
    areaCode: {
      type: String,
      trim: true,
      default: null,
      index: true
    },
    isDemo: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index for queries filtering by date and suburb
reportSchema.index({ suburb: 1, created: -1 });
reportSchema.index({ client: 1, created: -1 });

// Parse GPS coordinates automatically before saving
reportSchema.pre('save', function () {
  if (this.gps && (!this.gpsCoords || !this.gpsCoords.lat)) {
    const match = /(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/.exec(this.gps);
    if (match) {
      this.gpsCoords = {
        lat: parseFloat(match[1]),
        lng: parseFloat(match[2])
      };
    }
  }
  if (!this.signCode && this.code) {
    this.signCode = this.code;
  }
});

const Report = mongoose.model('Report', reportSchema);
module.exports = Report;
