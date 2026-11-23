const Attachment = require('../models/Attachment');
const Report = require('../models/Report');
const User = require('../models/User');
const r2Service = require('../services/r2Service');

/**
 * Upload single attachment (sign photo, profile avatar, condition plate, or site doc)
 */
const uploadSingle = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded or unsupported file format'
      });
    }

    const {
      reportRef,
      category = 'sign_photo',
      isPublic: isPublicParam = 'false',
      notes = ''
    } = req.body;

    const isPublic = isPublicParam === 'true' || isPublicParam === true;
    const userId = req.user ? req.user._id : null;
    const normalizedRef = reportRef ? reportRef.trim().toUpperCase() : null;

    // Determine organized folder path:
    // e.g. users/{userId}/profile/... or reports/{reportRef}/images/...
    let folder = 'documents';
    if (category === 'profile_avatar' && userId) {
      folder = `users/${userId}/profile`;
    } else if (category === 'sign_photo' && normalizedRef) {
      folder = `reports/${normalizedRef}/images`;
    } else if (category === 'condition_plate' && normalizedRef) {
      folder = `reports/${normalizedRef}/plates`;
    }

    // 1. Upload binary to Cloudflare R2 (or local fallback)
    const uploaded = await r2Service.uploadFile({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      folder,
      isPublic,
      metadata: {
        uploadedBy: userId ? userId.toString() : 'anonymous',
        reportRef: normalizedRef || 'none',
        category
      }
    });

    // 2. Persist metadata in MongoDB Atlas
    const attachment = await Attachment.create({
      key: uploaded.key,
      filename: uploaded.filename,
      mimeType: uploaded.mimeType,
      size: uploaded.size,
      url: uploaded.url,
      isPublic,
      storageProvider: uploaded.storageProvider,
      reportRef: normalizedRef,
      category,
      uploadedBy: userId,
      metadata: {
        notes,
        clientIp: req.ip
      }
    });

    // 3. Generate accessible viewing URL
    const viewUrl = await r2Service.getImageViewingUrl(attachment.key, 3600, isPublic);

    // 4. Update Profile if category is profile_avatar
    if (category === 'profile_avatar' && userId) {
      const user = await User.findById(userId);
      if (user) {
        const oldAvatarKey = user.avatarKey;
        user.avatar = viewUrl;
        user.avatarKey = uploaded.key;
        user.avatarAttachmentId = attachment._id;
        await user.save();

        // Safe cleanup: Delete old R2 object only after MongoDB update has succeeded
        if (oldAvatarKey && oldAvatarKey !== uploaded.key) {
          await r2Service.deleteFile(oldAvatarKey);
          await Attachment.deleteOne({ key: oldAvatarKey });
        }
      }
    }

    // 5. Update Report if reportRef is specified
    if (normalizedRef) {
      const report = await Report.findOne({
        $or: [{ ref: normalizedRef }, { code: normalizedRef }]
      });

      if (report) {
        attachment.reportId = report._id;
        await attachment.save();

        if (!report.photos) report.photos = [];
        if (!report.photoKeys) report.photoKeys = [];
        if (!report.attachments) report.attachments = [];

        // Save stable key and viewing URL
        report.photoKeys.push(attachment.key);
        report.photos.push(viewUrl || attachment.key);
        report.attachments.push(attachment._id);
        report.photoCount = report.photos.length;
        await report.save();
      }
    }

    res.status(201).json({
      success: true,
      message: 'File successfully uploaded to Cloudflare R2',
      attachment: {
        id: attachment._id,
        key: attachment.key,
        filename: attachment.filename,
        url: attachment.url,
        viewUrl,
        size: attachment.size,
        mimeType: attachment.mimeType,
        category: attachment.category,
        reportRef: attachment.reportRef,
        isPublic: attachment.isPublic,
        storageProvider: attachment.storageProvider,
        createdAt: attachment.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get attachment metadata by ID with fresh authorized viewing URL
 */
const getAttachmentById = async (req, res, next) => {
  try {
    const attachment = await Attachment.findById(req.params.id);
    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found'
      });
    }

    // Private attachment authorization check
    if (!attachment.isPublic) {
      const isOwner = req.user && attachment.uploadedBy && attachment.uploadedBy.equals(req.user._id);
      const isAdmin = req.user && req.user.role === 'admin';
      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You do not have permission to access this private file.'
        });
      }
    }

    const viewUrl = await r2Service.getImageViewingUrl(attachment.key, 3600, attachment.isPublic);
    const downloadUrl = await r2Service.getAuthorizedDownloadUrl(attachment.key, attachment.filename, 3600);

    res.json({
      success: true,
      attachment: {
        ...attachment.toObject(),
        viewUrl,
        downloadUrl
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Stream or redirect directly to view attachment
 */
const viewAttachmentDirect = async (req, res, next) => {
  try {
    const attachment = await Attachment.findById(req.params.id);
    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found'
      });
    }

    // If public and custom public domain is configured, redirect
    if (attachment.isPublic && process.env.R2_PUBLIC_DOMAIN) {
      return res.redirect(`${process.env.R2_PUBLIC_DOMAIN.replace(/\/$/, '')}/${attachment.key}`);
    }

    // Stream file contents securely
    const { stream, contentType, contentLength } = await r2Service.getFileStream(attachment.key);
    res.setHeader('Content-Type', contentType || attachment.mimeType);
    if (contentLength) res.setHeader('Content-Length', contentLength);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

/**
 * List all attachments for a specific report
 */
const getAttachmentsByReport = async (req, res, next) => {
  try {
    const reportRef = req.params.reportRef.trim().toUpperCase();
    const attachments = await Attachment.find({ reportRef }).sort({ createdAt: -1 });

    const items = await Promise.all(
      attachments.map(async (att) => {
        const viewUrl = await r2Service.getImageViewingUrl(att.key, 3600, att.isPublic);
        return {
          ...att.toObject(),
          viewUrl
        };
      })
    );

    res.json({
      success: true,
      count: items.length,
      attachments: items
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an attachment from Cloudflare R2 and MongoDB
 */
const deleteAttachment = async (req, res, next) => {
  try {
    const attachment = await Attachment.findById(req.params.id);
    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found'
      });
    }

    // Access check: only uploader or admin can delete
    const isOwner = req.user && attachment.uploadedBy && attachment.uploadedBy.equals(req.user._id);
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: only the uploader or an administrator can delete this attachment'
      });
    }

    // 1. Delete object from Cloudflare R2
    await r2Service.deleteFile(attachment.key);

    // 2. If attached to a user avatar, clear avatar references
    if (attachment.category === 'profile_avatar' && attachment.uploadedBy) {
      await User.findByIdAndUpdate(attachment.uploadedBy, {
        $set: { avatar: '', avatarKey: '', avatarAttachmentId: null }
      });
    }

    // 3. If linked to report, clean up report.photos and report.photoKeys
    if (attachment.reportRef) {
      const report = await Report.findOne({
        $or: [{ ref: attachment.reportRef }, { code: attachment.reportRef }]
      });
      if (report) {
        if (report.photos) {
          report.photos = report.photos.filter((p) => p !== attachment.key && !p.includes(attachment.key));
        }
        if (report.photoKeys) {
          report.photoKeys = report.photoKeys.filter((k) => k !== attachment.key);
        }
        if (report.attachments) {
          report.attachments = report.attachments.filter((a) => !a.equals(attachment._id));
        }
        report.photoCount = report.photos.length;
        await report.save();
      }
    }

    // 4. Delete database record
    await Attachment.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Attachment successfully deleted from Cloudflare R2 and database'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadSingle,
  getAttachmentById,
  viewAttachmentDirect,
  getAttachmentsByReport,
  deleteAttachment
};
