const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { authenticate, authorize } = require('../middleware/auth');
const { query } = require('../database/connection');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/apiResponse');
const { getPagination, buildPaginationMeta, generateInvoiceNumber } = require('../utils/helpers');
const { logAudit } = require('../middleware/audit');
const logger = require('../utils/logger');

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

function fmt(n) { return `KES ${parseFloat(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}` }

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

// ===== SEND INVOICE =====
router.post('/invoices/:id/send', authenticate, async (req, res) => {
  const { email, message } = req.body;
  try {
    const inv = await query(
      `SELECT i.*, cl.first_name as client_first, cl.last_name as client_last,
              cl.organization_name, cl.email as client_email, cl.phone as client_phone,
              t.name as firm_name, t.email as firm_email, t.phone as firm_phone, t.address as firm_address,
              c.case_number
       FROM invoices i
       LEFT JOIN clients cl ON i.client_id = cl.id
       LEFT JOIN tenants t ON i.tenant_id = t.id
       LEFT JOIN cases c ON i.case_id = c.id
       WHERE i.id = $1 AND i.tenant_id = $2`,
      [req.params.id, req.user.tenantId]
    );
    if (!inv.rows.length) return errorResponse(res, 'Invoice not found', 404);
    const d = inv.rows[0];
    const items = await query('SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY created_at', [req.params.id]);
    const clientName = d.organization_name || `${d.client_first || ''} ${d.client_last || ''}`.trim();
    const toEmail = email || d.client_email;
    if (!toEmail) return errorResponse(res, 'No recipient email address provided', 400);

    const itemRows = items.rows.map(it => `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;color:#374151">${it.description}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;text-align:center;color:#374151">${it.quantity}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;text-align:right;color:#374151">${fmt(it.unit_price)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;color:#111827">${fmt(it.amount)}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html><body style="margin:0;padding:20px;background:#f8f9fa;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
  <div style="background:#0a0f2e;padding:28px 32px">
    <h1 style="color:#c9a96e;margin:0;font-size:22px;letter-spacing:0.05em">${d.firm_name || 'Law Firm'}</h1>
    <p style="color:#94a3b8;margin:6px 0 0;font-size:13px">Professional Legal Services</p>
  </div>
  <div style="padding:32px">
    <div style="display:flex;justify-content:space-between;margin-bottom:28px;background:#f8f4ed;padding:20px;border-radius:10px">
      <div>
        <p style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 6px">Bill To</p>
        <p style="font-weight:700;color:#111827;margin:0;font-size:15px">${clientName}</p>
        ${d.client_email ? `<p style="color:#6b7280;margin:3px 0 0;font-size:13px">${d.client_email}</p>` : ''}
        ${d.client_phone ? `<p style="color:#6b7280;margin:3px 0 0;font-size:13px">${d.client_phone}</p>` : ''}
      </div>
      <div style="text-align:right">
        <p style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 6px">Invoice</p>
        <p style="font-weight:700;color:#0a0f2e;margin:0;font-size:18px">${d.invoice_number}</p>
        ${d.due_date ? `<p style="color:#ef4444;margin:4px 0 0;font-size:13px">Due: ${new Date(d.due_date).toLocaleDateString('en-KE',{day:'2-digit',month:'short',year:'numeric'})}</p>` : ''}
        ${d.case_number ? `<p style="color:#6b7280;margin:3px 0 0;font-size:12px">Case: ${d.case_number}</p>` : ''}
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px">
      <thead><tr style="background:#f8f4ed">
        <th style="padding:10px 14px;text-align:left;font-size:11px;color:#9ca3af;text-transform:uppercase">Description</th>
        <th style="padding:10px 14px;text-align:center;font-size:11px;color:#9ca3af;text-transform:uppercase">Qty</th>
        <th style="padding:10px 14px;text-align:right;font-size:11px;color:#9ca3af;text-transform:uppercase">Unit Price</th>
        <th style="padding:10px 14px;text-align:right;font-size:11px;color:#9ca3af;text-transform:uppercase">Amount</th>
      </tr></thead>
      <tbody>${itemRows}</tbody>
    </table>
    <div style="text-align:right">
      <table style="margin-left:auto">
        <tr><td style="padding:4px 16px;color:#6b7280;font-size:13px">Subtotal</td><td style="padding:4px 0;text-align:right;color:#374151;font-size:13px">${fmt(d.subtotal)}</td></tr>
        <tr><td style="padding:4px 16px;color:#6b7280;font-size:13px">Tax (${d.tax_rate}%)</td><td style="padding:4px 0;text-align:right;color:#374151;font-size:13px">${fmt(d.tax_amount)}</td></tr>
        ${parseFloat(d.discount_amount) > 0 ? `<tr><td style="padding:4px 16px;color:#6b7280;font-size:13px">Discount</td><td style="padding:4px 0;text-align:right;color:#059669;font-size:13px">-${fmt(d.discount_amount)}</td></tr>` : ''}
        <tr style="border-top:2px solid #e5e7eb"><td style="padding:10px 16px;font-weight:700;color:#111827;font-size:15px">TOTAL</td><td style="padding:10px 0;text-align:right;font-weight:700;color:#c9a96e;font-size:18px">${fmt(d.total_amount)}</td></tr>
        ${parseFloat(d.amount_paid) > 0 ? `<tr><td style="padding:4px 16px;color:#059669;font-size:13px">Paid</td><td style="padding:4px 0;text-align:right;color:#059669;font-size:13px">${fmt(d.amount_paid)}</td></tr>` : ''}
        ${parseFloat(d.balance_due) > 0 ? `<tr><td style="padding:4px 16px;color:#ef4444;font-weight:600;font-size:14px">Balance Due</td><td style="padding:4px 0;text-align:right;color:#ef4444;font-weight:700;font-size:14px">${fmt(d.balance_due)}</td></tr>` : ''}
      </table>
    </div>
    ${message ? `<div style="background:#f8f9fa;padding:16px;border-radius:8px;margin-top:20px;border-left:4px solid #c9a96e"><p style="margin:0;color:#374151;font-size:14px;line-height:1.6">${message}</p></div>` : ''}
    ${d.notes ? `<div style="margin-top:20px"><p style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 4px">Notes</p><p style="color:#374151;font-size:13px;margin:0">${d.notes}</p></div>` : ''}
    ${d.terms ? `<div style="margin-top:12px"><p style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 4px">Terms & Conditions</p><p style="color:#374151;font-size:13px;margin:0">${d.terms}</p></div>` : ''}
  </div>
  <div style="background:#f8f9fa;padding:16px 32px;border-top:1px solid #e5e7eb;text-align:center">
    <p style="color:#9ca3af;font-size:12px;margin:0">Please make payment by the due date. Contact: ${d.firm_email || process.env.SMTP_USER || ''} ${d.firm_phone ? '| ' + d.firm_phone : ''}</p>
  </div>
</div></body></html>`;

    await createTransporter().sendMail({
      from: `"${d.firm_name || 'Law Firm'}" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `Invoice ${d.invoice_number} — ${clientName}`,
      html
    });

    if (d.status === 'draft') {
      await query("UPDATE invoices SET status = 'sent' WHERE id = $1", [req.params.id]);
    }
    return successResponse(res, { sent: true, to: toEmail }, 'Invoice sent successfully');
  } catch (error) {
    logger.error('Send invoice error:', error);
    return errorResponse(res, 'Failed to send invoice email', 500);
  }
});

