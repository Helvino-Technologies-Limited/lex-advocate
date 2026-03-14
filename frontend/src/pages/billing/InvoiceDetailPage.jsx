import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Printer, CreditCard } from 'lucide-react'
import toast from 'react-hot-toast'
import { billingApi } from '../../lib/api'
import { formatCurrency, formatDate } from '../../lib/utils'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'

export default function InvoiceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [payModal, setPayModal] = useState(false)
  const [payment, setPayment] = useState({ amount: '', paymentMethod: 'mpesa', mpesaCode: '', notes: '' })

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => billingApi.getInvoice(id).then(r => r.data.data)
  })

  const payMutation = useMutation({
    mutationFn: (data) => billingApi.recordPayment({ ...data, invoiceId: id, clientId: invoice?.client_id }),
    onSuccess: () => { toast.success('Payment recorded!'); setPayModal(false); qc.invalidateQueries(['invoice', id]) },
    onError: () => toast.error('Failed to record payment')
  })

  const statusMutation = useMutation({
    mutationFn: (status) => billingApi.updateInvoiceStatus(id, status),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries(['invoice', id]) }
  })

  if (isLoading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>
  if (!invoice) return <div className="text-center py-24 text-gray-500">Invoice not found</div>

  const clientName = invoice.organization_name || `${invoice.client_first || ''} ${invoice.client_last || ''}`.trim()

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Playfair Display' }}>{invoice.invoice_number}</h1>
            <p className="text-sm text-gray-500">Invoice for {clientName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge status={invoice.status}>{invoice.status?.replace('_',' ')}</Badge>
          {invoice.status !== 'paid' && (
            <button onClick={() => setPayModal(true)} className="btn-gold flex items-center gap-2 text-sm">
              <CreditCard size={14} /> Record Payment
            </button>
          )}
          <select value={invoice.status} onChange={e => statusMutation.mutate(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#c9a96e] bg-white">
            {['draft','sent','paid','partially_paid','overdue','cancelled','void'].map(s => <option key={s} value={s} className="capitalize">{s.replace('_',' ')}</option>)}
          </select>
        </div>
      </div>

      <div className="card p-6">
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Bill To</h3>
            <p className="font-bold text-gray-900">{clientName}</p>
            {invoice.client_email && <p className="text-sm text-gray-600">{invoice.client_email}</p>}
            {invoice.client_phone && <p className="text-sm text-gray-600">{invoice.client_phone}</p>}
            {invoice.client_address && <p className="text-sm text-gray-500">{invoice.client_address}</p>}
          </div>
          <div className="md:text-right">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Invoice Details</h3>
            <p className="text-sm text-gray-600">Date: <span className="font-medium text-gray-800">{formatDate(invoice.invoice_date)}</span></p>
            {invoice.due_date && <p className="text-sm text-gray-600">Due: <span className="font-medium text-gray-800">{formatDate(invoice.due_date)}</span></p>}
            {invoice.case_number && <p className="text-sm text-gray-600">Case: <span className="font-medium text-gray-800">{invoice.case_number}</span></p>}
          </div>
        </div>

        <div className="border border-gray-100 rounded-xl overflow-hidden mb-6">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Description</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Qty</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Unit Price</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-700">{item.description}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-center">{item.quantity}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatCurrency(item.unit_price)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800 text-right">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            {[
              ['Subtotal', invoice.subtotal, 'text-gray-600'],
              [`Tax (${invoice.tax_rate}%)`, invoice.tax_amount, 'text-gray-600'],
              invoice.discount_amount > 0 ? ['Discount', `-${formatCurrency(invoice.discount_amount)}`, 'text-green-600', true] : null,
              ['Total', invoice.total_amount, 'text-gray-900 font-bold text-lg', false, true],
              ['Paid', invoice.amount_paid, 'text-green-600 font-semibold'],
              ['Balance Due', invoice.balance_due, 'text-red-600 font-bold'],
            ].filter(Boolean).map(([label, value, cls, raw, large]) => (
              <div key={label} className={`flex justify-between ${large ? 'border-t border-gray-200 pt-2 mt-2' : ''}`}>
                <span className="text-sm text-gray-500">{label}</span>
                <span className={`text-sm ${cls}`}>{raw ? value : formatCurrency(value)}</span>
              </div>
            ))}
          </div>
        </div>

        {(invoice.notes || invoice.terms) && (
          <div className="mt-6 pt-6 border-t border-gray-100 grid md:grid-cols-2 gap-4">
            {invoice.notes && <div><p className="text-xs font-bold text-gray-400 uppercase mb-1">Notes</p><p className="text-sm text-gray-600">{invoice.notes}</p></div>}
            {invoice.terms && <div><p className="text-xs font-bold text-gray-400 uppercase mb-1">Terms</p><p className="text-sm text-gray-600">{invoice.terms}</p></div>}
          </div>
        )}
      </div>

      {invoice.payments?.length > 0 && (
        <div className="card p-5">
          <h3 className="font-bold text-gray-900 mb-4" style={{ fontFamily: 'Playfair Display' }}>Payment History</h3>
          <div className="space-y-2">
            {invoice.payments.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-100 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-800 capitalize">{p.payment_method?.replace('_',' ')}</p>
                  <p className="text-xs text-gray-500">{p.mpesa_code || p.transaction_id || ''} • {formatDate(p.payment_date)}</p>
                </div>
                <p className="text-sm font-bold text-green-700">{formatCurrency(p.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal isOpen={payModal} onClose={() => setPayModal(false)} title="Record Payment" size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Amount *</label>
            <input type="number" value={payment.amount} onChange={e => setPayment(p => ({ ...p, amount: e.target.value }))}
              placeholder={`Balance due: ${formatCurrency(invoice.balance_due)}`}
              className="mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e]" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Payment Method *</label>
            <select value={payment.paymentMethod} onChange={e => setPayment(p => ({ ...p, paymentMethod: e.target.value }))}
              className="mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e]">
              {['mpesa','bank_transfer','cash','cheque','stripe','paypal','other'].map(m => <option key={m} value={m} className="capitalize">{m.replace('_',' ')}</option>)}
            </select>
          </div>
          {payment.paymentMethod === 'mpesa' && (
            <div>
              <label className="text-sm font-medium text-gray-700">MPesa Code</label>
              <input value={payment.mpesaCode} onChange={e => setPayment(p => ({ ...p, mpesaCode: e.target.value }))}
                placeholder="e.g., QJL9XK..." className="mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e]" />
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-gray-700">Notes</label>
            <input value={payment.notes} onChange={e => setPayment(p => ({ ...p, notes: e.target.value }))}
              placeholder="Payment notes" className="mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e]" />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setPayModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={() => payMutation.mutate({ amount: parseFloat(payment.amount), paymentMethod: payment.paymentMethod, mpesaCode: payment.mpesaCode, notes: payment.notes })}
              disabled={!payment.amount || payMutation.isLoading} className="btn-gold text-sm px-5 py-2">
              {payMutation.isLoading ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
