const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const {
  login,
  initialAdminSetup,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');
const { validate } = require('../middleware/validateMiddleware');
const { authenticate } = require('../middleware/authMiddleware');
const {
  loginSchema,
  initialAdminSetupSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} = require('../validations/authValidation');

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { success: false, message: 'Too many password reset attempts. Please try again later.' }
});

// Public auth endpoints
router.post('/login', validate(loginSchema), login);
router.post('/setup-admin', validate(initialAdminSetupSchema), initialAdminSetup);
router.post('/forgot-password', resetLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', resetLimiter, validate(resetPasswordSchema), resetPassword);

// Protected endpoints
router.get('/me', authenticate, getMe);
router.put('/change-password', authenticate, validate(changePasswordSchema), changePassword);

module.exports = router;
