const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../middleware/authMiddleware');
const {
  uploadSingle,
  getAttachmentById,
  viewAttachmentDirect,
  getAttachmentsByReport,
  deleteAttachment
} = require('../controllers/uploadController');

const router = express.Router();

// Memory storage for multer so bytes stream directly to Cloudflare R2
const storage = multer.memoryStorage();

// Strict MIME type validation
const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'application/pdf'
];

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(`Unsupported file type: ${file.mimetype}. Allowed types: JPEG, PNG, WebP, SVG, PDF`),
      false
    );
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter
});

// Dedicated rate limiter for upload endpoint
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 uploads per IP per 15 minutes
  message: {
    success: false,
    message: 'Upload rate limit reached. Please wait a few moments before uploading more files.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Upload a single file (protected)
router.post('/', uploadLimiter, authenticate, upload.single('file'), uploadSingle);

// Direct authenticated view or stream endpoint (supports ?token= query parameter)
router.get('/:id/view', authenticate, viewAttachmentDirect);

// Get all attachments for a report
router.get('/report/:reportRef', authenticate, getAttachmentsByReport);

// Get single attachment metadata and signed viewing URL
router.get('/:id', authenticate, getAttachmentById);

// Delete attachment (uploader or admin)
router.delete('/:id', authenticate, deleteAttachment);

module.exports = router;
