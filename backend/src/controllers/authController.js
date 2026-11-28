const crypto = require('crypto');
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

// @desc    Request password reset code (6-digit OTP)
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const identifier = req.body.identifier.trim().toLowerCase();
    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }]
    }).select('+resetPasswordToken +resetPasswordExpires');

    // Always return generic success for security if user doesn't exist
    if (!user || !user.isActive) {
      return res.json({
        success: true,
        message: 'If an active account matches that username or email, a password reset code has been issued.'
      });
    }

    // Generate 6-digit numeric reset code valid for 15 minutes
    const resetCode = String(crypto.randomInt(100000, 999999));
    const hashedToken = crypto.createHash('sha256').update(resetCode).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    // Dispatch via Resend HTTP API if configured
    let emailSent = false;
    if (process.env.RESEND_API_KEY && user.email) {
      try {
        const mailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || 'i-Sign Support <noreply@isign.vic.gov.au>',
            to: [user.email],
            subject: 'i-Sign Password Reset Code',
            text: `Hello ${user.name},\n\nYour i-Sign password reset code is: ${resetCode}\n\nThis code expires in 15 minutes.`
          })
        });
        emailSent = mailRes.ok;
      } catch (mailErr) {
        console.warn('[ForgotPassword] Email dispatch failed:', mailErr.message);
      }
    }

    if (!emailSent) {
      console.log(`[ForgotPassword] Reset code generated for "${user.username}" (${user.email}): ${resetCode}`);
    }

    res.json({
      success: true,
      message: emailSent
        ? `A 6-digit password reset code has been sent to ${user.email}.`
        : 'A 6-digit password reset code has been generated. Check your email or contact Admin Control if email delivery is not configured.',
      emailSent,
      ...(process.env.NODE_ENV !== 'production' && !emailSent ? { devResetCode: resetCode } : {})
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Reset password using 6-digit OTP code
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    const identifier = req.body.identifier.trim().toLowerCase();
    const { token, newPassword } = req.body;
    const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }],
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() }
    }).select('+passwordHash +resetPasswordToken +resetPasswordExpires');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset code.'
      });
    }

    user.passwordHash = await User.hashPassword(newPassword);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now sign in with your new password.'
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  login,
  initialAdminSetup,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword
};

