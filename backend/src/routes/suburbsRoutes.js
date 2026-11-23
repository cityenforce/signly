const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const SUBURBS_FILE = path.join(__dirname, '..', '..', 'data', 'suburbsData.json');
let suburbsCache = null;

router.get('/', (req, res) => {
  try {
    if (suburbsCache) {
      return res.json({
        success: true,
        count: Object.keys(suburbsCache).length,
        suburbs: Object.keys(suburbsCache).sort(),
        data: suburbsCache
      });
    }

    if (fs.existsSync(SUBURBS_FILE)) {
      const raw = fs.readFileSync(SUBURBS_FILE, 'utf-8');
      suburbsCache = JSON.parse(raw || '{}');
      const suburbNames = Object.keys(suburbsCache).sort();
      return res.json({
        success: true,
        count: suburbNames.length,
        suburbs: suburbNames,
        data: suburbsCache
      });
    }

    res.json({ success: true, count: 0, suburbs: [], data: {} });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

