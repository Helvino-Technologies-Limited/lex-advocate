const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { query } = require('../database/connection');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/apiResponse');
const { getPagination, buildPaginationMeta } = require('../utils/helpers');

router.get('/', authenticate, async (req, res) => {
  const { page, limit, offset } = getPagination(req.query.page, req.query.limit);
  const { status, priority, category, assigned_to, case_id } = req.query;
  try {
    let where = 'WHERE t.tenant_id = $1';
    const params = [req.user.tenantId];
    let i = 2;
    if (['advocate', 'paralegal'].includes(req.user.role)) {
      where += ` AND t.assigned_to = $${i++}`; params.push(req.user.id);
    }
    if (status) { where += ` AND t.status = $${i++}`; params.push(status); }
    if (priority) { where += ` AND t.priority = $${i++}`; params.push(priority); }
    if (category) { where += ` AND t.category = $${i++}`; params.push(category); }
    if (assigned_to) { where += ` AND t.assigned_to = $${i++}`; params.push(assigned_to); }
    if (case_id) { where += ` AND t.case_id = $${i++}`; params.push(case_id); }

    const countResult = await query(`SELECT COUNT(*) FROM tasks t ${where}`, params);
    const result = await query(
      `SELECT t.*, c.title as case_title, c.case_number,
              u1.first_name as assignee_first, u1.last_name as assignee_last,
              u2.first_name as assigner_first, u2.last_name as assigner_last,
              cl.first_name as client_first, cl.last_name as client_last
       FROM tasks t
       LEFT JOIN cases c ON t.case_id = c.id
       LEFT JOIN users u1 ON t.assigned_to = u1.id
       LEFT JOIN users u2 ON t.assigned_by = u2.id
       LEFT JOIN clients cl ON t.client_id = cl.id
       ${where} ORDER BY t.due_date ASC NULLS LAST, t.priority DESC LIMIT $${i} OFFSET $${i+1}`,
      [...params, limit, offset]
    );
    return paginatedResponse(res, result.rows, buildPaginationMeta(countResult.rows[0].count, page, limit));
  } catch (error) {
    return errorResponse(res, 'Failed to get tasks', 500);
  }
});

router.post('/', authenticate, async (req, res) => {
  const { title, description, category, status, priority, assignedTo, caseId, clientId, dueDate, reminderAt, tags } = req.body;
  try {
    const result = await query(
      `INSERT INTO tasks (tenant_id, case_id, client_id, title, description, category, status, priority, assigned_to, assigned_by, due_date, reminder_at, tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [req.user.tenantId, caseId, clientId, title, description, category || 'general', status || 'not_started', priority || 'medium', assignedTo, req.user.id, dueDate, reminderAt, tags]
    );
    return successResponse(res, result.rows[0], 'Task created', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create task', 500);
  }
});

router.patch('/:id', authenticate, async (req, res) => {
  const { title, description, status, priority, dueDate, category, assignedTo } = req.body;
  try {
    const completedAt = status === 'completed' ? 'NOW()' : null;
    const result = await query(
      `UPDATE tasks SET title = COALESCE($1, title), description = COALESCE($2, description),
       status = COALESCE($3, status), priority = COALESCE($4, priority),
       due_date = COALESCE($5, due_date), category = COALESCE($6, category),
       assigned_to = COALESCE($7, assigned_to),
       completed_at = CASE WHEN $3 = 'completed' THEN NOW() ELSE completed_at END
       WHERE id = $8 AND tenant_id = $9 RETURNING *`,
      [title, description, status, priority, dueDate, category, assignedTo, req.params.id, req.user.tenantId]
    );
    if (!result.rows.length) return errorResponse(res, 'Task not found', 404);
    return successResponse(res, result.rows[0], 'Task updated');
  } catch (error) {
    return errorResponse(res, 'Failed to update task', 500);
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const result = await query('DELETE FROM tasks WHERE id = $1 AND tenant_id = $2 RETURNING id', [req.params.id, req.user.tenantId]);
    if (!result.rows.length) return errorResponse(res, 'Task not found', 404);
    return successResponse(res, null, 'Task deleted');
  } catch (error) {
    return errorResponse(res, 'Failed to delete task', 500);
  }
});

module.exports = router;
