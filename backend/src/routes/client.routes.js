const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { query } = require('../database/connection');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/apiResponse');
const { getPagination, buildPaginationMeta } = require('../utils/helpers');
const { logAudit } = require('../middleware/audit');

// Get all clients
router.get('/', authenticate, async (req, res) => {
  const { page, limit, offset } = getPagination(req.query.page, req.query.limit);
  const { search, status, client_type } = req.query;
  try {
    let where = 'WHERE tenant_id = $1';
    const params = [req.user.tenantId];
    let i = 2;
    if (status) { where += ` AND status = $${i++}`; params.push(status); }
    if (client_type) { where += ` AND client_type = $${i++}`; params.push(client_type); }
    if (search) {
      where += ` AND (first_name ILIKE $${i} OR last_name ILIKE $${i} OR organization_name ILIKE $${i} OR email ILIKE $${i} OR phone ILIKE $${i})`;
      params.push(`%${search}%`); i++;
    }

    const countResult = await query(`SELECT COUNT(*) FROM clients ${where}`, params);
    const result = await query(
      `SELECT c.*, (SELECT COUNT(*) FROM cases WHERE client_id = c.id) as case_count
       FROM clients c ${where} ORDER BY c.created_at DESC LIMIT $${i} OFFSET $${i+1}`,
      [...params, limit, offset]
    );

    return paginatedResponse(res, result.rows, buildPaginationMeta(countResult.rows[0].count, page, limit));
  } catch (error) {
    return errorResponse(res, 'Failed to get clients', 500);
  }
});

// Create client
router.post('/', authenticate, async (req, res) => {
  const { clientType, firstName, lastName, organizationName, email, phone, secondaryPhone,
          idNumber, kraPin, address, city, county, country, dateOfBirth, gender, occupation, notes, tags } = req.body;
  try {
    const result = await query(
      `INSERT INTO clients (tenant_id, client_type, first_name, last_name, organization_name, email, phone,
       secondary_phone, id_number, kra_pin, address, city, county, country, date_of_birth, gender,
       occupation, notes, tags, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *`,
      [req.user.tenantId, clientType || 'individual', firstName, lastName, organizationName, email, phone,
       secondaryPhone, idNumber, kraPin, address, city, county, country || 'Kenya', dateOfBirth, gender,
       occupation, notes, tags, req.user.id]
    );
    await logAudit({ tenantId: req.user.tenantId, userId: req.user.id, action: 'CREATE_CLIENT', resourceType: 'client', resourceId: result.rows[0].id, newValues: result.rows[0], req });
    return successResponse(res, result.rows[0], 'Client created', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create client', 500);
  }
});

// Get single client
router.get('/:id', authenticate, async (req, res) => {
  try {
    const client = await query('SELECT * FROM clients WHERE id = $1 AND tenant_id = $2', [req.params.id, req.user.tenantId]);
    if (!client.rows.length) return errorResponse(res, 'Client not found', 404);

    const cases = await query(
      'SELECT id, case_number, title, status, priority, created_at FROM cases WHERE client_id = $1 AND tenant_id = $2 ORDER BY created_at DESC',
      [req.params.id, req.user.tenantId]
    );
    const invoices = await query(
      'SELECT id, invoice_number, total_amount, status, invoice_date FROM invoices WHERE client_id = $1 AND tenant_id = $2 ORDER BY created_at DESC LIMIT 10',
      [req.params.id, req.user.tenantId]
    );

    return successResponse(res, { ...client.rows[0], cases: cases.rows, invoices: invoices.rows });
  } catch (error) {
    return errorResponse(res, 'Failed to get client', 500);
  }
});

// Update client
router.patch('/:id', authenticate, async (req, res) => {
  const fields = req.body;
  try {
    const sets = [];
    const params = [];
    let i = 1;
    const fieldMap = {
      firstName: 'first_name', lastName: 'last_name', organizationName: 'organization_name',
      email: 'email', phone: 'phone', secondaryPhone: 'secondary_phone', address: 'address',
      city: 'city', county: 'county', notes: 'notes', status: 'status', tags: 'tags', gender: 'gender', occupation: 'occupation'
    };
    for (const [key, col] of Object.entries(fieldMap)) {
      if (fields[key] !== undefined) { sets.push(`${col} = $${i++}`); params.push(fields[key]); }
    }
    if (!sets.length) return errorResponse(res, 'No fields to update', 400);
    params.push(req.params.id, req.user.tenantId);
    const result = await query(
      `UPDATE clients SET ${sets.join(', ')} WHERE id = $${i++} AND tenant_id = $${i} RETURNING *`, params
    );
    if (!result.rows.length) return errorResponse(res, 'Client not found', 404);
    await logAudit({ tenantId: req.user.tenantId, userId: req.user.id, action: 'UPDATE_CLIENT', resourceType: 'client', resourceId: req.params.id, newValues: fields, req });
    return successResponse(res, result.rows[0], 'Client updated');
  } catch (error) {
    return errorResponse(res, 'Failed to update client', 500);
  }
});

// Delete client
router.delete('/:id', authenticate, authorize('admin', 'advocate'), async (req, res) => {
  try {
    const result = await query('DELETE FROM clients WHERE id = $1 AND tenant_id = $2 RETURNING id', [req.params.id, req.user.tenantId]);
    if (!result.rows.length) return errorResponse(res, 'Client not found', 404);
    await logAudit({ tenantId: req.user.tenantId, userId: req.user.id, action: 'DELETE_CLIENT', resourceType: 'client', resourceId: req.params.id, req });
    return successResponse(res, null, 'Client deleted');
  } catch (error) {
    return errorResponse(res, 'Failed to delete client', 500);
  }
});

module.exports = router;
