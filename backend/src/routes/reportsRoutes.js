const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/reportsController');
const { validate } = require('../middleware/validateMiddleware');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { ROLES } = require('../constants/roles');
const {
  createReportSchema,
  updateReportSchema,
  filterReportsQuerySchema
} = require('../validations/reportValidation');

// Dashboard statistics
router.get('/dashboard/stats', getDashboardStats);

// CSV export
router.get('/export/csv', exportCsv);

// Demo data operations (Admin only)
router.post('/demo/seed', authenticate, requireRole(ROLES.ADMIN), seedDemoData);
router.delete('/demo/remove', authenticate, requireRole(ROLES.ADMIN), removeDemoData);

// Batch import (Admin only)
router.post('/batch/import', authenticate, requireRole(ROLES.ADMIN), importReports);

// Standard Report CRUD
router.get('/', validate(filterReportsQuerySchema), getReports);
router.get('/:ref', getReportByRef);

// Create report: allows both authenticated officers and field officers offline sync
router.post('/', validate(createReportSchema), (req, res, next) => {
  // Try optional authentication
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authenticate(req, res, () => createReport(req, res, next));
  }
  return createReport(req, res, next);
});

// Update report
router.put('/:ref', validate(updateReportSchema), authenticate, updateReport);

// Delete report (Admin only)
router.delete('/:ref', authenticate, requireRole(ROLES.ADMIN), deleteReport);

module.exports = router;

