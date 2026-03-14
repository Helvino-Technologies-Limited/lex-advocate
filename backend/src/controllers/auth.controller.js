const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { query } = require('../database/connection');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { sendEmail, welcomeEmailTemplate, passwordResetTemplate } = require('../utils/email');
const { logAudit } = require('../middleware/audit');
const logger = require('../utils/logger');

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
}

exports.register = async (req, res) => {
  const { tenantName, firstName, lastName, email, password, phone } = req.body;
  try {
    const existingEmail = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingEmail.rows.length) {
      return errorResponse(res, 'Email already registered', 409);
    }

    const slug = slugify(tenantName);
    const tenantResult = await query(
      `INSERT INTO tenants (name, slug, email, phone, subscription_plan, subscription_status, trial_ends_at)
       VALUES ($1, $2, $3, $4, 'free', 'trial', NOW() + INTERVAL '5 days') RETURNING id`,
      [tenantName, slug, email, phone]
    );
    const tenantId = tenantResult.rows[0].id;

    const passwordHash = await bcrypt.hash(password, 12);

    const userResult = await query(
      `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, phone, role, is_active, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, 'admin', true, true) RETURNING id, email, first_name, last_name, role`,
      [tenantId, email, passwordHash, firstName, lastName, phone]
    );
    const user = userResult.rows[0];

    await query(`INSERT INTO subscriptions (tenant_id, plan, status) VALUES ($1, 'free', 'trial')`, [tenantId]);

    const loginUrl = `${process.env.FRONTEND_URL}/login`;
    sendEmail({
      to: email,
      subject: 'Welcome to Lex Advocate!',
      html: welcomeEmailTemplate(`${firstName} ${lastName}`, loginUrl)
    }).catch(err => logger.error('Welcome email failed:', err));

    await logAudit({ tenantId, userId: user.id, action: 'REGISTER', resourceType: 'user', resourceId: user.id, req });

    const accessToken = generateAccessToken({ userId: user.id, tenantId, role: user.role });
    const refreshToken = generateRefreshToken({ userId: user.id, tenantId });

    await query('UPDATE users SET refresh_token = $1 WHERE id = $2', [refreshToken, user.id]);

    return successResponse(res, {
      user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, role: user.role, tenantId },
      accessToken,
      refreshToken
    }, 'Registration successful', 201);
  } catch (error) {
    logger.error('Register error:', error);
    return errorResponse(res, 'Registration failed', 500);
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    // First check if this is a superadmin login (tenant_id IS NULL)
    const superadminResult = await query(
      `SELECT * FROM users WHERE email = $1 AND tenant_id IS NULL AND role = 'super_admin'`,
      [email]
    );

    if (superadminResult.rows.length) {
      const superadmin = superadminResult.rows[0];
      if (!superadmin.is_active) return errorResponse(res, 'Account deactivated.', 401);

      const isValid = await bcrypt.compare(password, superadmin.password_hash);
      if (!isValid) return errorResponse(res, 'Invalid email or password', 401);

      const accessToken = generateAccessToken({ userId: superadmin.id, tenantId: null, role: 'super_admin' });
      const refreshToken = generateRefreshToken({ userId: superadmin.id, tenantId: null });

      await query('UPDATE users SET refresh_token = $1, last_login = NOW() WHERE id = $2', [refreshToken, superadmin.id]);

      return successResponse(res, {
        user: {
          id: superadmin.id, email: superadmin.email,
          firstName: superadmin.first_name, lastName: superadmin.last_name,
          role: 'super_admin', tenantId: null, tenantName: null, tenantSlug: null
        },
        accessToken,
        refreshToken
      }, 'Login successful');
    }

    // Regular tenant user login
    const result = await query(
      `SELECT u.*, t.is_active as tenant_active, t.subscription_status, t.name as tenant_name, t.slug as tenant_slug
       FROM users u JOIN tenants t ON u.tenant_id = t.id WHERE u.email = $1`,
      [email]
    );

    if (!result.rows.length) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    const user = result.rows[0];

    if (!user.is_active) return errorResponse(res, 'Account deactivated. Contact your admin.', 401);
    if (!user.tenant_active) return errorResponse(res, 'Firm account is suspended.', 403);

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    const accessToken = generateAccessToken({ userId: user.id, tenantId: user.tenant_id, role: user.role });
    const refreshToken = generateRefreshToken({ userId: user.id, tenantId: user.tenant_id });

    await query('UPDATE users SET refresh_token = $1, last_login = NOW() WHERE id = $2', [refreshToken, user.id]);
    await logAudit({ tenantId: user.tenant_id, userId: user.id, action: 'LOGIN', resourceType: 'user', resourceId: user.id, req });

    return successResponse(res, {
      user: {
        id: user.id, email: user.email,
        firstName: user.first_name, lastName: user.last_name,
        role: user.role, tenantId: user.tenant_id,
        tenantName: user.tenant_name, tenantSlug: user.tenant_slug,
        avatarUrl: user.avatar_url, specialization: user.specialization
      },
      accessToken,
      refreshToken
    }, 'Login successful');
  } catch (error) {
    logger.error('Login error:', error);
    return errorResponse(res, 'Login failed', 500);
  }
};

exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return errorResponse(res, 'Refresh token required', 401);
  try {
    const decoded = verifyRefreshToken(refreshToken);
    const result = await query('SELECT * FROM users WHERE id = $1 AND refresh_token = $2', [decoded.userId, refreshToken]);
    if (!result.rows.length) return errorResponse(res, 'Invalid refresh token', 401);

    const user = result.rows[0];
    const newAccessToken = generateAccessToken({ userId: user.id, tenantId: user.tenant_id || null, role: user.role });
    const newRefreshToken = generateRefreshToken({ userId: user.id, tenantId: user.tenant_id || null });
    await query('UPDATE users SET refresh_token = $1 WHERE id = $2', [newRefreshToken, user.id]);

    return successResponse(res, { accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch {
    return errorResponse(res, 'Invalid or expired refresh token', 401);
  }
};

exports.logout = async (req, res) => {
  try {
    await query('UPDATE users SET refresh_token = NULL WHERE id = $1', [req.user.id]);
    await logAudit({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'LOGOUT',
      resourceType: 'user',
      resourceId: req.user.id,
      req
    });
    return successResponse(res, null, 'Logged out successfully');
  } catch (error) {
    return errorResponse(res, 'Logout failed', 500);
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (!result.rows.length) {
      return successResponse(res, null, 'If that email exists, a reset link has been sent.');
    }
    const user = result.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000);
    await query('UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3', [token, expires, user.id]);

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    sendEmail({
      to: email,
      subject: 'Password Reset - Lex Advocate',
      html: passwordResetTemplate(`${user.first_name} ${user.last_name}`, resetUrl)
    }).catch(err => logger.error('Reset email failed:', err));

    return successResponse(res, null, 'If that email exists, a reset link has been sent.');
  } catch (error) {
    return errorResponse(res, 'Failed to process request', 500);
  }
};

exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;
  try {
    const result = await query(
      'SELECT * FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()',
      [token]
    );
    if (!result.rows.length) return errorResponse(res, 'Invalid or expired reset token', 400);

    const passwordHash = await bcrypt.hash(password, 12);
    await query(
      'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2',
      [passwordHash, result.rows[0].id]
    );
    return successResponse(res, null, 'Password reset successfully');
  } catch (error) {
    return errorResponse(res, 'Password reset failed', 500);
  }
};

exports.getMe = async (req, res) => {
  try {
    if (req.user.role === 'super_admin') {
      const result = await query(
        `SELECT id, email, first_name, last_name, role, is_verified, last_login, created_at
         FROM users WHERE id = $1`,
        [req.user.id]
      );
      if (!result.rows.length) return errorResponse(res, 'User not found', 404);
      const u = result.rows[0];
      return successResponse(res, {
        id: u.id, email: u.email,
        firstName: u.first_name, lastName: u.last_name,
        role: u.role, tenantId: null, tenantName: null
      });
    }

    const result = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.role, u.specialization, u.bar_number,
              u.avatar_url, u.bio, u.is_verified, u.last_login, u.notification_preferences, u.created_at,
              t.id as tenant_id, t.name as tenant_name, t.slug as tenant_slug, t.logo_url, t.subscription_plan,
              t.subscription_status, t.branding
       FROM users u JOIN tenants t ON u.tenant_id = t.id WHERE u.id = $1`,
      [req.user.id]
    );
    if (!result.rows.length) return errorResponse(res, 'User not found', 404);
    return successResponse(res, result.rows[0]);
  } catch (error) {
    return errorResponse(res, 'Failed to get profile', 500);
  }
};

exports.updateProfile = async (req, res) => {
  const { firstName, lastName, phone, specialization, barNumber, bio } = req.body;
  try {
    const result = await query(
      `UPDATE users SET first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name),
       phone = COALESCE($3, phone), specialization = COALESCE($4, specialization),
       bar_number = COALESCE($5, bar_number), bio = COALESCE($6, bio)
       WHERE id = $7 RETURNING id, email, first_name, last_name, phone, specialization, bar_number, bio`,
      [firstName, lastName, phone, specialization, barNumber, bio, req.user.id]
    );
    return successResponse(res, result.rows[0], 'Profile updated');
  } catch (error) {
    return errorResponse(res, 'Profile update failed', 500);
  }
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const isValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!isValid) return errorResponse(res, 'Current password is incorrect', 400);

    const newHash = await bcrypt.hash(newPassword, 12);
    // Clear admin_set_password when user changes their own password
    await query('UPDATE users SET password_hash = $1, admin_set_password = NULL WHERE id = $2', [newHash, req.user.id]);
    await logAudit({ tenantId: req.user.tenantId, userId: req.user.id, action: 'CHANGE_PASSWORD', resourceType: 'user', resourceId: req.user.id, req });
    return successResponse(res, null, 'Password changed successfully');
  } catch (error) {
    return errorResponse(res, 'Password change failed', 500);
  }
};
