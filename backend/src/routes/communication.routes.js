const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { query } = require('../database/connection');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const logger = require('../utils/logger');

// GET /api/communications/messages
router.get('/messages', authenticate, async (req, res) => {
  const { case_id, recipient_id } = req.query;
  try {
    // Use explicit m. prefix on all columns to avoid ambiguity with the users JOIN
    let where = 'WHERE (m.sender_id = $1 OR m.recipient_id = $1) AND m.tenant_id = $2';
    const params = [req.user.id, req.user.tenantId];
    let i = 3;

    if (case_id) {
      where += ` AND m.case_id = $${i++}`;
      params.push(case_id);
    }
    if (recipient_id) {
      where += ` AND (m.sender_id = $${i} OR m.recipient_id = $${i})`;
      params.push(recipient_id);
      i++;
    }

    const result = await query(
      `SELECT m.*,
              s.first_name  AS sender_first,
              s.last_name   AS sender_last,
              s.avatar_url  AS sender_avatar,
              r.first_name  AS recipient_first,
              r.last_name   AS recipient_last
       FROM messages m
       JOIN  users s ON m.sender_id    = s.id
       LEFT JOIN users r ON m.recipient_id = r.id
       ${where}
       ORDER BY m.created_at ASC
       LIMIT 200`,
      params
    );

    return successResponse(res, result.rows);
  } catch (error) {
    logger.error('Get messages error:', error);
    return errorResponse(res, 'Failed to get messages', 500);
  }
});

// POST /api/communications/messages
router.post('/messages', authenticate, async (req, res) => {
  const { recipientId, caseId, content, messageType } = req.body;
  if (!content?.trim()) return errorResponse(res, 'Message content is required', 400);
  if (!recipientId)     return errorResponse(res, 'Recipient is required', 400);
  try {
    const result = await query(
      `INSERT INTO messages (tenant_id, sender_id, recipient_id, case_id, content, message_type)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user.tenantId, req.user.id, recipientId, caseId || null, content.trim(), messageType || 'direct']
    );
    return successResponse(res, result.rows[0], 'Message sent', 201);
  } catch (error) {
    logger.error('Send message error:', error);
    return errorResponse(res, 'Failed to send message', 500);
  }
});

module.exports = router;
