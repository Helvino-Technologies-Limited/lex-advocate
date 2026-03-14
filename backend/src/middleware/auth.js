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

    // Get user from DB
    const result = await query(
      'SELECT u.*, t.slug as tenant_slug, t.is_active as tenant_active, t.subscription_status FROM users u JOIN tenants t ON u.tenant_id = t.id WHERE u.id = $1 AND u.is_active = true',
      [decoded.userId]
    );

    if (!result.rows.length) {
      return errorResponse(res, 'User not found or deactivated', 401);
    }

    const user = result.rows[0];

    if (!user.tenant_active) {
      return errorResponse(res, 'Tenant account is suspended', 403);
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id,
      tenantSlug: user.tenant_slug,
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
  // Ensure all queries are scoped to the user's tenant
  req.tenantId = req.user?.tenantId;
  next();
}

module.exports = { authenticate, authorize, tenantScope };
