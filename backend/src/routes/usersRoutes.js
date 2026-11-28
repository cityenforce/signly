const express = require('express');
const multer = require('multer');
const router = express.Router();
const {
  getProfile,
  uploadProfileAvatar,
  deleteProfileAvatar,
  getUsers,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/usersController');
const { validate } = require('../middleware/validateMiddleware');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { ROLES } = require('../constants/roles');
const { registerOfficerSchema } = require('../validations/authValidation');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB for profile avatar
});

// All user routes require authentication
router.use(authenticate);

// Profile endpoints (accessible to both officers and admins)
router.get('/profile', getProfile);
router.post('/profile/avatar', upload.single('avatar'), uploadProfileAvatar);
router.delete('/profile/avatar', deleteProfileAvatar);

// People Leaders & Admins can view the staff list
router.get('/', requireRole(ROLES.ADMIN, ROLES.LEADER), getUsers);
// Admin Control only: create, update, delete accounts
router.post('/', requireRole(ROLES.ADMIN), validate(registerOfficerSchema), createUser);
router.put('/:id', requireRole(ROLES.ADMIN), updateUser);
router.delete('/:id', requireRole(ROLES.ADMIN), deleteUser);

module.exports = router;
