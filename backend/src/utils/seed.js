const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Client = require('../models/Client');
const Report = require('../models/Report');
const { ROLES } = require('../constants/roles');

const SUBURBS_FILE = path.join(__dirname, '..', '..', 'data', 'suburbsData.json');
const REPORTS_FILE = path.join(__dirname, '..', '..', 'data', 'reports.json');

const seedInitialData = async () => {
  try {
    // 1. Seed Default Administrator if no admin exists
    const adminCount = await User.countDocuments({ role: ROLES.ADMIN });
    if (adminCount === 0) {
      const username = (process.env.ADMIN_DEFAULT_USERNAME || 'admin').trim().toLowerCase();
      const password = process.env.ADMIN_DEFAULT_PASSWORD || 'AdminPassword123!';
      const email = (process.env.ADMIN_DEFAULT_EMAIL || 'admin@esigns.vic.gov.au').trim().toLowerCase();
      const name = process.env.ADMIN_DEFAULT_NAME || 'System Administrator';

      const passwordHash = await User.hashPassword(password);
      await User.create({
        username,
        email,
        name,
        passwordHash,
        role: ROLES.ADMIN,
        isActive: true
      });
      console.log(`[Seed] Initial administrator account created: "${username}" / (configured in .env)`);
    }

    // 2. Seed Default Client: "City of Greater Geelong" with Victorian suburbs
    const clientCount = await Client.countDocuments();
    if (clientCount === 0) {
      let suburbs = [];
      if (fs.existsSync(SUBURBS_FILE)) {
        const raw = fs.readFileSync(SUBURBS_FILE, 'utf-8');
        const data = JSON.parse(raw || '{}');
        suburbs = Object.keys(data).sort();
      }

      await Client.create({
        name: 'City of Greater Geelong',
        suburbs,
        contactEmail: 'contact@geelongcity.vic.gov.au'
      });
      console.log('[Seed] Default client "City of Greater Geelong" seeded with 60 suburbs.');
    }

    // 3. Migrate legacy records from data/reports.json if MongoDB reports collection is empty
    const reportCount = await Report.countDocuments();
    if (reportCount === 0 && fs.existsSync(REPORTS_FILE)) {
      try {
        const raw = fs.readFileSync(REPORTS_FILE, 'utf-8');
        const legacyReports = JSON.parse(raw || '[]');
        if (Array.isArray(legacyReports) && legacyReports.length > 0) {
          for (const rep of legacyReports) {
            if (!rep.ref) continue;
            await Report.findOneAndUpdate({ ref: rep.ref }, rep, {
              upsert: true,
              new: true,
              setDefaultsOnInsert: true
            });
          }
          console.log(`[Seed] Migrated ${legacyReports.length} existing reports into MongoDB.`);
        }
      } catch (err) {
        console.warn('[Seed] Notice: Could not parse legacy reports file:', err.message);
      }
    }
  } catch (error) {
    console.error('[Seed Error] Failed to seed initial database data:', error.message);
  }
};

module.exports = { seedInitialData };