// ===== RECEIPT =====
router.get('/payments/:id/receipt', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT p.*, i.invoice_number, i.total_amount, i.balance_due as inv_balance,
              cl.first_name, cl.last_name, cl.organization_name, cl.email as client_email, cl.phone as client_phone,
              t.name as firm_name, t.email as firm_email, t.phone as firm_phone, t.address as firm_address,
              u.first_name as recv_first, u.last_name as recv_last
       FROM payments p
       LEFT JOIN invoices i ON p.invoice_id = i.id
       LEFT JOIN clients cl ON p.client_id = cl.id
       LEFT JOIN tenants t ON p.tenant_id = t.id
       LEFT JOIN users u ON p.received_by = u.id
       WHERE p.id = $1 AND p.tenant_id = $2`,
      [req.params.id, req.user.tenantId]
    );
    if (!result.rows.length) return errorResponse(res, 'Payment not found', 404);
    return successResponse(res, result.rows[0]);
  } catch (error) {
    return errorResponse(res, 'Failed to get receipt', 500);
  }
});

router.post('/payments/:id/send-receipt', authenticate, async (req, res) => {
  const { email } = req.body;
  try {
    const result = await query(
      `SELECT p.*, i.invoice_number, i.total_amount,
              cl.first_name, cl.last_name, cl.organization_name, cl.email as client_email, cl.phone as client_phone,
              t.name as firm_name, t.email as firm_email, t.phone as firm_phone,
              u.first_name as recv_first, u.last_name as recv_last
       FROM payments p
       LEFT JOIN invoices i ON p.invoice_id = i.id
       LEFT JOIN clients cl ON p.client_id = cl.id
       LEFT JOIN tenants t ON p.tenant_id = t.id
       LEFT JOIN users u ON p.received_by = u.id
       WHERE p.id = $1 AND p.tenant_id = $2`,
      [req.params.id, req.user.tenantId]
    );
    if (!result.rows.length) return errorResponse(res, 'Payment not found', 404);
    const d = result.rows[0];
    const clientName = d.organization_name || `${d.first_name || ''} ${d.last_name || ''}`.trim();
    const toEmail = email || d.client_email;
    if (!toEmail) return errorResponse(res, 'No recipient email address', 400);

    const receiptNo = `RCP-${d.id.slice(0,8).toUpperCase()}`;
    const html = `<!DOCTYPE html><html><body style="margin:0;padding:20px;background:#f8f9fa;font-family:Arial,sans-serif">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
  <div style="background:#0a0f2e;padding:28px 32px;text-align:center">
    <div style="width:56px;height:56px;background:#c9a96e;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px">
      <span style="color:#0a0f2e;font-size:24px">✓</span>
    </div>
    <h1 style="color:#c9a96e;margin:0;font-size:20px">${d.firm_name || 'Law Firm'}</h1>
    <p style="color:#94a3b8;margin:4px 0 0;font-size:13px">Official Payment Receipt</p>
  </div>
  <div style="padding:32px">
    <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:20px;text-align:center;margin-bottom:24px">
      <p style="color:#059669;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 4px">Amount Received</p>
      <p style="color:#065f46;font-size:32px;font-weight:700;margin:0">${fmt(d.amount)}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <tr style="border-bottom:1px solid #f3f4f6"><td style="padding:10px 0;color:#6b7280;font-size:13px">Receipt No.</td><td style="padding:10px 0;text-align:right;font-weight:600;color:#111827;font-size:13px">${receiptNo}</td></tr>
      <tr style="border-bottom:1px solid #f3f4f6"><td style="padding:10px 0;color:#6b7280;font-size:13px">Client</td><td style="padding:10px 0;text-align:right;font-weight:600;color:#111827;font-size:13px">${clientName}</td></tr>
      <tr style="border-bottom:1px solid #f3f4f6"><td style="padding:10px 0;color:#6b7280;font-size:13px">Invoice</td><td style="padding:10px 0;text-align:right;font-weight:600;color:#111827;font-size:13px">${d.invoice_number || 'N/A'}</td></tr>
      <tr style="border-bottom:1px solid #f3f4f6"><td style="padding:10px 0;color:#6b7280;font-size:13px">Payment Method</td><td style="padding:10px 0;text-align:right;font-weight:600;color:#111827;font-size:13px;text-transform:capitalize">${(d.payment_method || '').replace(/_/g,' ')}</td></tr>
      ${d.mpesa_code ? `<tr style="border-bottom:1px solid #f3f4f6"><td style="padding:10px 0;color:#6b7280;font-size:13px">MPesa Code</td><td style="padding:10px 0;text-align:right;font-weight:600;color:#111827;font-size:13px">${d.mpesa_code}</td></tr>` : ''}
      ${d.transaction_id ? `<tr style="border-bottom:1px solid #f3f4f6"><td style="padding:10px 0;color:#6b7280;font-size:13px">Transaction ID</td><td style="padding:10px 0;text-align:right;font-weight:600;color:#111827;font-size:13px">${d.transaction_id}</td></tr>` : ''}
      <tr style="border-bottom:1px solid #f3f4f6"><td style="padding:10px 0;color:#6b7280;font-size:13px">Date</td><td style="padding:10px 0;text-align:right;font-weight:600;color:#111827;font-size:13px">${new Date(d.payment_date).toLocaleDateString('en-KE',{day:'2-digit',month:'long',year:'numeric'})}</td></tr>
      <tr><td style="padding:10px 0;color:#6b7280;font-size:13px">Received by</td><td style="padding:10px 0;text-align:right;font-weight:600;color:#111827;font-size:13px">${d.recv_first || ''} ${d.recv_last || ''}</td></tr>
    </table>
    ${d.notes ? `<div style="background:#f8f9fa;padding:14px;border-radius:8px;margin-bottom:16px"><p style="color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 4px">Notes</p><p style="color:#374151;font-size:13px;margin:0">${d.notes}</p></div>` : ''}
  </div>
  <div style="background:#f8f9fa;padding:16px 32px;border-top:1px solid #e5e7eb;text-align:center">
    <p style="color:#9ca3af;font-size:12px;margin:0">Thank you for your payment. This is an official receipt from ${d.firm_name || 'our firm'}.</p>
    ${d.firm_phone ? `<p style="color:#9ca3af;font-size:12px;margin:4px 0 0">${d.firm_email || ''} | ${d.firm_phone}</p>` : ''}
  </div>
</div></body></html>`;

    await createTransporter().sendMail({
      from: `"${d.firm_name || 'Law Firm'}" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `Payment Receipt ${receiptNo} — ${clientName}`,
      html
    });
    return successResponse(res, { sent: true, to: toEmail }, 'Receipt sent successfully');
  } catch (error) {
    logger.error('Send receipt error:', error);
    return errorResponse(res, 'Failed to send receipt email', 500);
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
