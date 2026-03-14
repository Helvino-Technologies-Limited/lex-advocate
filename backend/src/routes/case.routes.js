const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { query } = require('../database/connection');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/apiResponse');
const { getPagination, buildPaginationMeta, generateCaseNumber } = require('../utils/helpers');
const { logAudit } = require('../middleware/audit');

// Get all cases
router.get('/', authenticate, async (req, res) => {
  const { page, limit, offset } = getPagination(req.query.page, req.query.limit);
  const { search, status, priority, case_type, client_id } = req.query;
  try {
    let where = 'WHERE c.tenant_id = $1';
    const params = [req.user.tenantId];
    let i = 2;

    // Non-admins only see their assigned cases
    if (req.user.role === 'advocate' || req.user.role === 'paralegal') {
      where += ` AND (c.lead_advocate_id = $${i} OR EXISTS (SELECT 1 FROM case_assignments ca WHERE ca.case_id = c.id AND ca.user_id = $${i}))`;
      params.push(req.user.id); i++;
    }
    if (status) { where += ` AND c.status = $${i++}`; params.push(status); }
    if (priority) { where += ` AND c.priority = $${i++}`; params.push(priority); }
    if (case_type) { where += ` AND c.case_type = $${i++}`; params.push(case_type); }
    if (client_id) { where += ` AND c.client_id = $${i++}`; params.push(client_id); }
    if (search) {
      where += ` AND (c.title ILIKE $${i} OR c.case_number ILIKE $${i} OR c.court_name ILIKE $${i})`;
      params.push(`%${search}%`); i++;
    }

    const countResult = await query(`SELECT COUNT(*) FROM cases c ${where}`, params);
    const result = await query(
      `SELECT c.*, cl.first_name as client_first, cl.last_name as client_last, cl.organization_name as client_org,
              u.first_name as advocate_first, u.last_name as advocate_last
       FROM cases c
       LEFT JOIN clients cl ON c.client_id = cl.id
       LEFT JOIN users u ON c.lead_advocate_id = u.id
       ${where} ORDER BY c.created_at DESC LIMIT $${i} OFFSET $${i+1}`,
      [...params, limit, offset]
    );

    return paginatedResponse(res, result.rows, buildPaginationMeta(countResult.rows[0].count, page, limit));
  } catch (error) {
    return errorResponse(res, 'Failed to get cases', 500);
  }
});

