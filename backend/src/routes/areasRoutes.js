const express = require('express');
const router = express.Router();
const {
  getAreas,
  getAreaByCode,
  createArea,
  updateArea,
  deleteArea,
  getAreaCoverage
} = require('../controllers/areasController');
const { validate } = require('../middleware/validateMiddleware');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { ROLES } = require('../constants/roles');
const { createAreaSchema, updateAreaSchema } = require('../validations/areaValidation');

// Coverage stats across areas
router.get('/stats/coverage', getAreaCoverage);

// Standard Area CRUD
router.get('/', getAreas);
router.get('/:code', getAreaByCode);

router.post('/', authenticate, requireRole(ROLES.ADMIN, ROLES.LEADER), validate(createAreaSchema), createArea);
router.put('/:code', authenticate, requireRole(ROLES.ADMIN, ROLES.LEADER), validate(updateAreaSchema), updateArea);
router.delete('/:code', authenticate, requireRole(ROLES.ADMIN, ROLES.LEADER), deleteArea);

module.exports = router;

