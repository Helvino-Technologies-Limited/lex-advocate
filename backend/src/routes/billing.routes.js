const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { query } = require('../database/connection');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/apiResponse');
const { getPagination, buildPaginationMeta, generateInvoiceNumber } = require('../utils/helpers');
const { logAudit } = require('../middleware/audit');

// ===== INVOICES =====
router.get('/invoices', authenticate, async (req, res) => {
  const { page, limit, offset } = getPagination(req.query.page, req.query.limit);
  const { status, client_id } = req.query;
  try {
    let where = 'WHERE i.tenant_id = $1';
    const params = [req.user.tenantId];
    let i = 2;
    if (status) { where += ` AND i.status = $${i++}`; params.push(status); }
    if (client_id) { where += ` AND i.client_id = $${i++}`; params.push(client_id); }

    const countResult = await query(`SELECT COUNT(*) FROM invoices i ${where}`, params);
    const result = await query(
      `SELECT i.*, cl.first_name as client_first, cl.last_name as client_last, cl.organization_name,
              c.case_number, c.title as case_title
       FROM invoices i
       LEFT JOIN clients cl ON i.client_id = cl.id
       LEFT JOIN cases c ON i.case_id = c.id
       ${where} ORDER BY i.created_at DESC LIMIT $${i} OFFSET $${i+1}`,
      [...params, limit, offset]
    );
    return paginatedResponse(res, result.rows, buildPaginationMeta(countResult.rows[0].count, page, limit));
  } catch (error) {
    return errorResponse(res, 'Failed to get invoices', 500);
  }
});

