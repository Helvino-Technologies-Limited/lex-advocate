const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { query } = require('../database/connection');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// GET /api/subscription/status
router.get('/status', authenticate, async (req, res) => {
  if (req.user.role === 'super_admin') {
    return successResponse(res, { status: 'active', isSuperAdmin: true });
  }
  try {
    const result = await query(
      `SELECT subscription_status, subscription_plan, trial_ends_at,
              subscription_expires_at, subscription_year, name, email
       FROM tenants WHERE id = $1`,
      [req.user.tenantId]
    );
    if (!result.rows.length) return errorResponse(res, 'Tenant not found', 404);
    const t = result.rows[0];

    const now = new Date();
    let daysRemaining = null;
    if (t.subscription_status === 'trial' && t.trial_ends_at) {
      daysRemaining = Math.max(0, Math.ceil((new Date(t.trial_ends_at) - now) / 86400000));
    } else if (t.subscription_status === 'active' && t.subscription_expires_at) {
      daysRemaining = Math.max(0, Math.ceil((new Date(t.subscription_expires_at) - now) / 86400000));
    }

    // Get pending payments submitted by this tenant
    const payments = await query(
      `SELECT id, mpesa_code, amount, payment_year, status, submitted_at, verified_at, notes
       FROM subscription_payments WHERE tenant_id = $1 ORDER BY submitted_at DESC LIMIT 10`,
      [req.user.tenantId]
    );

    return successResponse(res, {
      status: t.subscription_status,
      plan: t.subscription_plan,
      trialEndsAt: t.trial_ends_at,
      subscriptionExpiresAt: t.subscription_expires_at,
      subscriptionYear: t.subscription_year || 0,
      daysRemaining,
      firmName: t.name,
      payments: payments.rows
    });
  } catch (error) {
    return errorResponse(res, 'Failed to get subscription status', 500);
  }
});

// POST /api/subscription/pay — tenant submits MPesa code for verification
router.post('/pay', authenticate, async (req, res) => {
  if (req.user.role === 'super_admin') return errorResponse(res, 'Not applicable', 400);
  const { mpesaCode, amount } = req.body;
  if (!mpesaCode || !amount) return errorResponse(res, 'mpesaCode and amount are required', 400);

  try {
    // Determine payment year (1 = first year, 2+ = renewal)
    const tenantResult = await query(
      `SELECT subscription_year, subscription_status FROM tenants WHERE id = $1`,
      [req.user.tenantId]
    );
    if (!tenantResult.rows.length) return errorResponse(res, 'Tenant not found', 404);
    const paymentYear = (tenantResult.rows[0].subscription_year || 0) + 1;

    // Check for duplicate MPesa code
    const duplicate = await query(
      `SELECT id FROM subscription_payments WHERE mpesa_code = $1 AND tenant_id = $2`,
      [mpesaCode.toUpperCase(), req.user.tenantId]
    );
    if (duplicate.rows.length) return errorResponse(res, 'This MPesa code has already been submitted', 409);

    const result = await query(
      `INSERT INTO subscription_payments (tenant_id, mpesa_code, amount, payment_year)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.tenantId, mpesaCode.toUpperCase(), parseFloat(amount), paymentYear]
    );

    return successResponse(res, result.rows[0], 'Payment submitted for verification. You will be notified once verified.', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to submit payment', 500);
  }
});

module.exports = router;
