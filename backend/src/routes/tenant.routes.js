const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { query } = require('../database/connection');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// Get current tenant info
router.get('/current', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT t.*, s.plan as sub_plan, s.status as sub_status, s.expires_at,
              (SELECT COUNT(*) FROM users WHERE tenant_id = t.id AND is_active = true) as user_count,
              (SELECT COUNT(*) FROM cases WHERE tenant_id = t.id) as case_count
       FROM tenants t LEFT JOIN subscriptions s ON t.id = s.tenant_id WHERE t.id = $1`,
      [req.user.tenantId]
    );
    if (!result.rows.length) return errorResponse(res, 'Tenant not found', 404);
    return successResponse(res, result.rows[0]);
  } catch (error) {
    return errorResponse(res, 'Failed to get tenant', 500);
  }
});

// Update tenant settings
router.patch('/settings', authenticate, authorize('admin'), async (req, res) => {
  const { name, phone, address, city, website, branding, settings } = req.body;
  try {
    const result = await query(
      `UPDATE tenants SET name = COALESCE($1, name), phone = COALESCE($2, phone),
       address = COALESCE($3, address), city = COALESCE($4, city),
       website = COALESCE($5, website),
       branding = COALESCE($6, branding), settings = COALESCE($7, settings)
       WHERE id = $8 RETURNING *`,
      [name, phone, address, city, website,
       branding ? JSON.stringify(branding) : null,
       settings ? JSON.stringify(settings) : null,
       req.user.tenantId]
    );
    return successResponse(res, result.rows[0], 'Settings updated');
  } catch (error) {
    return errorResponse(res, 'Failed to update settings', 500);
  }
});

// Get audit logs
router.get('/audit-logs', authenticate, authorize('admin'), async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;
  try {
    const result = await query(
      `SELECT al.*, u.first_name, u.last_name, u.email FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.tenant_id = $1 ORDER BY al.created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.tenantId, limit, offset]
    );
    const count = await query('SELECT COUNT(*) FROM audit_logs WHERE tenant_id = $1', [req.user.tenantId]);
    return successResponse(res, { logs: result.rows, total: parseInt(count.rows[0].count) });
  } catch (error) {
    return errorResponse(res, 'Failed to get audit logs', 500);
  }
});

module.exports = router;
