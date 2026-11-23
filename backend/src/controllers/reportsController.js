const Report = require('../models/Report');
const Area = require('../models/Area');
const User = require('../models/User');
const Attachment = require('../models/Attachment');
const r2Service = require('../services/r2Service');
const { ROLES } = require('../constants/roles');

// Helper to process photos array, upload base64 images to Cloudflare R2, and save MongoDB metadata
async function processPhotosForReport(photos, reportRef, userId) {
  if (!Array.isArray(photos) || photos.length === 0) {
    return { photos: [], photoKeys: [], attachmentIds: [] };
  }

  const processedPhotos = [];
  const photoKeys = [];
  const attachmentIds = [];

  for (let i = 0; i < photos.length; i++) {
    const item = photos[i];
    if (typeof item === 'string' && item.startsWith('data:image/')) {
      try {
        const matches = item.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const mimeType = matches[1];
          const buffer = Buffer.from(matches[2], 'base64');
          const ext = mimeType.split('/')[1] || 'jpg';
          const filename = `sign_photo_${i + 1}.${ext}`;

          // Upload binary directly to Cloudflare R2 under reports/{reportRef}/images/
          const uploaded = await r2Service.uploadFile({
            buffer,
            originalname: filename,
            mimetype: mimeType,
            folder: `reports/${reportRef}/images`,
            isPublic: false,
            metadata: {
              reportRef,
              uploadedBy: userId ? userId.toString() : 'anonymous',
              category: 'sign_photo'
            }
          });

          // Save image metadata in MongoDB Atlas
          const attachment = await Attachment.create({
            key: uploaded.key,
            filename: uploaded.filename,
            mimeType: uploaded.mimeType,
            size: uploaded.size,
            url: uploaded.url,
            isPublic: false,
            storageProvider: uploaded.storageProvider,
            reportRef,
            category: 'sign_photo',
            uploadedBy: userId,
            metadata: { autoExtracted: true }
          });

          const viewUrl = await r2Service.getImageViewingUrl(attachment.key, 3600, false);
          processedPhotos.push(viewUrl || attachment.key);
          photoKeys.push(attachment.key);
          attachmentIds.push(attachment._id);
        }
      } catch (err) {
        console.warn('Failed to upload base64 photo to Cloudflare R2:', err.message);
      }
    } else if (typeof item === 'string' && item.trim()) {
      processedPhotos.push(item);
      if (!item.startsWith('http') && !item.startsWith('/')) {
        photoKeys.push(item);
      }
    }
  }

  return { photos: processedPhotos, photoKeys, attachmentIds };
}

// Helper to determine whether a GPS coordinate is inside an Area polygon
function pointInPolygon(point, polygon) {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  const [lat, lng] = point;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i];
    const [yj, xj] = polygon[j];
    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Find matching area for a report based on polygon or suburb
