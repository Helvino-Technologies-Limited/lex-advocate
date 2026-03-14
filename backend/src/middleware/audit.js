const { query } = require('../database/connection');
const logger = require('../utils/logger');

async function logAudit({ tenantId, userId, action, resourceType, resourceId, oldValues, newValues, req }) {
  try {
    const ip = req?.ip || req?.headers?.['x-forwarded-for'] || 'unknown';
    const userAgent = req?.headers?.['user-agent'] || '';
    await query(
      `INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, old_values, new_values, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::inet, $9)`,
      [tenantId, userId, action, resourceType, resourceId,
       oldValues ? JSON.stringify(oldValues) : null,
       newValues ? JSON.stringify(newValues) : null,
       ip, userAgent]
    );
  } catch (error) {
    logger.error('Audit log error:', error);
  }
}

module.exports = { logAudit };
