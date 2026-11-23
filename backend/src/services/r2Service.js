const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class R2Service {
  constructor() {
    this.accountId = process.env.R2_ACCOUNT_ID;
    this.accessKeyId = process.env.R2_ACCESS_KEY_ID;
    this.secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    this.bucketName = process.env.R2_BUCKET_NAME || 'signly';
    this.publicDomain = process.env.R2_PUBLIC_DOMAIN;
    this.endpoint =
      process.env.R2_ENDPOINT ||
      (this.accountId && this.accountId !== 'your_cloudflare_account_id'
        ? `https://${this.accountId}.r2.cloudflarestorage.com`
        : null);

    this.isConfigured = Boolean(
      this.accessKeyId &&
      this.secretAccessKey &&
      this.endpoint &&
      this.accessKeyId !== 'your_r2_access_key_id'
    );

    if (this.isConfigured) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: this.endpoint,
        credentials: {
          accessKeyId: this.accessKeyId,
          secretAccessKey: this.secretAccessKey
        }
      });
      console.log(`Cloudflare R2 storage initialized (Endpoint: ${this.endpoint}, Bucket: ${this.bucketName})`);
    } else {
      this.client = null;
      this.localUploadDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(this.localUploadDir)) {
        fs.mkdirSync(this.localUploadDir, { recursive: true });
      }
      console.log('Cloudflare R2 credentials not configured. Local fallback storage active in ./uploads');
    }
  }

  /**
   * Check if Cloudflare R2 is configured and active
   */
  hasR2Configured() {
    return this.isConfigured && this.client !== null;
  }

  /**
   * Generate an organized, unique, and unpredictable object key
   * e.g. users/{userId}/profile/{uniqueFileName}
   *      reports/{reportId}/images/{uniqueFileName}
   */
  generateKey(originalFilename, folder = 'documents') {
    const ext = path.extname(originalFilename).toLowerCase() || '.jpg';
    const cleanBase = path
      .basename(originalFilename, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 32);
    const randomHex = crypto.randomBytes(8).toString('hex');
    const timestamp = Date.now();
    const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
    return `${cleanFolder}/${timestamp}-${randomHex}-${cleanBase}${ext}`;
  }

  /**
   * Upload file buffer to Cloudflare R2 (or local fallback)
   */
  async uploadFile({
    buffer,
    originalname,
    mimetype,
    folder = 'documents',
    isPublic = false,
    metadata = {}
  }) {
    const key = this.generateKey(originalname, folder);

    if (this.hasR2Configured()) {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
        Metadata: {
          originalName: encodeURIComponent(originalname),
          isPublic: String(isPublic),
          ...metadata
        }
      });

      await this.client.send(command);

      // Stable delivery URL (only if public domain is enabled and file is marked public)
      let publicUrl = '';
      if (isPublic && this.publicDomain) {
        publicUrl = `${this.publicDomain.replace(/\/$/, '')}/${key}`;
      }

      return {
        key,
        url: publicUrl,
        size: buffer.length,
        mimeType: mimetype,
        filename: originalname,
        storageProvider: 'r2',
        isPublic
      };
    } else {
      // Local fallback
      const localRelPath = key.replace(/\//g, '_');
      const localFilePath = path.join(this.localUploadDir, localRelPath);
      await fs.promises.writeFile(localFilePath, buffer);

      const url = `/uploads/${localRelPath}`;
      return {
        key,
        url,
        size: buffer.length,
        mimeType: mimetype,
        filename: originalname,
        storageProvider: 'local',
        isPublic
      };
    }
  }

  /**
   * Generate an accessible viewing URL for images
   * - If public domain is configured & object is public, returns public URL
   * - Otherwise, returns short-lived authorized presigned URL (e.g. 1 hour)
   */
  async getImageViewingUrl(key, expiresInSeconds = 3600, isPublic = false) {
    if (!key) return '';

    // If local fallback, return local URL
    if (!this.hasR2Configured()) {
      return `/uploads/${key.replace(/\//g, '_')}`;
    }

    if (isPublic && this.publicDomain) {
      return `${this.publicDomain.replace(/\/$/, '')}/${key}`;
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });
      return await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
    } catch (err) {
      console.warn(`Failed to generate presigned viewing URL for key: ${key}`, err.message);
      return '';
    }
  }

  /**
   * Generate an authorized download URL forcing attachment download
   */
  async getAuthorizedDownloadUrl(key, originalFilename = 'download', expiresInSeconds = 3600) {
    if (!key) return '';

    if (!this.hasR2Configured()) {
      return `/uploads/${key.replace(/\//g, '_')}`;
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ResponseContentDisposition: `attachment; filename="${encodeURIComponent(originalFilename)}"`
      });
      return await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
    } catch (err) {
      console.warn(`Failed to generate presigned download URL for key: ${key}`, err.message);
      return '';
    }
  }

  /**
   * Delete an object from Cloudflare R2 (or local fallback)
   */
  async deleteFile(key) {
    if (!key) return true;

    if (this.hasR2Configured()) {
      try {
        const command = new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key
        });
        await this.client.send(command);
        return true;
      } catch (err) {
        console.warn(`Error deleting R2 object ${key}:`, err.message);
        return false;
      }
    } else {
      const localFilePath = path.join(this.localUploadDir, key.replace(/\//g, '_'));
      if (fs.existsSync(localFilePath)) {
        await fs.promises.unlink(localFilePath).catch(() => {});
      }
      return true;
    }
  }

  /**
   * Retrieve file metadata (size, contentType, etag, custom metadata)
   */
  async getFileMetadata(key) {
    if (!key) throw new Error('Key is required');

    if (this.hasR2Configured()) {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });
      const response = await this.client.send(command);
      return {
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified,
        etag: response.ETag,
        metadata: response.Metadata
      };
    } else {
      const localFilePath = path.join(this.localUploadDir, key.replace(/\//g, '_'));
      if (!fs.existsSync(localFilePath)) {
        throw new Error('File not found');
      }
      const stat = await fs.promises.stat(localFilePath);
      return {
        contentType: 'application/octet-stream',
        contentLength: stat.size,
        lastModified: stat.mtime,
        etag: `"${stat.ino}-${stat.size}-${stat.mtimeMs}"`,
        metadata: {}
      };
    }
  }

  /**
   * Get file stream for proxying / secure authenticated streaming
   */
  async getFileStream(key) {
    if (!key) throw new Error('Key is required');

    if (this.hasR2Configured()) {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });
      const response = await this.client.send(command);
      return {
        stream: response.Body,
        contentType: response.ContentType,
        contentLength: response.ContentLength
      };
    } else {
      const localFilePath = path.join(this.localUploadDir, key.replace(/\//g, '_'));
      if (!fs.existsSync(localFilePath)) {
        throw new Error('File not found');
      }
      const stat = await fs.promises.stat(localFilePath);
      return {
        stream: fs.createReadStream(localFilePath),
        contentLength: stat.size
      };
    }
  }
}

const r2Service = new R2Service();
module.exports = r2Service;
