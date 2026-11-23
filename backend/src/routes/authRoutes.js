const express = require('express');
const router = express.Router();
const { login, initialAdminSetup, getMe, changePassword } = require('../controllers/authController');
const { validate } = require('../middleware/validateMiddleware');
const { authenticate } = require('../middleware/authMiddleware');
const {
  loginSchema,
  initialAdminSetupSchema,
  changePasswordSchema
} = require('../validations/authValidation');

// Public auth endpoints
router.post('/login', validate(loginSchema), login);
router.post('/setup-admin', validate(initialAdminSetupSchema), initialAdminSetup);

// Protected endpoints
router.get('/me', authenticate, getMe);
router.put('/change-password', authenticate, validate(changePasswordSchema), changePassword);

module.exports = router;

