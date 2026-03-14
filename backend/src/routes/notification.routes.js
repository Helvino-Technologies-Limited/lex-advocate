const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { query } = require('../database/connection');
const { successResponse, errorResponse } = require('../utils/apiResponse');

router.get('/', authenticate, async (req, res) => {
  const { unread_only } = req.query;
  try {
    let where = 'WHERE user_id = $1 AND tenant_id = $2';
    const params = [req.user.id, req.user.tenantId];
    if (unread_only === 'true') where += ' AND is_read = false';
    const result = await query(`SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT 50`, params);
    const unreadCount = await query('SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false', [req.user.id]);
    return successResponse(res, { notifications: result.rows, unreadCount: parseInt(unreadCount.rows[0].count) });
  } catch (error) {
    return errorResponse(res, 'Failed to get notifications', 500);
  }
});

router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    await query('UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    return successResponse(res, null, 'Marked as read');
  } catch (error) {
    return errorResponse(res, 'Failed to update notification', 500);
  }
});

router.patch('/read-all', authenticate, async (req, res) => {
  try {
    await query('UPDATE notifications SET is_read = true, read_at = NOW() WHERE user_id = $1 AND is_read = false', [req.user.id]);
    return successResponse(res, null, 'All notifications marked as read');
  } catch (error) {
    return errorResponse(res, 'Failed to update notifications', 500);
  }
});

module.exports = router;
