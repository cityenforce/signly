const express = require('express');
const router = express.Router();
const {
  getClients,
  createClient,
  updateClient,
  deleteClient
} = require('../controllers/clientsController');
const { validate } = require('../middleware/validateMiddleware');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { ROLES } = require('../constants/roles');
const { createClientSchema, updateClientSchema } = require('../validations/clientValidation');

router.get('/', getClients);

router.post('/', authenticate, requireRole(ROLES.ADMIN, ROLES.LEADER), validate(createClientSchema), createClient);
router.put('/:id', authenticate, requireRole(ROLES.ADMIN, ROLES.LEADER), validate(updateClientSchema), updateClient);
router.delete('/:id', authenticate, requireRole(ROLES.ADMIN, ROLES.LEADER), deleteClient);

module.exports = router;

