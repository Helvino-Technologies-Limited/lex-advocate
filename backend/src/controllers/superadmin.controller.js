const bcrypt = require('bcryptjs');
const { query } = require('../database/connection');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { logAudit } = require('../middleware/audit');
const logger = require('../utils/logger');

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
}

const PLAN_LIMITS = {
  free:         { max_users: 5,   max_cases: 50,    max_storage: 5 },
  starter:      { max_users: 10,  max_cases: 200,   max_storage: 20 },
  professional: { max_users: 20,  max_cases: 500,   max_storage: 50 },
  enterprise:   { max_users: 999, max_cases: 99999, max_storage: 500 },
};

// ── Platform Stats ────────────────────────────────────────────────────────────

exports.getStats = async (req, res) => {
  try {
    const [tenantStats, userStats, caseStats] = await Promise.all([
      query(`SELECT
        COUNT(*)                                                      AS total,
        COUNT(*) FILTER (WHERE is_active = true)                     AS active,
        COUNT(*) FILTER (WHERE subscription_status = 'trial')        AS trial,
        COUNT(*) FILTER (WHERE subscription_status = 'suspended')    AS suspended,
        COUNT(*) FILTER (WHERE subscription_status = 'active')       AS paid
      FROM tenants`),
      query(`SELECT COUNT(*) AS total FROM users WHERE tenant_id IS NOT NULL`),
      query(`SELECT COUNT(*) AS total FROM cases`),
    ]);

    return successResponse(res, {
      tenants: tenantStats.rows[0],
      totalUsers: parseInt(userStats.rows[0].total),
      totalCases: parseInt(caseStats.rows[0].total),
    });
  } catch (error) {
    logger.error('getStats error:', error);
    return errorResponse(res, 'Failed to get stats', 500);
  }
};

// ── Tenants ───────────────────────────────────────────────────────────────────

exports.listTenants = async (req, res) => {
  const { page = 1, limit = 20, search = '', status } = req.query;
  const offset = (page - 1) * limit;

  try {
    const params = [];
    let where = 'WHERE 1=1';

    if (search) {
      params.push(`%${search}%`);
      where += ` AND (t.name ILIKE $${params.length} OR t.email ILIKE $${params.length})`;
    }
    if (status) {
      params.push(status);
      where += ` AND t.subscription_status = $${params.length}`;
    }

    const countResult = await query(`SELECT COUNT(*) FROM tenants t ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(parseInt(limit), parseInt(offset));
    const result = await query(`
      SELECT t.*,
        (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) AS user_count,
        (SELECT COUNT(*) FROM cases c WHERE c.tenant_id = t.id) AS case_count
      FROM tenants t ${where}
      ORDER BY t.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    return successResponse(res, {
      tenants: result.rows,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    logger.error('listTenants error:', error);
    return errorResponse(res, 'Failed to list tenants', 500);
  }
};

exports.getTenant = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(`
      SELECT t.*,
        (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id)   AS user_count,
        (SELECT COUNT(*) FROM cases c WHERE c.tenant_id = t.id)   AS case_count,
        (SELECT COUNT(*) FROM clients cl WHERE cl.tenant_id = t.id) AS client_count
      FROM tenants t WHERE t.id = $1
    `, [id]);
    if (!result.rows.length) return errorResponse(res, 'Tenant not found', 404);
    return successResponse(res, result.rows[0]);
  } catch (error) {
    return errorResponse(res, 'Failed to get tenant', 500);
  }
};

exports.createTenant = async (req, res) => {
  const {
    name, email, phone,
    adminFirstName, adminLastName, adminPassword,
    plan = 'professional'
  } = req.body;

  if (!name || !email || !adminFirstName || !adminLastName) {
    return errorResponse(res, 'name, email, adminFirstName, adminLastName are required', 400);
  }

  try {
    const slug = slugify(name);
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.professional;

    const tenantResult = await query(`
      INSERT INTO tenants (name, slug, email, phone, subscription_plan, subscription_status,
                           max_users, max_cases, max_storage_gb, trial_ends_at)
      VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, $8, NOW() + INTERVAL '365 days')
      RETURNING *
    `, [name, slug, email, phone || null, plan, limits.max_users, limits.max_cases, limits.max_storage]);

    const tenant = tenantResult.rows[0];
    const password = adminPassword || 'TempPass@2024!';
    const passwordHash = await bcrypt.hash(password, 12);

    const userResult = await query(`
      INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, phone,
                         role, is_active, is_verified, admin_set_password)
      VALUES ($1, $2, $3, $4, $5, $6, 'admin', true, true, $7)
      RETURNING id, email, first_name, last_name, role
    `, [tenant.id, email, passwordHash, adminFirstName, adminLastName, phone || null, password]);

    await query(`INSERT INTO subscriptions (tenant_id, plan, status) VALUES ($1, $2, 'active')`, [tenant.id, plan]);

    await logAudit({
      tenantId: null, userId: req.user.id,
      action: 'SUPERADMIN_CREATE_TENANT', resourceType: 'tenant', resourceId: tenant.id, req
    });

    return successResponse(res, {
      tenant,
      adminUser: userResult.rows[0],
      adminPassword: password
    }, 'Tenant created successfully', 201);
  } catch (error) {
    logger.error('createTenant error:', error);
    if (error.code === '23505') return errorResponse(res, 'Email already registered', 409);
    return errorResponse(res, 'Failed to create tenant', 500);
  }
};

exports.updateTenant = async (req, res) => {
  const { id } = req.params;
  const { name, phone, address, city, subscriptionPlan, maxUsers, maxCases } = req.body;
  try {
    const result = await query(`
      UPDATE tenants SET
        name = COALESCE($1, name),
        phone = COALESCE($2, phone),
        address = COALESCE($3, address),
        city = COALESCE($4, city),
        subscription_plan = COALESCE($5, subscription_plan),
        max_users = COALESCE($6, max_users),
        max_cases = COALESCE($7, max_cases)
      WHERE id = $8 RETURNING *
    `, [name, phone, address, city, subscriptionPlan, maxUsers, maxCases, id]);

    if (!result.rows.length) return errorResponse(res, 'Tenant not found', 404);
    await logAudit({ tenantId: id, userId: req.user.id, action: 'SUPERADMIN_UPDATE_TENANT', resourceType: 'tenant', resourceId: id, req });
    return successResponse(res, result.rows[0], 'Tenant updated');
  } catch (error) {
    return errorResponse(res, 'Failed to update tenant', 500);
  }
};

exports.activateTenant = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(
      `UPDATE tenants SET is_active = true, subscription_status = 'active'
       WHERE id = $1 RETURNING id, name, is_active, subscription_status`,
      [id]
    );
    if (!result.rows.length) return errorResponse(res, 'Tenant not found', 404);
    await logAudit({ tenantId: id, userId: req.user.id, action: 'SUPERADMIN_ACTIVATE_TENANT', resourceType: 'tenant', resourceId: id, req });
    return successResponse(res, result.rows[0], 'Tenant activated');
  } catch (error) {
    return errorResponse(res, 'Failed to activate tenant', 500);
  }
};

