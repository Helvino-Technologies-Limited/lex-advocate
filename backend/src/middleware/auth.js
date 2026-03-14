const { verifyAccessToken } = require('../utils/jwt');
const { query } = require('../database/connection');
const { errorResponse } = require('../utils/apiResponse');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'Authentication required', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    let result;
    if (decoded.role === 'super_admin') {
      // Superadmin has no tenant — no JOIN needed
      result = await query(
        `SELECT * FROM users WHERE id = $1 AND is_active = true AND role = 'super_admin' AND tenant_id IS NULL`,
        [decoded.userId]
      );
    } else {
      result = await query(
        `SELECT u.*, t.slug as tenant_slug, t.is_active as tenant_active,
                t.subscription_status, t.trial_ends_at, t.subscription_expires_at
         FROM users u JOIN tenants t ON u.tenant_id = t.id
         WHERE u.id = $1 AND u.is_active = true`,
        [decoded.userId]
      );
    }

    if (!result.rows.length) {
      return errorResponse(res, 'User not found or deactivated', 401);
    }

    const user = result.rows[0];

    if (decoded.role !== 'super_admin') {
      const now = new Date();
      const isExpiredTrial = user.subscription_status === 'trial' &&
        user.trial_ends_at && new Date(user.trial_ends_at) < now;
      const isExpiredSub = user.subscription_status === 'expired';
      const url = req.originalUrl;
      const isAllowedRoute = url.startsWith('/api/auth') || url.startsWith('/api/subscription');

      if (isExpiredTrial || isExpiredSub) {
        // Auto-mark as expired if trial just ran out
        if (isExpiredTrial) {
          query(
            `UPDATE tenants SET subscription_status = 'expired', is_active = false
             WHERE id = $1 AND subscription_status = 'trial'`,
            [user.tenant_id]
          ).catch(() => {});
        }
        if (!isAllowedRoute) {
          return errorResponse(res, 'Subscription expired. Please renew to continue.', 402);
        }
      } else if (!user.tenant_active) {
        // Suspended by admin (not expired subscription)
        if (!isAllowedRoute) {
          return errorResponse(res, 'Tenant account is suspended', 403);
        }
      }
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id || null,
      tenantSlug: user.tenant_slug || null,
      firstName: user.first_name,
      lastName: user.last_name
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 'Token expired', 401);
    }
    if (error.name === 'JsonWebTokenError') {
      return errorResponse(res, 'Invalid token', 401);
    }
    return errorResponse(res, 'Authentication failed', 401);
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return errorResponse(res, 'Authentication required', 401);
    if (!roles.includes(req.user.role)) {
      return errorResponse(res, 'Insufficient permissions', 403);
    }
    next();
  };
}

function tenantScope(req, res, next) {
  req.tenantId = req.user?.tenantId;
  next();
}

module.exports = { authenticate, authorize, tenantScope };