async function findAreaForReport(report) {
  const areas = await Area.find().lean();
  let lat = null,
    lng = null;

  if (report.gpsCoords && report.gpsCoords.lat) {
    lat = report.gpsCoords.lat;
    lng = report.gpsCoords.lng;
  } else if (report.gps) {
    const match = /(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/.exec(report.gps);
    if (match) {
      lat = parseFloat(match[1]);
      lng = parseFloat(match[2]);
    }
  }

  // 1. Check polygon geometric containment first
  if (lat !== null && lng !== null) {
    for (const a of areas) {
      if (a.poly && a.poly.length >= 3 && pointInPolygon([lat, lng], a.poly)) {
        return a.code;
      }
    }
  }

  // 2. Fallback to suburb association
  if (report.suburb) {
    for (const a of areas) {
      if (a.suburbs && a.suburbs.includes(report.suburb)) {
        return a.code;
      }
    }
  }

  return null;
}

// @desc    Get all reports with advanced filtering & search
// @route   GET /api/reports
// @access  Public/Authenticated
const getReports = async (req, res, next) => {
  try {
    const {
      fromDate,
      toDate,
      suburb,
      condition,
      client,
      officer,
      officerNo,
      areaCode,
      type,
      search,
      page = 1,
      limit = 100
    } = req.query;

    const filter = {};

    // Date range
    if (fromDate || toDate) {
      filter.submitted = {};
      if (fromDate) filter.submitted.$gte = new Date(fromDate);
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        filter.submitted.$lte = to;
      }
    }

    // Suburb filter
    if (suburb && suburb !== 'All suburbs') {
      filter.suburb = new RegExp(`^${suburb}$`, 'i');
    }

    // Client filter
    if (client && client !== 'All clients') {
      filter.client = client;
    }

    // Officer filter
    if (officer && officer !== 'All officers') {
      filter['officer.name'] = new RegExp(officer, 'i');
    }
    if (officerNo) {
      filter['officer.no'] = officerNo;
    }

    // Area code
    if (areaCode) {
      filter.areaCode = areaCode;
    }

    // Condition / restriction rule
    if (condition && condition !== 'All conditions') {
      filter['signs.conds.rule'] = condition;
    }

    // Sign Type
    if (type) {
      filter['signs.type'] = type;
    }

    // Full text search across reference, code, street, client, notes
    if (search) {
      const q = search.trim();
      filter.$or = [
        { ref: new RegExp(q, 'i') },
        { code: new RegExp(q, 'i') },
        { signCode: new RegExp(q, 'i') },
        { street: new RegExp(q, 'i') },
        { client: new RegExp(q, 'i') },
        { notes: new RegExp(q, 'i') },
        { 'officer.name': new RegExp(q, 'i') }
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 100;
    const skip = (pageNum - 1) * limitNum;

    const [reports, totalCount] = await Promise.all([
      Report.find(filter)
        .sort({ submitted: -1, created: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Report.countDocuments(filter)
    ]);

    const resolvedReports = await Promise.all(
      reports.map(async (r) => {
        let photos = r.photos || [];
        if (r.photoKeys && r.photoKeys.length > 0) {
          photos = await Promise.all(
            r.photoKeys.map((key) => r2Service.getImageViewingUrl(key, 3600, false))
          );
        }
        return {
          ...r,
          photos
        };
      })
    );

    res.json({
      success: true,
      count: resolvedReports.length,
      total: totalCount,
      page: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
      data: resolvedReports
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single report by reference number
// @route   GET /api/reports/:ref
// @access  Public/Authenticated
const getReportByRef = async (req, res, next) => {
  try {
    const { ref } = req.params;
    const report = await Report.findOne({ ref }).lean();

    if (!report) {
      return res.status(404).json({
        success: false,
        message: `Report with reference ${ref} not found`
      });
    }

    let photos = report.photos || [];
    if (report.photoKeys && report.photoKeys.length > 0) {
      photos = await Promise.all(
        report.photoKeys.map((key) => r2Service.getImageViewingUrl(key, 3600, false))
      );
    }

    res.json({
      success: true,
      data: {
        ...report,
        photos
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new report (upsert supported for offline sync)
// @route   POST /api/reports
// @access  Authenticated (or open for mobile offline sync)
const createReport = async (req, res, next) => {
  try {
    const payload = req.body;
    const code = payload.code || payload.signCode || payload.ref;

    // Check if report with this reference already exists (e.g. mobile sync retry)
    let existing = await Report.findOne({ ref: payload.ref });

    // Link officer info if request is authenticated
    let officerData = payload.officer || {};
    if (req.user) {
      officerData = {
        userId: req.user._id,
        name: req.user.name,
        no: req.user.officerNo || ''
      };
    }

    // Auto-calculate Area code if not provided
    if (!payload.areaCode) {
      payload.areaCode = await findAreaForReport(payload);
    }

    // Process photos if present (auto-extract any base64 and upload to Cloudflare R2)
    const { photos: processedPhotos, photoKeys, attachmentIds } = await processPhotosForReport(
      payload.photos,
      payload.ref,
      req.user ? req.user._id : null
    );

    const reportData = {
      ...payload,
      code,
      signCode: code,
      officer: officerData.name ? officerData : (existing?.officer || { name: 'Unassigned', no: '' }),
      photos: processedPhotos.length > 0 ? processedPhotos : (payload.photos || []),
      photoKeys: photoKeys.length > 0 ? photoKeys : (existing?.photoKeys || []),
      attachments: attachmentIds.length > 0 ? attachmentIds : (existing?.attachments || []),
      photoCount: processedPhotos.length > 0 ? processedPhotos.length : (payload.photoCount || 0)
    };

    if (existing) {
      reportData.updated = new Date();
      existing = await Report.findOneAndUpdate({ ref: payload.ref }, reportData, {
        new: true,
        runValidators: true
      });
      return res.json({
        success: true,
        message: 'Report updated successfully',
        data: existing
      });
    }

    const newReport = await Report.create(reportData);

    res.status(201).json({
      success: true,
      message: 'Report created successfully',
      data: newReport
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update existing report
// @route   PUT /api/reports/:ref
// @access  Authenticated
const updateReport = async (req, res, next) => {
  try {
    const { ref } = req.params;
    const payload = req.body;

    const existing = await Report.findOne({ ref });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `Report with reference ${ref} not found`
      });
    }

    // Role check: field officers can only update their own reports
    if (req.user && req.user.role === ROLES.OFFICER) {
      if (
        existing.officer &&
        existing.officer.userId &&
        existing.officer.userId.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to edit reports submitted by other officers.'
        });
      }
    }

    // Re-evaluate area if GPS or suburb changed
    if (payload.gps || payload.suburb) {
      payload.areaCode = await findAreaForReport({ ...existing.toObject(), ...payload });
    }

    payload.updated = new Date();
    if (Array.isArray(payload.photos)) {
      const { photos: processedPhotos, photoKeys, attachmentIds } = await processPhotosForReport(
        payload.photos,
        ref,
        req.user ? req.user._id : null
      );
      payload.photos = processedPhotos;
      if (photoKeys.length > 0) payload.photoKeys = photoKeys;
      if (attachmentIds.length > 0) payload.attachments = attachmentIds;
      payload.photoCount = processedPhotos.length;
    }

    const updated = await Report.findOneAndUpdate({ ref }, payload, {
      new: true,
      runValidators: true
    });

    res.json({
      success: true,
      message: 'Report updated successfully',
      data: updated
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete report
// @route   DELETE /api/reports/:ref
// @access  Admin Only
const deleteReport = async (req, res, next) => {
  try {
    const { ref } = req.params;
    const report = await Report.findOne({ ref });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: `Report with reference ${ref} not found`
      });
    }

    // Clean up all Cloudflare R2 objects and attachments linked to this report
    const attachments = await Attachment.find({ reportRef: ref });
    for (const att of attachments) {
      await r2Service.deleteFile(att.key);
    }
    await Attachment.deleteMany({ reportRef: ref });

    if (report.photoKeys && report.photoKeys.length > 0) {
      for (const key of report.photoKeys) {
        await r2Service.deleteFile(key);
      }
    }

    await report.deleteOne();

    res.json({
      success: true,
      message: 'Report and associated R2 attachments deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Export filtered reports to CSV
// @route   GET /api/reports/export/csv
// @access  Admin / Authenticated
const exportCsv = async (req, res, next) => {
  try {
    const { fromDate, toDate, suburb, condition, client, officer, areaCode, search } = req.query;
    const filter = {};

    if (fromDate || toDate) {
      filter.submitted = {};
      if (fromDate) filter.submitted.$gte = new Date(fromDate);
      if (toDate) filter.submitted.$lte = new Date(toDate);
    }
    if (suburb && suburb !== 'All suburbs') filter.suburb = new RegExp(`^${suburb}$`, 'i');
    if (client && client !== 'All clients') filter.client = client;
    if (officer) filter['officer.name'] = new RegExp(officer, 'i');
    if (areaCode) filter.areaCode = areaCode;
    if (condition && condition !== 'All conditions') filter['signs.conds.rule'] = condition;
    if (search) {
      filter.$or = [
        { ref: new RegExp(search, 'i') },
        { street: new RegExp(search, 'i') },
        { suburb: new RegExp(search, 'i') }
      ];
    }

    const reports = await Report.find(filter).sort({ submitted: -1 }).lean();

    const headers = [
      'Date',
      'Ref',
      'Code',
      'Officer',
      'Officer no',
      'Client',
      'Suburb',
      'Street',
      'From',
      'To',
      'Side',
      'Area',
      'GPS',
      'Signs'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = reports.map((r) => {
      const date = (r.submitted || r.created ? new Date(r.submitted || r.created) : new Date())
        .toISOString()
        .slice(0, 10);
      const officerName = (r.officer && r.officer.name) || 'Unassigned';
      const officerNo = (r.officer && r.officer.no) || '';
      const signsSummary = (r.signs || [])
        .map((s) => (s.conds || []).map((c) => c.rule).join('; '))
        .join(' | ');

      return [
        escapeCsv(date),
        escapeCsv(r.ref),
        escapeCsv(r.code || r.signCode),
        escapeCsv(officerName),
        escapeCsv(officerNo),
        escapeCsv(r.client),
        escapeCsv(r.suburb),
        escapeCsv(r.street),
        escapeCsv(r.from || ''),
        escapeCsv(r.to || ''),
        escapeCsv(r.side || ''),
        escapeCsv(r.areaCode || ''),
        escapeCsv(r.gps || ''),
        escapeCsv(signsSummary)
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="esigns-reports-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.send(csvContent);
  } catch (err) {
    next(err);
  }
};

// @desc    Dashboard statistics and breakdowns
// @route   GET /api/reports/dashboard/stats
// @access  Admin / Authenticated
const getDashboardStats = async (req, res, next) => {
  try {
    const [totalReports, uniqueSuburbs, totalAreas, activeOfficers, reports] = await Promise.all([
      Report.countDocuments(),
      Report.distinct('suburb'),
      Area.countDocuments(),
      User.countDocuments({ role: ROLES.OFFICER, isActive: true }),
      Report.find({}, 'suburb officer created submitted').lean()
    ]);

    // Suburb breakdown
    const suburbCounts = {};
    const officerCounts = {};

    reports.forEach((r) => {
      if (r.suburb) {
        suburbCounts[r.suburb] = (suburbCounts[r.suburb] || 0) + 1;
      }
      const offName = (r.officer && r.officer.name) || 'Unassigned';
      officerCounts[offName] = (officerCounts[offName] || 0) + 1;
    });

    const suburbBreakdown = Object.entries(suburbCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);

    const officerBreakdown = Object.entries(officerCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);

    res.json({
      success: true,
      stats: {
        totalReports,
        suburbsCovered: uniqueSuburbs.length,
        areasDefined: totalAreas,
        activeOfficers
      },
      breakdowns: {
        bySuburb: suburbBreakdown,
        byOfficer: officerBreakdown
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Import batch reports (from app copy/paste JSON)
// @route   POST /api/reports/batch/import
// @access  Admin Only
const importReports = async (req, res, next) => {
  try {
    const { items, officer } = req.body;
    const array = Array.isArray(items) ? items : [items];

    let inserted = 0;
    for (const item of array) {
      if (!item.ref) continue;
      const code = item.code || item.signCode || item.ref;
      const payload = {
        ...item,
        code,
        signCode: code,
        officer: officer || item.officer || { name: 'Imported', no: '' }
      };

      if (!payload.areaCode) {
        payload.areaCode = await findAreaForReport(payload);
      }

      await Report.findOneAndUpdate({ ref: payload.ref }, payload, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      });
      inserted++;
    }

    res.json({
      success: true,
      message: `Successfully imported ${inserted} reports.`
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Seed demo reports and demo officers
// @route   POST /api/reports/demo/seed
// @access  Admin Only
const seedDemoData = async (req, res, next) => {
  try {
    const demoOfficers = [
      { name: 'Sarah Nguyen', officerNo: '1042', username: 'sarah.nguyen' },
      { name: 'Mark Taylor', officerNo: '1057', username: 'mark.taylor' },
      { name: 'Priya Shah', officerNo: '1063', username: 'priya.shah' }
    ];

    // Seed officers if not exist
    for (const off of demoOfficers) {
      const exists = await User.findOne({ officerNo: off.officerNo });
      if (!exists) {
        const hash = await User.hashPassword('OfficerPass123!');
        await User.create({
          username: off.username,
          name: off.name,
          officerNo: off.officerNo,
          email: `${off.username}@esigns.vic.gov.au`,
          passwordHash: hash,
          role: ROLES.OFFICER,
          isActive: true
        });
      }
    }

    // Geelong area center: -38.1499, 144.3617
    const streets = [
      'Ryrie Street',
      'Moorabool Street',
      'Malop Street',
      'Little Malop Street',
      'Yarra Street',
      'Gheringhap Street',
      'Brougham Street',
      'Myers Street',
      'Mercer Street',
      'Corio Street'
    ];

    const rules = ['1P Meter', '2P', 'No Stopping', 'Loading Zone', 'Disabled Parking', '1/2P'];

    const demoReports = [];
    const now = Date.now();

    for (let i = 0; i < 40; i++) {
      const ref = `DEMO${now.toString().slice(-6)}${i.toString().padStart(2, '0')}`;
      const code = `SGN-DEMO-${(1000 + i).toString()}`;
      const off = demoOfficers[i % demoOfficers.length];
      const street = streets[i % streets.length];
      const rule = rules[i % rules.length];

      // Jitter lat/lng around Central Geelong
      const lat = -38.1499 + (Math.random() - 0.5) * 0.04;
      const lng = 144.3617 + (Math.random() - 0.5) * 0.05;

      demoReports.push({
        ref,
        code,
        signCode: code,
        client: 'City of Greater Geelong',
        suburb: 'Geelong',
        street,
        from: streets[(i + 1) % streets.length],
        to: streets[(i + 2) % streets.length],
        side: i % 2 === 0 ? 'North' : 'South',
        address: `${10 + i * 2} ${street}`,
        gps: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        gpsCoords: { lat, lng },
        notes: `Demo audit entry #${i + 1} - verified AS 1742.11`,
        signs: [
          {
            type: 'Parking Restrictions',
            conds: [
              {
                rule,
                arrow: '↔',
                day: 'Mon–Fri',
                time: '9am–5pm'
              }
            ]
          }
        ],
        officer: {
          name: off.name,
          no: off.officerNo
        },
        isDemo: true,
        created: new Date(now - i * 3600 * 1000 * 6),
        submitted: new Date(now - i * 3600 * 1000 * 6)
      });
    }

    // Save demo reports
    for (const r of demoReports) {
      r.areaCode = await findAreaForReport(r);
      await Report.findOneAndUpdate({ ref: r.ref }, r, { upsert: true, new: true });
    }

    res.json({
      success: true,
      message: `Seeded 3 demo officers and 40 demo GPS-tagged reports around Geelong.`
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Remove all demo data
// @route   DELETE /api/reports/demo/remove
// @access  Admin Only
const removeDemoData = async (req, res, next) => {
  try {
    const deleted = await Report.deleteMany({ isDemo: true });
    res.json({
      success: true,
      message: `Removed ${deleted.deletedCount} demo reports.`
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getReports,
  getReportByRef,
  createReport,
  updateReport,
  deleteReport,
  exportCsv,
  getDashboardStats,
  importReports,
  seedDemoData,
  removeDemoData
};

