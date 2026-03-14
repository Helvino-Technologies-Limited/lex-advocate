const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { query } = require('../database/connection');
const { successResponse, errorResponse } = require('../utils/apiResponse');

router.get('/financial', authenticate, authorize('admin', 'accountant'), async (req, res) => {
  const { startDate, endDate } = req.query;
  const tenantId = req.user.tenantId;
  try {
    const start = startDate || new Date(new Date().getFullYear(), 0, 1).toISOString();
    const end = endDate || new Date().toISOString();

    const [revenue, expenses, outstanding, topClients] = await Promise.all([
      query(`SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
             FROM payments WHERE tenant_id = $1 AND status = 'completed' AND payment_date BETWEEN $2 AND $3`,
             [tenantId, start, end]),
      query(`SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
             FROM expenses WHERE tenant_id = $1 AND expense_date BETWEEN $2 AND $3`,
             [tenantId, start, end]),
      query(`SELECT COALESCE(SUM(balance_due), 0) as total FROM invoices WHERE tenant_id = $1 AND status NOT IN ('paid','void','cancelled')`, [tenantId]),
      query(`SELECT cl.first_name, cl.last_name, cl.organization_name,
             COALESCE(SUM(p.amount), 0) as total_paid
             FROM payments p JOIN invoices i ON p.invoice_id = i.id JOIN clients cl ON i.client_id = cl.id
             WHERE p.tenant_id = $1 AND p.status = 'completed' AND p.payment_date BETWEEN $2 AND $3
             GROUP BY cl.id, cl.first_name, cl.last_name, cl.organization_name
             ORDER BY total_paid DESC LIMIT 10`, [tenantId, start, end])
    ]);

    return successResponse(res, {
      revenue: revenue.rows[0],
      expenses: expenses.rows[0],
      outstanding: outstanding.rows[0],
      topClients: topClients.rows,
      period: { start, end }
    });
  } catch (error) {
    return errorResponse(res, 'Failed to generate report', 500);
  }
});

router.get('/cases', authenticate, async (req, res) => {
  const tenantId = req.user.tenantId;
  try {
    const [statusDist, typeDist, advocateLoad, monthlyNew] = await Promise.all([
      query(`SELECT status, COUNT(*) as count FROM cases WHERE tenant_id = $1 GROUP BY status`, [tenantId]),
      query(`SELECT COALESCE(case_type, 'Unspecified') as type, COUNT(*) as count FROM cases WHERE tenant_id = $1 GROUP BY case_type ORDER BY count DESC`, [tenantId]),
      query(`SELECT u.first_name, u.last_name, COUNT(c.id) as case_count,
             COUNT(c.id) FILTER (WHERE c.status = 'active') as active_cases
             FROM users u LEFT JOIN cases c ON u.id = c.lead_advocate_id AND c.tenant_id = $1
             WHERE u.tenant_id = $1 AND u.role = 'advocate' GROUP BY u.id, u.first_name, u.last_name`, [tenantId]),
      query(`SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) as count
             FROM cases WHERE tenant_id = $1 AND created_at > NOW() - INTERVAL '12 months'
             GROUP BY month ORDER BY month ASC`, [tenantId])
    ]);

    return successResponse(res, { statusDistribution: statusDist.rows, typeDistribution: typeDist.rows, advocateWorkload: advocateLoad.rows, monthlyNew: monthlyNew.rows });
  } catch (error) {
    return errorResponse(res, 'Failed to generate case report', 500);
  }
});

module.exports = router;