// Create case
router.post('/', authenticate, async (req, res) => {
  const { title, description, caseType, courtName, courtStation, jurisdiction, judgeName,
          opposingParty, opposingCounsel, clientId, leadAdvocateId, status, priority, tags,
          dateFiled, nextHearingDate, billingType, hourlyRate, fixedFee, retainerAmount, isProBono, estimatedValue } = req.body;
  try {
    const caseNumber = generateCaseNumber();
    const result = await query(
      `INSERT INTO cases (tenant_id, case_number, title, description, case_type, court_name, court_station,
       jurisdiction, judge_name, opposing_party, opposing_counsel, client_id, lead_advocate_id, status, priority,
       tags, date_filed, next_hearing_date, billing_type, hourly_rate, fixed_fee, retainer_amount, is_pro_bono,
       estimated_value, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25) RETURNING *`,
      [req.user.tenantId, caseNumber, title, description, caseType, courtName, courtStation, jurisdiction, judgeName,
       opposingParty, opposingCounsel, clientId, leadAdvocateId || req.user.id, status || 'new', priority || 'medium',
       tags, dateFiled, nextHearingDate, billingType || 'hourly', hourlyRate, fixedFee, retainerAmount, isProBono || false,
       estimatedValue, req.user.id]
    );

    // Auto-assign lead advocate
    if (leadAdvocateId) {
      await query(
        'INSERT INTO case_assignments (case_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [result.rows[0].id, leadAdvocateId, 'lead']
      );
    }

    await logAudit({ tenantId: req.user.tenantId, userId: req.user.id, action: 'CREATE_CASE', resourceType: 'case', resourceId: result.rows[0].id, newValues: { title, caseNumber }, req });
    return successResponse(res, result.rows[0], 'Case created', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create case', 500);
  }
});

// Get single case
router.get('/:id', authenticate, async (req, res) => {
  try {
    const caseResult = await query(
      `SELECT c.*, cl.first_name as client_first, cl.last_name as client_last, cl.organization_name as client_org,
              cl.email as client_email, cl.phone as client_phone,
              u.first_name as advocate_first, u.last_name as advocate_last, u.email as advocate_email
       FROM cases c
       LEFT JOIN clients cl ON c.client_id = cl.id
       LEFT JOIN users u ON c.lead_advocate_id = u.id
       WHERE c.id = $1 AND c.tenant_id = $2`,
      [req.params.id, req.user.tenantId]
    );
    if (!caseResult.rows.length) return errorResponse(res, 'Case not found', 404);

    const [notes, tasks, hearings, documents, team, milestones] = await Promise.all([
      query('SELECT cn.*, u.first_name, u.last_name FROM case_notes cn LEFT JOIN users u ON cn.author_id = u.id WHERE cn.case_id = $1 ORDER BY cn.created_at DESC', [req.params.id]),
      query('SELECT t.*, u.first_name, u.last_name FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id WHERE t.case_id = $1 ORDER BY t.due_date ASC', [req.params.id]),
      query('SELECT * FROM hearings WHERE case_id = $1 ORDER BY hearing_date DESC', [req.params.id]),
      query('SELECT * FROM documents WHERE case_id = $1 ORDER BY created_at DESC', [req.params.id]),
      query(`SELECT ca.role, u.id, u.first_name, u.last_name, u.role as user_role, u.email FROM case_assignments ca
             JOIN users u ON ca.user_id = u.id WHERE ca.case_id = $1`, [req.params.id]),
      query('SELECT * FROM case_milestones WHERE case_id = $1 ORDER BY milestone_date ASC', [req.params.id])
    ]);

    return successResponse(res, {
      ...caseResult.rows[0],
      notes: notes.rows, tasks: tasks.rows, hearings: hearings.rows,
      documents: documents.rows, team: team.rows, milestones: milestones.rows
    });
  } catch (error) {
    return errorResponse(res, 'Failed to get case', 500);
  }
});

// Update case
router.patch('/:id', authenticate, async (req, res) => {
  const fields = req.body;
  const fieldMap = {
    title: 'title', description: 'description', caseType: 'case_type', courtName: 'court_name',
    courtStation: 'court_station', jurisdiction: 'jurisdiction', judgeName: 'judge_name',
    opposingParty: 'opposing_party', opposingCounsel: 'opposing_counsel', status: 'status',
    priority: 'priority', tags: 'tags', dateFiled: 'date_filed', nextHearingDate: 'next_hearing_date',
    closedDate: 'closed_date', billingType: 'billing_type', hourlyRate: 'hourly_rate',
    fixedFee: 'fixed_fee', retainerAmount: 'retainer_amount', isProBono: 'is_pro_bono',
    leadAdvocateId: 'lead_advocate_id', estimatedValue: 'estimated_value'
  };
  try {
    const sets = [];
    const params = [];
    let i = 1;
    for (const [key, col] of Object.entries(fieldMap)) {
      if (fields[key] !== undefined) { sets.push(`${col} = $${i++}`); params.push(fields[key]); }
    }
    if (!sets.length) return errorResponse(res, 'No fields to update', 400);
    params.push(req.params.id, req.user.tenantId);
    const result = await query(`UPDATE cases SET ${sets.join(', ')} WHERE id = $${i++} AND tenant_id = $${i} RETURNING *`, params);
    if (!result.rows.length) return errorResponse(res, 'Case not found', 404);
    await logAudit({ tenantId: req.user.tenantId, userId: req.user.id, action: 'UPDATE_CASE', resourceType: 'case', resourceId: req.params.id, newValues: fields, req });
    return successResponse(res, result.rows[0], 'Case updated');
  } catch (error) {
    return errorResponse(res, 'Failed to update case', 500);
  }
});

// Add case note
router.post('/:id/notes', authenticate, async (req, res) => {
  const { content, isPrivate } = req.body;
  try {
    const result = await query(
      'INSERT INTO case_notes (case_id, tenant_id, author_id, content, is_private) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.params.id, req.user.tenantId, req.user.id, content, isPrivate || false]
    );
    return successResponse(res, result.rows[0], 'Note added', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to add note', 500);
  }
});

// Add hearing
router.post('/:id/hearings', authenticate, async (req, res) => {
  const { hearingDate, hearingType, venue, judgeName, notes, nextHearingDate } = req.body;
  try {
    const result = await query(
      `INSERT INTO hearings (case_id, tenant_id, hearing_date, hearing_type, venue, judge_name, notes, next_hearing_date, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.params.id, req.user.tenantId, hearingDate, hearingType, venue, judgeName, notes, nextHearingDate, req.user.id]
    );
    // Update case next hearing date
    if (nextHearingDate) {
      await query('UPDATE cases SET next_hearing_date = $1 WHERE id = $2', [nextHearingDate, req.params.id]);
    }
    return successResponse(res, result.rows[0], 'Hearing added', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to add hearing', 500);
  }
});

// Assign team member
router.post('/:id/assignments', authenticate, authorize('admin', 'advocate'), async (req, res) => {
  const { userId, role } = req.body;
  try {
    await query(
      'INSERT INTO case_assignments (case_id, user_id, role) VALUES ($1,$2,$3) ON CONFLICT (case_id, user_id) DO UPDATE SET role = $3',
      [req.params.id, userId, role || 'advocate']
    );
    return successResponse(res, null, 'Team member assigned');
  } catch (error) {
    return errorResponse(res, 'Failed to assign member', 500);
  }
});

module.exports = router;