router.post('/invoices', authenticate, authorize('admin', 'advocate', 'accountant'), async (req, res) => {
  const { clientId, caseId, dueDate, billingType, taxRate, discountAmount, notes, terms, items } = req.body;
  try {
    const invoiceNumber = generateInvoiceNumber('INV');
    let subtotal = 0;
    if (items && items.length) {
      subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    }
    const taxAmount = (subtotal * (taxRate || 0)) / 100;
    const discount = discountAmount || 0;
    const total = subtotal + taxAmount - discount;

    const invoiceResult = await query(
      `INSERT INTO invoices (tenant_id, invoice_number, client_id, case_id, due_date, billing_type,
       subtotal, tax_rate, tax_amount, discount_amount, total_amount, balance_due, notes, terms, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [req.user.tenantId, invoiceNumber, clientId, caseId, dueDate, billingType || 'fixed',
       subtotal, taxRate || 0, taxAmount, discount, total, total, notes, terms, req.user.id]
    );

    const invoice = invoiceResult.rows[0];

    if (items && items.length) {
      for (const item of items) {
        await query(
          'INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, item_date) VALUES ($1,$2,$3,$4,$5,$6)',
          [invoice.id, item.description, item.quantity, item.unitPrice, item.quantity * item.unitPrice, item.date]
        );
      }
    }

    await logAudit({ tenantId: req.user.tenantId, userId: req.user.id, action: 'CREATE_INVOICE', resourceType: 'invoice', resourceId: invoice.id, req });
    return successResponse(res, invoice, 'Invoice created', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create invoice', 500);
  }
});

router.get('/invoices/:id', authenticate, async (req, res) => {
  try {
    const invoice = await query(
      `SELECT i.*, cl.first_name as client_first, cl.last_name as client_last,
              cl.organization_name, cl.email as client_email, cl.phone as client_phone, cl.address as client_address,
              c.case_number, c.title as case_title
       FROM invoices i
       LEFT JOIN clients cl ON i.client_id = cl.id
       LEFT JOIN cases c ON i.case_id = c.id
       WHERE i.id = $1 AND i.tenant_id = $2`,
      [req.params.id, req.user.tenantId]
    );
    if (!invoice.rows.length) return errorResponse(res, 'Invoice not found', 404);

    const items = await query('SELECT * FROM invoice_items WHERE invoice_id = $1', [req.params.id]);
    const payments = await query('SELECT * FROM payments WHERE invoice_id = $1 ORDER BY payment_date DESC', [req.params.id]);

    return successResponse(res, { ...invoice.rows[0], items: items.rows, payments: payments.rows });
  } catch (error) {
    return errorResponse(res, 'Failed to get invoice', 500);
  }
});

router.patch('/invoices/:id/status', authenticate, async (req, res) => {
  const { status } = req.body;
  try {
    const result = await query(
      'UPDATE invoices SET status = $1 WHERE id = $2 AND tenant_id = $3 RETURNING *',
      [status, req.params.id, req.user.tenantId]
    );
    if (!result.rows.length) return errorResponse(res, 'Invoice not found', 404);
    return successResponse(res, result.rows[0], 'Invoice updated');
  } catch (error) {
    return errorResponse(res, 'Failed to update invoice', 500);
  }
});

// ===== PAYMENTS =====
router.post('/payments', authenticate, async (req, res) => {
  const { invoiceId, clientId, amount, paymentMethod, transactionId, mpesaCode, notes } = req.body;
  try {
    const paymentResult = await query(
      `INSERT INTO payments (tenant_id, invoice_id, client_id, amount, payment_method, transaction_id, mpesa_code, status, notes, received_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'completed',$8,$9) RETURNING *`,
      [req.user.tenantId, invoiceId, clientId, amount, paymentMethod, transactionId, mpesaCode, notes, req.user.id]
    );

    // Update invoice
    if (invoiceId) {
      await query(`
        UPDATE invoices SET
          amount_paid = amount_paid + $1,
          balance_due = GREATEST(0, balance_due - $1),
          status = CASE WHEN (balance_due - $1) <= 0 THEN 'paid'
                        WHEN (amount_paid + $1) > 0 THEN 'partially_paid'
                        ELSE status END
        WHERE id = $2
      `, [amount, invoiceId]);
    }

    return successResponse(res, paymentResult.rows[0], 'Payment recorded', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to record payment', 500);
  }
});

router.get('/payments', authenticate, async (req, res) => {
  const { page, limit, offset } = getPagination(req.query.page, req.query.limit);
  try {
    const countResult = await query('SELECT COUNT(*) FROM payments WHERE tenant_id = $1', [req.user.tenantId]);
    const result = await query(
      `SELECT p.*, i.invoice_number, cl.first_name, cl.last_name, cl.organization_name
       FROM payments p
       LEFT JOIN invoices i ON p.invoice_id = i.id
       LEFT JOIN clients cl ON p.client_id = cl.id
       WHERE p.tenant_id = $1 ORDER BY p.payment_date DESC LIMIT $2 OFFSET $3`,
      [req.user.tenantId, limit, offset]
    );
    return paginatedResponse(res, result.rows, buildPaginationMeta(countResult.rows[0].count, page, limit));
  } catch (error) {
    return errorResponse(res, 'Failed to get payments', 500);
  }
});

// ===== EXPENSES =====
router.post('/expenses', authenticate, async (req, res) => {
  const { caseId, clientId, category, description, amount, expenseDate, isBillable } = req.body;
  try {
    const result = await query(
      `INSERT INTO expenses (tenant_id, case_id, client_id, category, description, amount, expense_date, is_billable, recorded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.tenantId, caseId, clientId, category, description, amount, expenseDate, isBillable !== false, req.user.id]
    );
    return successResponse(res, result.rows[0], 'Expense recorded', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to record expense', 500);
  }
});

router.get('/expenses', authenticate, async (req, res) => {
  const { page, limit, offset } = getPagination(req.query.page, req.query.limit);
  try {
    const countResult = await query('SELECT COUNT(*) FROM expenses WHERE tenant_id = $1', [req.user.tenantId]);
    const result = await query(
      `SELECT e.*, c.case_number, c.title as case_title, cl.first_name, cl.last_name
       FROM expenses e
       LEFT JOIN cases c ON e.case_id = c.id
       LEFT JOIN clients cl ON e.client_id = cl.id
       WHERE e.tenant_id = $1 ORDER BY e.expense_date DESC LIMIT $2 OFFSET $3`,
      [req.user.tenantId, limit, offset]
    );
    return paginatedResponse(res, result.rows, buildPaginationMeta(countResult.rows[0].count, page, limit));
  } catch (error) {
    return errorResponse(res, 'Failed to get expenses', 500);
  }
});

// ===== TIME ENTRIES =====
router.post('/time-entries', authenticate, async (req, res) => {
  const { caseId, description, hours, hourlyRate, entryDate, isBillable } = req.body;
  try {
    const rate = hourlyRate || 0;
    const amount = hours * rate;
    const result = await query(
      `INSERT INTO time_entries (tenant_id, case_id, user_id, description, hours, hourly_rate, amount, entry_date, is_billable)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.tenantId, caseId, req.user.id, description, hours, rate, amount, entryDate, isBillable !== false]
    );
    return successResponse(res, result.rows[0], 'Time entry added', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to add time entry', 500);
  }
});

router.get('/time-entries', authenticate, async (req, res) => {
  const { case_id } = req.query;
  try {
    let where = 'WHERE te.tenant_id = $1';
    const params = [req.user.tenantId];
    if (case_id) { where += ' AND te.case_id = $2'; params.push(case_id); }
    const result = await query(
      `SELECT te.*, c.case_number, c.title as case_title, u.first_name, u.last_name
       FROM time_entries te LEFT JOIN cases c ON te.case_id = c.id LEFT JOIN users u ON te.user_id = u.id
       ${where} ORDER BY te.entry_date DESC`,
      params
    );
    return successResponse(res, result.rows);
  } catch (error) {
    return errorResponse(res, 'Failed to get time entries', 500);
  }
});

module.exports = router;
