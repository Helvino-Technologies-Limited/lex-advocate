import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, DollarSign, FileText, CreditCard, TrendingUp } from 'lucide-react'
import { billingApi } from '../../lib/api'
import { formatCurrency, formatDate } from '../../lib/utils'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import StatsCard from '../../components/ui/StatsCard'

export default function BillingPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('invoices')
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')

  const { data: invoicesData, isLoading: invLoading } = useQuery({
    queryKey: ['invoices', status, page],
    queryFn: () => billingApi.getInvoices({ status, page, limit: 20 }).then(r => r.data),
    keepPreviousData: true
  })

  const { data: paymentsData, isLoading: payLoading } = useQuery({
    queryKey: ['payments', page],
    queryFn: () => billingApi.getPayments({ page, limit: 20 }).then(r => r.data),
    enabled: tab === 'payments'
  })

  const { data: expensesData, isLoading: expLoading } = useQuery({
    queryKey: ['expenses', page],
    queryFn: () => billingApi.getExpenses({ page, limit: 20 }).then(r => r.data),
    enabled: tab === 'expenses'
  })

  const invoices = invoicesData?.data || []
  const payments = paymentsData?.data || []
  const expenses = expensesData?.data || []
  const inv_pagination = invoicesData?.pagination || {}

  const totalInvoiced = invoices.reduce((s, i) => s + parseFloat(i.total_amount || 0), 0)
  const totalPaid = invoices.reduce((s, i) => s + parseFloat(i.amount_paid || 0), 0)
  const totalOutstanding = invoices.reduce((s, i) => s + parseFloat(i.balance_due || 0), 0)

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Playfair Display' }}>Billing & Finance</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage invoices, payments & expenses</p>
        </div>
        <button onClick={() => navigate('/dashboard/billing/invoices/new')} className="btn-gold flex items-center gap-2 text-sm">
          <Plus size={16} /> New Invoice
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard title="Total Invoiced" value={formatCurrency(totalInvoiced)} icon={<FileText size={20} />} color="navy" />
        <StatsCard title="Total Collected" value={formatCurrency(totalPaid)} icon={<TrendingUp size={20} />} color="green" />
        <StatsCard title="Outstanding" value={formatCurrency(totalOutstanding)} icon={<DollarSign size={20} />} color="gold" />
        <StatsCard title="Invoices" value={inv_pagination.total || 0} icon={<CreditCard size={20} />} color="blue" />
      </div>

      <div className="card overflow-hidden">
        <div className="flex border-b border-gray-100">
          {['invoices','payments','expenses'].map(t => (
            <button key={t} onClick={() => { setTab(t); setPage(1) }}
              className={`px-5 py-3.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${tab === t ? 'border-[#c9a96e] text-[#c9a96e]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="p-0">
          {tab === 'invoices' && (
            <>
              <div className="p-4 border-b border-gray-50">
                <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} className="input-field w-44 text-sm">
                  <option value="">All Statuses</option>
                  {['draft','sent','paid','partially_paid','overdue','cancelled'].map(s => <option key={s} value={s} className="capitalize">{s.replace('_',' ')}</option>)}
                </select>
              </div>
              {invLoading ? <div className="flex justify-center py-12"><Spinner /></div> : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Invoice</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Client</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Due Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map(inv => (
                        <tr key={inv.id} onClick={() => navigate(`/dashboard/billing/invoices/${inv.id}`)} className="border-b border-gray-50 hover:bg-amber-50/30 cursor-pointer">
                          <td className="px-5 py-4">
                            <p className="text-sm font-semibold text-gray-900">{inv.invoice_number}</p>
                            <p className="text-xs text-gray-400">{formatDate(inv.invoice_date)}</p>
                          </td>
                          <td className="px-5 py-4 hidden md:table-cell">
                            <p className="text-sm text-gray-700">{inv.organization_name || `${inv.client_first || ''} ${inv.client_last || ''}`.trim() || '—'}</p>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-sm font-bold text-gray-900">{formatCurrency(inv.total_amount)}</p>
                            {parseFloat(inv.balance_due) > 0 && <p className="text-xs text-red-500">Due: {formatCurrency(inv.balance_due)}</p>}
                          </td>
                          <td className="px-5 py-4"><Badge status={inv.status}>{inv.status?.replace('_',' ')}</Badge></td>
                          <td className="px-5 py-4 hidden md:table-cell">
                            <p className="text-sm text-gray-500">{inv.due_date ? formatDate(inv.due_date) : '—'}</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!invoices.length && <div className="text-center py-12 text-gray-400 text-sm">No invoices found</div>}
                </div>
              )}
            </>
          )}

          {tab === 'payments' && (
            payLoading ? <div className="flex justify-center py-12"><Spinner /></div> : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Payment</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Client</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Method</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id} className="border-b border-gray-50 hover:bg-amber-50/30">
                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-gray-900">{p.invoice_number || 'Direct payment'}</p>
                          <p className="text-xs text-gray-400">{p.mpesa_code || p.transaction_id || ''}</p>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell">
                          <p className="text-sm text-gray-700">{p.organization_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || '—'}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm font-bold text-green-600">{formatCurrency(p.amount)}</p>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell">
                          <Badge status="active">{p.payment_method?.replace('_',' ')}</Badge>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm text-gray-500">{formatDate(p.payment_date)}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!payments.length && <div className="text-center py-12 text-gray-400 text-sm">No payments recorded</div>}
              </div>
            )
          )}

          {tab === 'expenses' && (
            expLoading ? <div className="flex justify-center py-12"><Spinner /></div> : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Expense</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Case</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Category</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map(e => (
                      <tr key={e.id} className="border-b border-gray-50 hover:bg-amber-50/30">
                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-gray-800">{e.description}</p>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell">
                          <p className="text-sm text-gray-600">{e.case_number || '—'}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm font-bold text-red-600">{formatCurrency(e.amount)}</p>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell">
                          <Badge status="pending">{e.category?.replace('_',' ')}</Badge>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm text-gray-500">{formatDate(e.expense_date)}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!expenses.length && <div className="text-center py-12 text-gray-400 text-sm">No expenses recorded</div>}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
