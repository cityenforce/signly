const path = require('path');
const fs = require('fs');
const Area = require('../models/Area');
const Report = require('../models/Report');

// Load suburbs data for street coverage lookup
const SUBURBS_FILE = path.join(__dirname, '..', '..', 'data', 'suburbsData.json');
let suburbsCache = null;

const getSuburbsData = () => {
  if (suburbsCache) return suburbsCache;
  try {
    if (fs.existsSync(SUBURBS_FILE)) {
      const raw = fs.readFileSync(SUBURBS_FILE, 'utf-8');
      suburbsCache = JSON.parse(raw);
      return suburbsCache;
    }
  } catch (e) {
    console.error('Error reading suburbs data:', e);
  }
  return {};
};

// @desc    Get all 5-digit areas
// @route   GET /api/areas
// @access  Public / Authenticated
const getAreas = async (req, res, next) => {
  try {
    const areas = await Area.find().sort({ code: 1 }).lean();
    res.json({
      success: true,
      count: areas.length,
      data: areas
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single area by 5-digit code
// @route   GET /api/areas/:code
// @access  Public / Authenticated
const getAreaByCode = async (req, res, next) => {
  try {
    const { code } = req.params;
    const area = await Area.findOne({ code }).lean();

    if (!area) {
      return res.status(404).json({
        success: false,
        message: `Area with code ${code} not found`
      });
    }

    res.json({
      success: true,
      data: area
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new 5-digit area
// @route   POST /api/areas
// @access  Admin Only
const createArea = async (req, res, next) => {
  try {
    const { code, name, suburbs, poly } = req.body;

    const existing = await Area.findOne({ code });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Area code ${code} already exists.`
      });
    }

    const newArea = await Area.create({
      code,
      name,
      suburbs: suburbs || [],
      poly: poly || null
    });

    res.status(201).json({
      success: true,
      message: 'Area created successfully',
      data: newArea
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update area
// @route   PUT /api/areas/:code
// @access  Admin Only
const updateArea = async (req, res, next) => {
  try {
    const { code } = req.params;
    const payload = req.body;

    const area = await Area.findOneAndUpdate({ code }, payload, {
      new: true,
      runValidators: true
    });

    if (!area) {
      return res.status(404).json({
        success: false,
        message: `Area with code ${code} not found`
      });
    }

    res.json({
      success: true,
      message: 'Area updated successfully',
      data: area
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete area
// @route   DELETE /api/areas/:code
// @access  Admin Only
const deleteArea = async (req, res, next) => {
  try {
    const { code } = req.params;
    const deleted = await Area.findOneAndDelete({ code });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: `Area with code ${code} not found`
      });
    }

    res.json({
      success: true,
      message: 'Area deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get coverage stats across areas
// @route   GET /api/areas/stats/coverage
// @access  Admin / Authenticated
const getAreaCoverage = async (req, res, next) => {
  try {
    const [areas, reports] = await Promise.all([
      Area.find().lean(),
      Report.find({}, 'suburb street areaCode').lean()
    ]);

    const suburbsDict = getSuburbsData();

    // Map completed streets per suburb
    const suburbCompletedStreets = {};
    reports.forEach((r) => {
      if (r.suburb && r.street) {
        if (!suburbCompletedStreets[r.suburb]) {
          suburbCompletedStreets[r.suburb] = new Set();
        }
        suburbCompletedStreets[r.suburb].add(r.street);
      }
    });

    const coverageList = areas.map((area) => {
      const subs = area.suburbs || [];
      let totalStreets = 0;
      let doneStreets = 0;

      subs.forEach((sub) => {
        const allInSub = suburbsDict[sub] || [];
        totalStreets += allInSub.length;

        const doneInSub = suburbCompletedStreets[sub] || new Set();
        // Count only registered streets in the suburb
        allInSub.forEach((st) => {
          if (doneInSub.has(st)) doneStreets++;
        });
      });

      const areaReportsCount = reports.filter(
        (r) => r.areaCode === area.code || subs.includes(r.suburb)
      ).length;

      const pct = totalStreets > 0 ? Math.round((doneStreets / totalStreets) * 100) : 0;

      return {
        code: area.code,
        name: area.name,
        suburbs: subs,
        reportsCount: areaReportsCount,
        doneStreets,
        totalStreets,
        percentage: pct,
        poly: area.poly
      };
    });

    res.json({
      success: true,
      data: coverageList
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAreas,
  getAreaByCode,
  createArea,
  updateArea,
  deleteArea,
  getAreaCoverage
};

