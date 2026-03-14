const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const sa = require('../controllers/superadmin.controller');

// All superadmin routes require authentication + super_admin role
router.use(authenticate, authorize('super_admin'));

// Platform stats
router.get('/stats', sa.getStats);

// Tenant management
router.get('/tenants',              sa.listTenants);
router.post('/tenants',             sa.createTenant);
router.get('/tenants/:id',          sa.getTenant);
router.patch('/tenants/:id',        sa.updateTenant);
router.post('/tenants/:id/activate',   sa.activateTenant);
router.post('/tenants/:id/deactivate', sa.deactivateTenant);
router.delete('/tenants/:id',       sa.deleteTenant);

// Tenant user management
router.get('/tenants/:id/users',             sa.listTenantUsers);
router.patch('/users/:userId/password',      sa.setUserPassword);
router.patch('/users/:userId/toggle-active', sa.toggleUserActive);

// Subscription payments
router.get('/subscription-payments',                        sa.listSubscriptionPayments);
router.patch('/subscription-payments/:id/verify',          sa.verifySubscriptionPayment);
router.patch('/subscription-payments/:id/reject',          sa.rejectSubscriptionPayment);

module.exports = router;
