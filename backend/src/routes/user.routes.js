const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { query } = require('../database/connection');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/apiResponse');
const { getPagination, buildPaginationMeta } = require('../utils/helpers');
const { sendEmail, welcomeEmailTemplate } = require('../utils/email');
const logger = require('../utils/logger');

// Get all users in tenant (any authenticated user can list colleagues)
router.get('/', authenticate, async (req, res) => {
  const { page, limit, offset } = getPagination(req.query.page, req.query.limit);
  const { role, search, is_active } = req.query;
  try {
    let whereClause = 'WHERE tenant_id = $1';
    const params = [req.user.tenantId];
    let paramIdx = 2;

    if (role) { whereClause += ` AND role = $${paramIdx++}`; params.push(role); }
    if (is_active !== undefined) { whereClause += ` AND is_active = $${paramIdx++}`; params.push(is_active === 'true'); }
    if (search) {
      whereClause += ` AND (first_name ILIKE $${paramIdx} OR last_name ILIKE $${paramIdx} OR email ILIKE $${paramIdx})`;
      params.push(`%${search}%`); paramIdx++;
    }

    const countResult = await query(`SELECT COUNT(*) FROM users ${whereClause}`, params);
    const result = await query(
      `SELECT id, email, first_name, last_name, phone, role, specialization, bar_number,
              avatar_url, is_active, is_verified, last_login, created_at
       FROM users ${whereClause} ORDER BY created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset]
    );

    return paginatedResponse(res, result.rows, buildPaginationMeta(countResult.rows[0].count, page, limit));
  } catch (error) {
    return errorResponse(res, 'Failed to get users', 500);
  }
});

// Create user (admin only)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { email, password, firstName, lastName, phone, role, specialization, barNumber } = req.body;
  try {
    // Check tenant user limit
    const countResult = await query('SELECT COUNT(*) FROM users WHERE tenant_id = $1 AND is_active = true', [req.user.tenantId]);
    const tenantResult = await query('SELECT max_users FROM tenants WHERE id = $1', [req.user.tenantId]);
    if (parseInt(countResult.rows[0].count) >= tenantResult.rows[0].max_users) {
      return errorResponse(res, 'User limit reached for your plan. Please upgrade.', 403);
    }

    const passwordHash = await bcrypt.hash(password || 'TempPass@2024!', 12);
    const result = await query(
      `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, phone, role, specialization, bar_number, is_active, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, true) RETURNING id, email, first_name, last_name, role`,
      [req.user.tenantId, email, passwordHash, firstName, lastName, phone, role || 'advocate', specialization, barNumber]
    );

    // Send welcome email
    sendEmail({
      to: email,
      subject: 'Your Lex Advocate Account',
      html: welcomeEmailTemplate(`${firstName} ${lastName}`, `${process.env.FRONTEND_URL}/login`)
    }).catch(err => logger.error('Welcome email error:', err));

    return successResponse(res, result.rows[0], 'User created successfully', 201);
  } catch (error) {
    if (error.code === '23505') return errorResponse(res, 'Email already exists in this firm', 409);
    return errorResponse(res, 'Failed to create user', 500);
  }
});

// Get single user
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, email, first_name, last_name, phone, role, specialization, bar_number,
              avatar_url, bio, is_active, is_verified, last_login, notification_preferences, created_at
       FROM users WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.user.tenantId]
    );
    if (!result.rows.length) return errorResponse(res, 'User not found', 404);
    return successResponse(res, result.rows[0]);
  } catch (error) {
    return errorResponse(res, 'Failed to get user', 500);
  }
});

// Update user
router.patch('/:id', authenticate, authorize('admin'), async (req, res) => {
  const { firstName, lastName, phone, role, specialization, barNumber, isActive } = req.body;
  try {
    const result = await query(
      `UPDATE users SET first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name),
       phone = COALESCE($3, phone), role = COALESCE($4, role),
       specialization = COALESCE($5, specialization), bar_number = COALESCE($6, bar_number),
       is_active = COALESCE($7, is_active)
       WHERE id = $8 AND tenant_id = $9 RETURNING id, email, first_name, last_name, role, is_active`,
      [firstName, lastName, phone, role, specialization, barNumber, isActive, req.params.id, req.user.tenantId]
    );
    if (!result.rows.length) return errorResponse(res, 'User not found', 404);
    return successResponse(res, result.rows[0], 'User updated');
  } catch (error) {
    return errorResponse(res, 'Failed to update user', 500);
  }
});

module.exports = router;
