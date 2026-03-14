import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, DollarSign, FileText, CreditCard, TrendingUp, Receipt, PiggyBank } from 'lucide-react'
import toast from 'react-hot-toast'
import { billingApi, casesApi, clientsApi } from '../../lib/api'
import { formatCurrency, formatDate } from '../../lib/utils'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import StatsCard from '../../components/ui/StatsCard'
import Modal from '../../components/ui/Modal'

const EXPENSE_CATEGORIES = ['court_fees','travel','filing','research','printing','accommodation','meals','other']
const PAYMENT_METHODS = ['mpesa','bank_transfer','cash','cheque','stripe','paypal','other']

export default function BillingPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab] = useState('invoices')
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')

  // Modals
  const [payModal, setPayModal] = useState(false)
  const [expenseModal, setExpenseModal] = useState(false)
  const [payment, setPayment] = useState({ invoiceId: '', clientId: '', amount: '', paymentMethod: 'mpesa', mpesaCode: '', transactionId: '', notes: '' })
  const [expense, setExpense] = useState({ caseId: '', clientId: '', category: 'court_fees', description: '', amount: '', expenseDate: new Date().toISOString().split('T')[0], isBillable: true })

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
  const { data: casesData } = useQuery({
    queryKey: ['cases-list'],
    queryFn: () => casesApi.getAll({ limit: 100 }).then(r => r.data.data)
  })
  const { data: clientsData } = useQuery({
    queryKey: ['clients-list'],
    queryFn: () => clientsApi.getAll({ limit: 100 }).then(r => r.data.data)
  })

  const invoices = invoicesData?.data || []
  const payments = paymentsData?.data || []
  const expenses = expensesData?.data || []
  const inv_pagination = invoicesData?.pagination || {}
  const cases = casesData || []
  const clients = clientsData || []

  const totalInvoiced = invoices.reduce((s, i) => s + parseFloat(i.total_amount || 0), 0)
  const totalPaid = invoices.reduce((s, i) => s + parseFloat(i.amount_paid || 0), 0)
  const totalOutstanding = invoices.reduce((s, i) => s + parseFloat(i.balance_due || 0), 0)

  const payMutation = useMutation({
    mutationFn: (data) => billingApi.recordPayment(data),
    onSuccess: () => {
      toast.success('Payment recorded!')
      setPayModal(false)
      setPayment({ invoiceId: '', clientId: '', amount: '', paymentMethod: 'mpesa', mpesaCode: '', transactionId: '', notes: '' })
      qc.invalidateQueries(['payments'])
      qc.invalidateQueries(['invoices'])
    },
    onError: () => toast.error('Failed to record payment')
  })

  const expenseMutation = useMutation({
    mutationFn: (data) => billingApi.addExpense(data),
    onSuccess: () => {
      toast.success('Expense recorded!')
      setExpenseModal(false)
      setExpense({ caseId: '', clientId: '', category: 'court_fees', description: '', amount: '', expenseDate: new Date().toISOString().split('T')[0], isBillable: true })
      qc.invalidateQueries(['expenses'])
    },
    onError: () => toast.error('Failed to record expense')
  })

  const submitPayment = () => {
    if (!payment.amount || parseFloat(payment.amount) <= 0) return toast.error('Enter a valid amount')
    payMutation.mutate({
      invoiceId: payment.invoiceId || undefined,
      clientId: payment.clientId || undefined,
      amount: parseFloat(payment.amount),
      paymentMethod: payment.paymentMethod,
      mpesaCode: payment.mpesaCode,
      transactionId: payment.transactionId,
      notes: payment.notes
    })
  }

  const submitExpense = () => {
    if (!expense.description.trim()) return toast.error('Enter a description')
    if (!expense.amount || parseFloat(expense.amount) <= 0) return toast.error('Enter a valid amount')
    expenseMutation.mutate({
      caseId: expense.caseId || undefined,
      clientId: expense.clientId || undefined,
      category: expense.category,
      description: expense.description.trim(),
      amount: parseFloat(expense.amount),
      expenseDate: expense.expenseDate,
      isBillable: expense.isBillable
    })
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Playfair Display' }}>Billing & Finance</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage invoices, payments & expenses</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setExpenseModal(true)} className="flex items-center gap-2 text-sm px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors">
            <PiggyBank size={15} /> Record Expense
          </button>
          <button onClick={() => setPayModal(true)} className="flex items-center gap-2 text-sm px-4 py-2 border border-[#c9a96e] rounded-lg text-[#c9a96e] hover:bg-amber-50 transition-colors">
            <Receipt size={15} /> Record Payment
          </button>
          <button onClick={() => navigate('/dashboard/billing/invoices/new')} className="btn-gold flex items-center gap-2 text-sm">
            <Plus size={16} /> New Invoice
          </button>
        </div>
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

        {tab === 'invoices' && (
          <>
            <div className="p-4 border-b border-gray-50">
              <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} className="input-field w-44 text-sm">
                <option value="">All Statuses</option>
                {['draft','sent','paid','partially_paid','overdue','cancelled'].map(s => (
                  <option key={s} value={s} className="capitalize">{s.replace('_',' ')}</option>
                ))}
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
                      <tr key={inv.id} onClick={() => navigate(`/dashboard/billing/invoices/${inv.id}`)} className="border-b border-gray-50 hover:bg-amber-50/30 cursor-pointer transition-colors">
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
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-amber-50/30 transition-colors">
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
                    <tr key={e.id} className="border-b border-gray-50 hover:bg-amber-50/30 transition-colors">
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-gray-800">{e.description}</p>
                        {e.is_billable && <span className="text-xs text-[#c9a96e] font-medium">Billable</span>}
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

      {/* ── Record Payment Modal ──────────────────────────────────── */}
      <Modal isOpen={payModal} onClose={() => setPayModal(false)} title="Record Payment" size="sm">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Invoice (optional)</label>
              <select value={payment.invoiceId} onChange={e => setPayment(p => ({ ...p, invoiceId: e.target.value }))}
                className="mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e]">
                <option value="">No invoice</option>
                {invoices.filter(i => i.status !== 'paid').map(i => (
                  <option key={i.id} value={i.id}>{i.invoice_number} — {formatCurrency(i.balance_due)} due</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Client (optional)</label>
              <select value={payment.clientId} onChange={e => setPayment(p => ({ ...p, clientId: e.target.value }))}
                className="mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e]">
                <option value="">Select client</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.organization_name || `${c.first_name} ${c.last_name}`}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Amount (KES) *</label>
            <input type="number" value={payment.amount} onChange={e => setPayment(p => ({ ...p, amount: e.target.value }))}
              placeholder="0.00" className="mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e]" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Payment Method *</label>
            <select value={payment.paymentMethod} onChange={e => setPayment(p => ({ ...p, paymentMethod: e.target.value }))}
              className="mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e]">
              {PAYMENT_METHODS.map(m => <option key={m} value={m} className="capitalize">{m.replace('_',' ')}</option>)}
            </select>
          </div>
          {payment.paymentMethod === 'mpesa' && (
            <div>
              <label className="text-sm font-medium text-gray-700">MPesa Code</label>
              <input value={payment.mpesaCode} onChange={e => setPayment(p => ({ ...p, mpesaCode: e.target.value }))}
                placeholder="e.g. QJL9XK..." className="mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e]" />
            </div>
          )}
          {['bank_transfer','cheque','stripe','paypal'].includes(payment.paymentMethod) && (
            <div>
              <label className="text-sm font-medium text-gray-700">Transaction / Reference ID</label>
              <input value={payment.transactionId} onChange={e => setPayment(p => ({ ...p, transactionId: e.target.value }))}
                placeholder="Transaction reference" className="mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e]" />
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-gray-700">Notes</label>
            <input value={payment.notes} onChange={e => setPayment(p => ({ ...p, notes: e.target.value }))}
              placeholder="Optional notes" className="mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e]" />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setPayModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={submitPayment} disabled={payMutation.isLoading} className="btn-gold text-sm px-5 py-2">
              {payMutation.isLoading ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Record Expense Modal ──────────────────────────────────── */}
      <Modal isOpen={expenseModal} onClose={() => setExpenseModal(false)} title="Record Expense" size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Description *</label>
            <input value={expense.description} onChange={e => setExpense(x => ({ ...x, description: e.target.value }))}
              placeholder="What was the expense for?" className="mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Amount (KES) *</label>
              <input type="number" value={expense.amount} onChange={e => setExpense(x => ({ ...x, amount: e.target.value }))}
                placeholder="0.00" className="mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e]" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Date *</label>
              <input type="date" value={expense.expenseDate} onChange={e => setExpense(x => ({ ...x, expenseDate: e.target.value }))}
                className="mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Category *</label>
              <select value={expense.category} onChange={e => setExpense(x => ({ ...x, category: e.target.value }))}
                className="mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e]">
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c.replace('_',' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Link to Case</label>
              <select value={expense.caseId} onChange={e => setExpense(x => ({ ...x, caseId: e.target.value }))}
                className="mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e]">
                <option value="">No case</option>
                {cases.map(c => <option key={c.id} value={c.id}>{c.case_number}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Client (optional)</label>
            <select value={expense.clientId} onChange={e => setExpense(x => ({ ...x, clientId: e.target.value }))}
              className="mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e]">
              <option value="">Select client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.organization_name || `${c.first_name} ${c.last_name}`}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={expense.isBillable} onChange={e => setExpense(x => ({ ...x, isBillable: e.target.checked }))}
              className="w-4 h-4 accent-[#c9a96e]" />
            <span className="text-sm text-gray-700">This expense is billable to the client</span>
          </label>
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setExpenseModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={submitExpense} disabled={expenseMutation.isLoading} className="btn-gold text-sm px-5 py-2">
              {expenseMutation.isLoading ? 'Saving...' : 'Record Expense'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