exports.deactivateTenant = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(
      `UPDATE tenants SET is_active = false, subscription_status = 'suspended'
       WHERE id = $1 RETURNING id, name, is_active, subscription_status`,
      [id]
    );
    if (!result.rows.length) return errorResponse(res, 'Tenant not found', 404);
    await logAudit({ tenantId: id, userId: req.user.id, action: 'SUPERADMIN_DEACTIVATE_TENANT', resourceType: 'tenant', resourceId: id, req });
    return successResponse(res, result.rows[0], 'Tenant deactivated');
  } catch (error) {
    return errorResponse(res, 'Failed to deactivate tenant', 500);
  }
};

exports.deleteTenant = async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await query('SELECT id, name FROM tenants WHERE id = $1', [id]);
    if (!existing.rows.length) return errorResponse(res, 'Tenant not found', 404);

    await query('DELETE FROM tenants WHERE id = $1', [id]);
    await logAudit({ tenantId: null, userId: req.user.id, action: 'SUPERADMIN_DELETE_TENANT', resourceType: 'tenant', resourceId: id, req });
    return successResponse(res, null, `Tenant "${existing.rows[0].name}" deleted`);
  } catch (error) {
    logger.error('deleteTenant error:', error);
    return errorResponse(res, 'Failed to delete tenant', 500);
  }
};

// ── Tenant Users ──────────────────────────────────────────────────────────────

exports.listTenantUsers = async (req, res) => {
  const { id: tenantId } = req.params;
  try {
    const result = await query(`
      SELECT id, email, first_name, last_name, phone, role,
             is_active, is_verified, last_login, created_at,
             admin_set_password
      FROM users
      WHERE tenant_id = $1
      ORDER BY created_at ASC
    `, [tenantId]);
    return successResponse(res, result.rows);
  } catch (error) {
    return errorResponse(res, 'Failed to list tenant users', 500);
  }
};

exports.setUserPassword = async (req, res) => {
  const { userId } = req.params;
  const { password } = req.body;

  if (!password || password.length < 6) {
    return errorResponse(res, 'Password must be at least 6 characters', 400);
  }
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await query(`
      UPDATE users SET password_hash = $1, admin_set_password = $2
      WHERE id = $3 AND tenant_id IS NOT NULL
      RETURNING id, email, first_name, last_name, admin_set_password
    `, [passwordHash, password, userId]);

    if (!result.rows.length) return errorResponse(res, 'User not found', 404);
    await logAudit({ tenantId: null, userId: req.user.id, action: 'SUPERADMIN_SET_USER_PASSWORD', resourceType: 'user', resourceId: userId, req });
    return successResponse(res, result.rows[0], 'Password updated');
  } catch (error) {
    return errorResponse(res, 'Failed to set password', 500);
  }
};

exports.toggleUserActive = async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await query(`
      UPDATE users SET is_active = NOT is_active
      WHERE id = $1 AND tenant_id IS NOT NULL
      RETURNING id, email, is_active
    `, [userId]);
    if (!result.rows.length) return errorResponse(res, 'User not found', 404);
    await logAudit({ tenantId: null, userId: req.user.id, action: 'SUPERADMIN_TOGGLE_USER', resourceType: 'user', resourceId: userId, req });
    return successResponse(res, result.rows[0]);
  } catch (error) {
    return errorResponse(res, 'Failed to toggle user status', 500);
  }
};
