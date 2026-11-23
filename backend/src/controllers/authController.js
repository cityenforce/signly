const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const { ROLES } = require('../constants/roles');

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const identifier = username.trim().toLowerCase();

    // Find user by either username or email
    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }]
    }).select('+passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username/email or password'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact an administrator.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username/email or password'
      });
    }

    // Update last login timestamp
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    // Generate JWT token
    const token = generateToken({
      userId: user._id,
      username: user.username,
      role: user.role,
      officerNo: user.officerNo
    });

    res.json({
      success: true,
      message: 'Authentication successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        officerNo: user.officerNo,
        role: user.role,
        lastLoginAt: user.lastLoginAt
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    First-time administrator setup (if no admin exists)
// @route   POST /api/auth/setup-admin
// @access  Public (only when no admin exists)
const initialAdminSetup = async (req, res, next) => {
  try {
    const adminCount = await User.countDocuments({ role: ROLES.ADMIN });
    if (adminCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Administrator account already exists. Setup is locked.'
      });
    }

    const { username, password, email, name } = req.body;
    const passwordHash = await User.hashPassword(password);

    const admin = await User.create({
      username: username.trim().toLowerCase(),
      email: (email || `${username.trim().toLowerCase()}@esigns.vic.gov.au`).trim().toLowerCase(),
      name: (name || 'System Administrator').trim(),
      passwordHash,
      role: ROLES.ADMIN,
      isActive: true
    });

    const token = generateToken({
      userId: admin._id,
      username: admin.username,
      role: admin.role
    });

    res.status(201).json({
      success: true,
      message: 'Initial administrator account created successfully',
      token,
      user: admin
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
};

// @desc    Change current user password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+passwordHash');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password does not match'
      });
    }

    user.passwordHash = await User.hashPassword(newPassword);
    await user.save();

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  login,
  initialAdminSetup,
  getMe,
  changePassword
};

