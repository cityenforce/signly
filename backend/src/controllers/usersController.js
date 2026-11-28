const User = require('../models/User');
const Report = require('../models/Report');
const Attachment = require('../models/Attachment');
const r2Service = require('../services/r2Service');
const { ROLES } = require('../constants/roles');

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Authenticated
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let avatarViewUrl = user.avatar;
    if (user.avatarKey) {
      avatarViewUrl = await r2Service.getImageViewingUrl(user.avatarKey, 3600, false);
    }

    res.json({
      success: true,
      user: {
        ...user.toJSON(),
        avatar: avatarViewUrl
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Upload / replace profile avatar
// @route   POST /api/users/profile/avatar
// @access  Authenticated
const uploadProfileAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file uploaded' });
    }

    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // 1. Upload new image to Cloudflare R2
    const uploaded = await r2Service.uploadFile({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      folder: `users/${userId}/profile`,
      isPublic: false,
      metadata: {
        uploadedBy: userId.toString(),
        category: 'profile_avatar'
      }
    });

    // 2. Save metadata in MongoDB Atlas
    const attachment = await Attachment.create({
      key: uploaded.key,
      filename: uploaded.filename,
      mimeType: uploaded.mimeType,
      size: uploaded.size,
      url: uploaded.url,
      isPublic: false,
      storageProvider: uploaded.storageProvider,
      category: 'profile_avatar',
      uploadedBy: userId,
      metadata: { clientIp: req.ip }
    });

    // 3. Update User reference in MongoDB
    const oldAvatarKey = user.avatarKey;
    const viewUrl = await r2Service.getImageViewingUrl(attachment.key, 3600, false);

    user.avatar = viewUrl;
    user.avatarKey = uploaded.key;
    user.avatarAttachmentId = attachment._id;
    await user.save();

    // 4. Clean up old avatar from R2 ONLY after MongoDB update succeeded
    if (oldAvatarKey && oldAvatarKey !== uploaded.key) {
      await r2Service.deleteFile(oldAvatarKey);
      await Attachment.deleteOne({ key: oldAvatarKey });
    }

    res.json({
      success: true,
      message: 'Profile avatar updated successfully',
      avatar: viewUrl,
      avatarKey: uploaded.key
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete profile avatar
// @route   DELETE /api/users/profile/avatar
// @access  Authenticated
const deleteProfileAvatar = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.avatarKey) {
      await r2Service.deleteFile(user.avatarKey);
      await Attachment.deleteOne({ key: user.avatarKey });
    }

    user.avatar = '';
    user.avatarKey = '';
    user.avatarAttachmentId = null;
    await user.save();

    res.json({
      success: true,
      message: 'Profile avatar deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all users / officers
// @route   GET /api/users
// @access  Admin Only
const getUsers = async (req, res, next) => {
  try {
    const { role } = req.query;
    const filter = {};
    if (role) filter.role = role;

    const [users, reports] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).lean(),
      Report.find({}, 'officer').lean()
    ]);

    // Count reports per officer number / name
    const reportCountsByNo = {};
    const reportCountsByName = {};

    reports.forEach((r) => {
      if (r.officer) {
        if (r.officer.no) {
          reportCountsByNo[r.officer.no] = (reportCountsByNo[r.officer.no] || 0) + 1;
        }
        if (r.officer.name) {
          reportCountsByName[r.officer.name] = (reportCountsByName[r.officer.name] || 0) + 1;
        }
      }
    });

    const enriched = await Promise.all(
      users.map(async (u) => {
        let count = 0;
        if (u.officerNo && reportCountsByNo[u.officerNo]) {
          count = reportCountsByNo[u.officerNo];
        } else if (u.name && reportCountsByName[u.name]) {
          count = reportCountsByName[u.name];
        }

        let avatarViewUrl = u.avatar || '';
        if (u.avatarKey) {
          avatarViewUrl = await r2Service.getImageViewingUrl(u.avatarKey, 3600, false);
        }

        return {
          ...u,
          avatar: avatarViewUrl,
          reportsCount: count
        };
      })
    );

    res.json({
      success: true,
      count: enriched.length,
      data: enriched
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new user / officer
// @route   POST /api/users
// @access  Admin Only
const createUser = async (req, res, next) => {
  try {
    const { username, password, email, name, officerNo, role } = req.body;

    const existingUser = await User.findOne({
      $or: [
        { username: username.trim().toLowerCase() },
        ...(email ? [{ email: email.trim().toLowerCase() }] : []),
        ...(officerNo ? [{ officerNo: officerNo.trim() }] : [])
      ]
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'A user with this username, email, or officer number already exists.'
      });
    }

    const passwordHash = await User.hashPassword(password);

    const newUser = await User.create({
      username: username.trim().toLowerCase(),
      email: (email || `${username.trim().toLowerCase()}@signly.vic.gov.au`).trim().toLowerCase(),
      name: name.trim(),
      passwordHash,
      officerNo: officerNo ? officerNo.trim() : undefined,
      role: role || ROLES.OFFICER,
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: newUser
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user status or details
// @route   PUT /api/users/:id
// @access  Admin Only
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, officerNo, role, isActive, password } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (name) user.name = name.trim();
    if (email) user.email = email.trim().toLowerCase();
    if (officerNo !== undefined) user.officerNo = officerNo ? officerNo.trim() : undefined;
    if (role && [ROLES.ADMIN, ROLES.LEADER, ROLES.OFFICER].includes(role)) user.role = role;
    if (typeof isActive === 'boolean') user.isActive = isActive;
    if (password) {
      user.passwordHash = await User.hashPassword(password);
    }

    await user.save();

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Admin Only
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent deleting oneself
    if (req.user && req.user._id.toString() === id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own administrative account.'
      });
    }

    let deleted;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      deleted = await User.findById(id);
    } else {
      deleted = await User.findOne({ officerNo: id });
    }

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Clean up avatar if present
    if (deleted.avatarKey) {
      await r2Service.deleteFile(deleted.avatarKey);
      await Attachment.deleteOne({ key: deleted.avatarKey });
    }

    await deleted.deleteOne();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProfile,
  uploadProfileAvatar,
  deleteProfileAvatar,
  getUsers,
  createUser,
  updateUser,
  deleteUser
};
