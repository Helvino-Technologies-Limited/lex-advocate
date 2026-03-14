const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { query } = require('../database/connection');
const { successResponse, errorResponse } = require('../utils/apiResponse');

router.get('/stats', authenticate, async (req, res) => {
  const tenantId = req.user.tenantId;
  try {
    const [cases, clients, tasks, invoices, payments, upcomingHearings, overdueTasksResult, recentActivity] = await Promise.all([
      query(`SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'new') as new_cases,
        COUNT(*) FILTER (WHERE status = 'closed') as closed,
        COUNT(*) FILTER (WHERE status = 'pending') as pending
        FROM cases WHERE tenant_id = $1`, [tenantId]),

      query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'active') as active FROM clients WHERE tenant_id = $1`, [tenantId]),

      query(`SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'not_started') as not_started,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('completed','cancelled')) as overdue
        FROM tasks WHERE tenant_id = $1`, [tenantId]),

      query(`SELECT
        COALESCE(SUM(total_amount), 0) as total_invoiced,
        COALESCE(SUM(amount_paid), 0) as total_paid,
        COALESCE(SUM(balance_due), 0) as total_outstanding,
        COUNT(*) FILTER (WHERE status = 'overdue') as overdue_count
        FROM invoices WHERE tenant_id = $1`, [tenantId]),

      query(`SELECT COALESCE(SUM(amount), 0) as total_received FROM payments WHERE tenant_id = $1 AND status = 'completed'`, [tenantId]),

      query(`SELECT h.*, c.case_number, c.title as case_title FROM hearings h
             JOIN cases c ON h.case_id = c.id
             WHERE c.tenant_id = $1 AND h.hearing_date > NOW() AND h.status = 'scheduled'
             ORDER BY h.hearing_date ASC LIMIT 5`, [tenantId]),

      query(`SELECT COUNT(*) as count FROM tasks WHERE tenant_id = $1 AND due_date < NOW() AND status NOT IN ('completed','cancelled')`, [tenantId]),

      query(`SELECT 'case' as type, title as description, created_at FROM cases WHERE tenant_id = $1
             UNION ALL SELECT 'client' as type, CONCAT(first_name, ' ', last_name) as description, created_at FROM clients WHERE tenant_id = $1
             UNION ALL SELECT 'invoice' as type, invoice_number as description, created_at FROM invoices WHERE tenant_id = $1
             ORDER BY created_at DESC LIMIT 10`, [tenantId])
    ]);

    // Monthly revenue (last 6 months)
    const monthlyRevenue = await query(`
      SELECT DATE_TRUNC('month', payment_date) as month, COALESCE(SUM(amount), 0) as total
      FROM payments WHERE tenant_id = $1 AND status = 'completed' AND payment_date > NOW() - INTERVAL '6 months'
      GROUP BY month ORDER BY month ASC`, [tenantId]);

    // Case types distribution
    const caseTypes = await query(`
      SELECT COALESCE(case_type, 'Unspecified') as type, COUNT(*) as count
      FROM cases WHERE tenant_id = $1 GROUP BY case_type ORDER BY count DESC LIMIT 8`, [tenantId]);

    return successResponse(res, {
      cases: cases.rows[0],
      clients: clients.rows[0],
      tasks: tasks.rows[0],
      billing: { ...invoices.rows[0], total_received: payments.rows[0].total_received },
      upcomingHearings: upcomingHearings.rows,
      overdueTasksCount: parseInt(overdueTasksResult.rows[0].count),
      recentActivity: recentActivity.rows,
      monthlyRevenue: monthlyRevenue.rows,
      caseTypes: caseTypes.rows
    });
  } catch (error) {
    return errorResponse(res, 'Failed to get dashboard stats', 500);
  }
});

module.exports = router;
