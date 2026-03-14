const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { query } = require('../database/connection');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/apiResponse');
const { getPagination, buildPaginationMeta } = require('../utils/helpers');

// Local storage (use S3 in production)
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${req.user.tenantId}-${unique}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = /pdf|doc|docx|xls|xlsx|jpg|jpeg|png|gif|mp4|mp3|txt|csv/;
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    allowed.test(ext) ? cb(null, true) : cb(new Error('File type not allowed'));
  }
});

router.get('/', authenticate, async (req, res) => {
  const { page, limit, offset } = getPagination(req.query.page, req.query.limit);
  const { case_id, client_id, category } = req.query;
  try {
    let where = 'WHERE tenant_id = $1';
    const params = [req.user.tenantId];
    let i = 2;
    if (case_id) { where += ` AND case_id = $${i++}`; params.push(case_id); }
    if (client_id) { where += ` AND client_id = $${i++}`; params.push(client_id); }
    if (category) { where += ` AND category = $${i++}`; params.push(category); }

    const countResult = await query(`SELECT COUNT(*) FROM documents ${where}`, params);
    const result = await query(
      `SELECT d.*, u.first_name, u.last_name FROM documents d
       LEFT JOIN users u ON d.uploaded_by = u.id
       ${where} ORDER BY d.created_at DESC LIMIT $${i} OFFSET $${i+1}`,
      [...params, limit, offset]
    );
    return paginatedResponse(res, result.rows, buildPaginationMeta(countResult.rows[0].count, page, limit));
  } catch (error) {
    return errorResponse(res, 'Failed to get documents', 500);
  }
});

router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  if (!req.file) return errorResponse(res, 'No file uploaded', 400);
  const { title, description, caseId, clientId, category, tags } = req.body;
  try {
    const filePath = `/uploads/${req.file.filename}`;
    const result = await query(
      `INSERT INTO documents (tenant_id, case_id, client_id, title, description, file_name, file_path, file_size, file_type, mime_type, category, tags, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [req.user.tenantId, caseId || null, clientId || null,
       title || req.file.originalname, description,
       req.file.originalname, filePath, req.file.size,
       path.extname(req.file.originalname).slice(1).toUpperCase(),
       req.file.mimetype, category || 'general',
       tags ? tags.split(',') : [], req.user.id]
    );
    return successResponse(res, result.rows[0], 'Document uploaded', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to save document', 500);
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const doc = await query('SELECT * FROM documents WHERE id = $1 AND tenant_id = $2', [req.params.id, req.user.tenantId]);
    if (!doc.rows.length) return errorResponse(res, 'Document not found', 404);

    const filePath = path.join(__dirname, '../../', doc.rows[0].file_path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await query('DELETE FROM documents WHERE id = $1', [req.params.id]);
    return successResponse(res, null, 'Document deleted');
  } catch (error) {
    return errorResponse(res, 'Failed to delete document', 500);
  }
});

module.exports = router;
