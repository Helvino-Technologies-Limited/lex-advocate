const express = require('express');
const multer = require('multer');
const path = require('path');
const { v2: cloudinary } = require('cloudinary');
const { Readable } = require('stream');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { query } = require('../database/connection');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/apiResponse');
const { getPagination, buildPaginationMeta } = require('../utils/helpers');
const logger = require('../utils/logger');

// ── Cloudinary config ─────────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const cloudinaryConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET &&
  process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name'
);

// ── Multer: memory storage (works on any host, no disk needed) ────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    const allowed = /pdf|doc|docx|xls|xlsx|jpg|jpeg|png|gif|mp4|mp3|txt|csv/;
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    allowed.test(ext) ? cb(null, true) : cb(new Error('File type not allowed'));
  }
});

// Helper: upload buffer to Cloudinary
function uploadToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
    Readable.from(buffer).pipe(stream);
  });
}

// ── GET /api/documents ────────────────────────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  const { page, limit, offset } = getPagination(req.query.page, req.query.limit);
  const { case_id, client_id, category } = req.query;
  try {
    let where = 'WHERE d.tenant_id = $1';   // ← explicit table alias fixes ambiguity
    const params = [req.user.tenantId];
    let i = 2;
    if (case_id)   { where += ` AND d.case_id = $${i++}`;   params.push(case_id); }
    if (client_id) { where += ` AND d.client_id = $${i++}`; params.push(client_id); }
    if (category)  { where += ` AND d.category = $${i++}`;  params.push(category); }

    const countResult = await query(
      `SELECT COUNT(*) FROM documents d ${where}`,
      params
    );
    const result = await query(
      `SELECT d.*, u.first_name, u.last_name
       FROM documents d
       LEFT JOIN users u ON d.uploaded_by = u.id
       ${where}
       ORDER BY d.created_at DESC
       LIMIT $${i} OFFSET $${i + 1}`,
      [...params, limit, offset]
    );

    return paginatedResponse(res, result.rows, buildPaginationMeta(countResult.rows[0].count, page, limit));
  } catch (error) {
    logger.error('Get documents error:', error);
    return errorResponse(res, 'Failed to get documents', 500);
  }
});

// ── POST /api/documents/upload ────────────────────────────────────────────────
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  if (!req.file) return errorResponse(res, 'No file uploaded', 400);

  const { title, description, caseId, clientId, category, tags } = req.body;
  const ext = path.extname(req.file.originalname).toLowerCase().slice(1).toUpperCase();

  try {
    let filePath = null;
    let fileUrl  = null;

    if (cloudinaryConfigured) {
      // ── Upload to Cloudinary ──────────────────────────────────────────────
      const folder = `lex-advocate/${req.user.tenantId}`;
      const resourceType = ['mp4', 'mp3'].includes(ext.toLowerCase()) ? 'video' : 'raw';

      const result = await uploadToCloudinary(req.file.buffer, {
        folder,
        resource_type: resourceType,
        public_id: `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`,
        use_filename: true,
        unique_filename: true,
      });

      filePath = result.secure_url;
      fileUrl  = result.secure_url;
    } else {
      // ── Fallback: store as base64 data URL (no external service needed) ───
      // Note: not ideal for large files but works without any cloud config
      const base64 = req.file.buffer.toString('base64');
      filePath = `data:${req.file.mimetype};base64,${base64}`;
      fileUrl  = filePath;
      logger.warn('Cloudinary not configured — storing file as base64. Configure Cloudinary for production use.');
    }

    const result = await query(
      `INSERT INTO documents
         (tenant_id, case_id, client_id, title, description,
          file_name, file_path, file_size, file_type, mime_type,
          category, tags, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        req.user.tenantId,
        caseId || null,
        clientId || null,
        title || req.file.originalname,
        description || null,
        req.file.originalname,
        filePath,
        req.file.size,
        ext,
        req.file.mimetype,
        category || 'general',
        tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        req.user.id,
      ]
    );

    return successResponse(res, { ...result.rows[0], url: fileUrl }, 'Document uploaded', 201);
  } catch (error) {
    logger.error('Upload error:', error);
    return errorResponse(res, 'Failed to save document', 500);
  }
});

// ── DELETE /api/documents/:id ─────────────────────────────────────────────────
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const doc = await query(
      'SELECT * FROM documents WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.user.tenantId]
    );
    if (!doc.rows.length) return errorResponse(res, 'Document not found', 404);

    const filePath = doc.rows[0].file_path;

    // Delete from Cloudinary if it's a Cloudinary URL
    if (cloudinaryConfigured && filePath && filePath.startsWith('https://res.cloudinary.com')) {
      try {
        // Extract public_id from URL
        const parts = filePath.split('/');
        const uploadIdx = parts.indexOf('upload');
        if (uploadIdx !== -1) {
          // Strip version segment (v12345) and extension
          const publicIdParts = parts.slice(uploadIdx + 2); // skip 'upload' and version
          const publicId = publicIdParts.join('/').replace(/\.[^/.]+$/, '');
          await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
        }
      } catch (cloudErr) {
        logger.warn('Cloudinary delete failed (continuing):', cloudErr.message);
      }
    }

    await query('DELETE FROM documents WHERE id = $1', [req.params.id]);
    return successResponse(res, null, 'Document deleted');
  } catch (error) {
    logger.error('Delete document error:', error);
    return errorResponse(res, 'Failed to delete document', 500);
  }
});

module.exports = router;
