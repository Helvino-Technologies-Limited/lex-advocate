const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { query } = require('../database/connection');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// Get conversations (unique senders/recipients)
router.get('/messages', authenticate, async (req, res) => {
  const { case_id, recipient_id } = req.query;
  try {
    let where = 'WHERE (sender_id = $1 OR recipient_id = $1) AND tenant_id = $2';
    const params = [req.user.id, req.user.tenantId];
    let i = 3;
    if (case_id) { where += ` AND case_id = $${i++}`; params.push(case_id); }
    if (recipient_id) {
      where += ` AND (sender_id = $${i} OR recipient_id = $${i})`;
      params.push(recipient_id); i++;
    }

    const result = await query(
      `SELECT m.*, u.first_name as sender_first, u.last_name as sender_last, u.avatar_url as sender_avatar
       FROM messages m JOIN users u ON m.sender_id = u.id
       ${where} ORDER BY m.created_at ASC LIMIT 100`,
      params
    );
    return successResponse(res, result.rows);
  } catch (error) {
    return errorResponse(res, 'Failed to get messages', 500);
  }
});

router.post('/messages', authenticate, async (req, res) => {
  const { recipientId, caseId, content, messageType } = req.body;
  try {
    const result = await query(
      `INSERT INTO messages (tenant_id, sender_id, recipient_id, case_id, content, message_type)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user.tenantId, req.user.id, recipientId, caseId, content, messageType || 'direct']
    );
    return successResponse(res, result.rows[0], 'Message sent', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to send message', 500);
  }
});

module.exports = router;
