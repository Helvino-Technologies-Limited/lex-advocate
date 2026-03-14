import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CreditCard, Send, MessageCircle, Mail, CheckCircle2, Receipt } from 'lucide-react'
import toast from 'react-hot-toast'
import { billingApi } from '../../lib/api'
import { formatCurrency, formatDate } from '../../lib/utils'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'

function buildWhatsAppInvoiceText(inv, clientName) {
  const lines = [
    `*INVOICE: ${inv.invoice_number}*`,
    `From: ${inv.firm_name || 'Law Firm'}`,
    ``,
    `Dear ${clientName},`,
    ``,
    `Please find your invoice details below:`,
    ...(inv.items || []).map(it => `• ${it.description} — KES ${parseFloat(it.amount).toLocaleString()}`),
    ``,
    `Subtotal: KES ${parseFloat(inv.subtotal || 0).toLocaleString()}`,
    inv.tax_rate > 0 ? `Tax (${inv.tax_rate}%): KES ${parseFloat(inv.tax_amount || 0).toLocaleString()}` : null,
    `*TOTAL: KES ${parseFloat(inv.total_amount || 0).toLocaleString()}*`,
    inv.due_date ? `Due Date: ${new Date(inv.due_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' })}` : null,
    ``,
    `Kindly arrange payment at your earliest convenience.`,
    `Thank you.`
  ].filter(l => l !== null)
  return lines.join('\n')
}

function buildWhatsAppReceiptText(payment, clientName, firmName) {
  const receiptNo = `RCP-${payment.id?.slice(0, 8).toUpperCase() || ''}`
  return [
    `*PAYMENT RECEIPT: ${receiptNo}*`,
    `From: ${firmName || 'Law Firm'}`,
    ``,
    `Dear ${clientName},`,
    ``,
    `✅ We have received your payment.`,
    ``,
    `Amount: *KES ${parseFloat(payment.amount || 0).toLocaleString()}*`,
    `Method: ${(payment.payment_method || '').replace(/_/g, ' ')}`,
    payment.mpesa_code ? `MPesa Code: ${payment.mpesa_code}` : null,
    payment.transaction_id ? `Reference: ${payment.transaction_id}` : null,
    `Date: ${new Date(payment.payment_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' })}`,
    payment.invoice_number ? `Invoice: ${payment.invoice_number}` : null,
    ``,
    `Thank you for your payment.`
  ].filter(l => l !== null).join('\n')
}

function cleanPhone(phone) {
  if (!phone) return ''
  return phone.replace(/[\s\-+()]/g, '')
}

export default function InvoiceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [payModal, setPayModal] = useState(false)
  const [sendModal, setSendModal] = useState(false)
  const [receiptModal, setReceiptModal] = useState({ open: false, paymentId: null })
  const [sendTab, setSendTab] = useState('email')
  const [receiptTab, setReceiptTab] = useState('email')
  const [sendEmail, setSendEmail] = useState('')
  const [sendMessage, setSendMessage] = useState('')
  const [receiptEmail, setReceiptEmail] = useState('')
  const [payment, setPayment] = useState({ amount: '', paymentMethod: 'mpesa', mpesaCode: '', transactionId: '', notes: '' })

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => billingApi.getInvoice(id).then(r => r.data.data)
  })

  const { data: receiptData } = useQuery({
    queryKey: ['receipt', receiptModal.paymentId],
    queryFn: () => billingApi.getPaymentReceipt(receiptModal.paymentId).then(r => r.data.data),
    enabled: !!receiptModal.paymentId && receiptModal.open
  })

  const payMutation = useMutation({
    mutationFn: (data) => billingApi.recordPayment({ ...data, invoiceId: id, clientId: invoice?.client_id }),
    onSuccess: () => {
      toast.success('Payment recorded!')
      setPayModal(false)
      setPayment({ amount: '', paymentMethod: 'mpesa', mpesaCode: '', transactionId: '', notes: '' })
      qc.invalidateQueries(['invoice', id])
      qc.invalidateQueries(['invoices'])
      qc.invalidateQueries(['payments'])
    },
    onError: () => toast.error('Failed to record payment')
  })

  const sendInvoiceMutation = useMutation({
    mutationFn: (data) => billingApi.sendInvoice(id, data),
    onSuccess: (_, vars) => {
      toast.success(`Invoice sent to ${vars.email}!`)
      setSendModal(false)
      qc.invalidateQueries(['invoice', id])
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to send invoice')
  })

  const sendReceiptMutation = useMutation({
    mutationFn: ({ paymentId, email }) => billingApi.sendPaymentReceipt(paymentId, { email }),
    onSuccess: (_, vars) => {
      toast.success(`Receipt sent to ${vars.email}!`)
      setReceiptModal({ open: false, paymentId: null })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to send receipt')
  })

  const statusMutation = useMutation({
    mutationFn: (status) => billingApi.updateInvoiceStatus(id, status),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries(['invoice', id]) }
  })

  if (isLoading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>
  if (!invoice) return <div className="text-center py-24 text-gray-500">Invoice not found</div>

  const clientName = invoice.organization_name || `${invoice.client_first || ''} ${invoice.client_last || ''}`.trim()
  const selectedPayment = receiptModal.paymentId ? invoice.payments?.find(p => p.id === receiptModal.paymentId) : null
  const clientPhone = cleanPhone(invoice.client_phone)

  const openSendModal = () => {
    setSendEmail(invoice.client_email || '')
    setSendModal(true)
  }

  const openReceiptModal = (paymentId) => {
    setReceiptEmail(invoice.client_email || '')
    setReceiptModal({ open: true, paymentId })
  }

  const handleSendInvoiceEmail = () => {
    if (!sendEmail.trim()) return toast.error('Enter recipient email')
    sendInvoiceMutation.mutate({ email: sendEmail.trim(), message: sendMessage.trim() || undefined })
  }

  const handleSendInvoiceWhatsApp = () => {
    const phone = cleanPhone(sendEmail || clientPhone)
    if (!phone) return toast.error('Enter a WhatsApp phone number')
    const text = buildWhatsAppInvoiceText(invoice, clientName)
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank')
  }

  const handleSendReceiptEmail = () => {
    if (!receiptEmail.trim()) return toast.error('Enter recipient email')
    sendReceiptMutation.mutate({ paymentId: receiptModal.paymentId, email: receiptEmail.trim() })
  }

  const handleSendReceiptWhatsApp = () => {
    const phone = cleanPhone(receiptEmail || clientPhone)
    if (!phone) return toast.error('Enter a WhatsApp phone number')
    const firmName = invoice.firm_name || 'Law Firm'
    const p = selectedPayment || {}
    const text = buildWhatsAppReceiptText(p, clientName, firmName)
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Playfair Display' }}>{invoice.invoice_number}</h1>
            <p className="text-sm text-gray-500">Invoice for {clientName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge status={invoice.status}>{invoice.status?.replace('_',' ')}</Badge>
          <button onClick={openSendModal} className="flex items-center gap-1.5 text-sm px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors">
            <Send size={14} /> Send Invoice
          </button>
          {invoice.status !== 'paid' && (
            <button onClick={() => setPayModal(true)} className="btn-gold flex items-center gap-2 text-sm">
              <CreditCard size={14} /> Record Payment
            </button>
          )}
          <select value={invoice.status} onChange={e => statusMutation.mutate(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#c9a96e] bg-white">
            {['draft','sent','paid','partially_paid','overdue','cancelled','void'].map(s => (
              <option key={s} value={s} className="capitalize">{s.replace('_',' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Invoice card */}
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

      {/* Payment History */}
      {invoice.payments?.length > 0 && (
        <div className="card p-5">
          <h3 className="font-bold text-gray-900 mb-4" style={{ fontFamily: 'Playfair Display' }}>Payment History</h3>
          <div className="space-y-2">
            {invoice.payments.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-100 rounded-xl">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={18} className="text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-800 capitalize">{p.payment_method?.replace('_',' ')}</p>
                    <p className="text-xs text-gray-500">{p.mpesa_code || p.transaction_id || ''} {p.mpesa_code || p.transaction_id ? '•' : ''} {formatDate(p.payment_date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-bold text-green-700">{formatCurrency(p.amount)}</p>
                  <button onClick={() => openReceiptModal(p.id)}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 border border-green-200 rounded-lg text-green-700 hover:bg-green-100 transition-colors">
                    <Receipt size={12} /> Receipt
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Record Payment Modal ─────────────────────────────── */}
      <Modal isOpen={payModal} onClose={() => setPayModal(false)} title="Record Payment" size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Amount (KES) *</label>
            <input type="number" value={payment.amount}
              onChange={e => setPayment(p => ({ ...p, amount: e.target.value }))}
              placeholder={`Balance due: ${formatCurrency(invoice.balance_due)}`}
              className="mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e]" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Payment Method *</label>
            <select value={payment.paymentMethod} onChange={e => setPayment(p => ({ ...p, paymentMethod: e.target.value }))}
              className="mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e]">
              {['mpesa','bank_transfer','cash','cheque','stripe','paypal','other'].map(m => (
                <option key={m} value={m} className="capitalize">{m.replace('_',' ')}</option>
              ))}
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
              <label className="text-sm font-medium text-gray-700">Transaction ID / Reference</label>
              <input value={payment.transactionId} onChange={e => setPayment(p => ({ ...p, transactionId: e.target.value }))}
                placeholder="Transaction reference" className="mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e]" />
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-gray-700">Notes</label>
            <input value={payment.notes} onChange={e => setPayment(p => ({ ...p, notes: e.target.value }))}
              placeholder="Payment notes" className="mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e]" />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setPayModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
            <button
              onClick={() => payMutation.mutate({ amount: parseFloat(payment.amount), paymentMethod: payment.paymentMethod, mpesaCode: payment.mpesaCode, transactionId: payment.transactionId, notes: payment.notes })}
              disabled={!payment.amount || payMutation.isLoading}
              className="btn-gold text-sm px-5 py-2">
              {payMutation.isLoading ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Send Invoice Modal ───────────────────────────────── */}
      <Modal isOpen={sendModal} onClose={() => setSendModal(false)} title="Send Invoice" size="md">
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            {[['email', <Mail size={14} />, 'Email'], ['whatsapp', <MessageCircle size={14} />, 'WhatsApp']].map(([key, icon, label]) => (
              <button key={key} onClick={() => setSendTab(key)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${sendTab === key ? 'border-[#c9a96e] text-[#c9a96e]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {icon} {label}
              </button>
            ))}
          </div>

          {sendTab === 'email' ? (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700">Recipient Email *</label>
                <input value={sendEmail} onChange={e => setSendEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e]" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Personal Message (optional)</label>
                <textarea value={sendMessage} onChange={e => setSendMessage(e.target.value)}
                  placeholder="Add a personal message to include in the email..."
                  rows={3} className="mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e] resize-none" />
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-700">
                Invoice {invoice.invoice_number} • {formatCurrency(invoice.total_amount)} • Due {invoice.due_date ? formatDate(invoice.due_date) : 'on receipt'}
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setSendModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleSendInvoiceEmail} disabled={sendInvoiceMutation.isLoading}
                  className="btn-gold text-sm px-5 py-2 flex items-center gap-2">
                  <Mail size={14} />
                  {sendInvoiceMutation.isLoading ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700">WhatsApp Number *</label>
                <input value={sendEmail} onChange={e => setSendEmail(e.target.value)}
                  placeholder="e.g. 254712345678 (international format)"
                  className="mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e]" />
                <p className="text-xs text-gray-400 mt-1">Include country code, no spaces or + symbol (e.g. 254712345678)</p>
              </div>
              <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                <p className="text-xs font-medium text-green-800 mb-1">Message preview:</p>
                <pre className="text-xs text-green-700 whitespace-pre-wrap font-sans leading-relaxed max-h-36 overflow-y-auto">
                  {buildWhatsAppInvoiceText(invoice, clientName)}
                </pre>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setSendModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleSendInvoiceWhatsApp}
                  className="flex items-center gap-2 text-sm px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  <MessageCircle size={14} /> Open WhatsApp
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* ── Send Receipt Modal ───────────────────────────────── */}
      <Modal isOpen={receiptModal.open} onClose={() => setReceiptModal({ open: false, paymentId: null })} title="Payment Receipt" size="md">
        <div className="space-y-4">
          {/* Receipt preview card */}
          {selectedPayment && (
            <div className="bg-green-50 border border-green-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 size={18} className="text-green-600" />
                <span className="font-semibold text-green-800">Payment Confirmed</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-500">Amount:</span> <span className="font-bold text-gray-900">{formatCurrency(selectedPayment.amount)}</span></div>
                <div><span className="text-gray-500">Method:</span> <span className="font-medium capitalize">{selectedPayment.payment_method?.replace('_',' ')}</span></div>
                {selectedPayment.mpesa_code && <div><span className="text-gray-500">Code:</span> <span className="font-medium">{selectedPayment.mpesa_code}</span></div>}
                <div><span className="text-gray-500">Date:</span> <span className="font-medium">{formatDate(selectedPayment.payment_date)}</span></div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            {[['email', <Mail size={14} />, 'Send via Email'], ['whatsapp', <MessageCircle size={14} />, 'Send via WhatsApp']].map(([key, icon, label]) => (
              <button key={key} onClick={() => setReceiptTab(key)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${receiptTab === key ? 'border-[#c9a96e] text-[#c9a96e]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {icon} {label}
              </button>
            ))}
          </div>

          {receiptTab === 'email' ? (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700">Recipient Email *</label>
                <input value={receiptEmail} onChange={e => setReceiptEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e]" />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setReceiptModal({ open: false, paymentId: null })} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleSendReceiptEmail} disabled={sendReceiptMutation.isLoading}
                  className="btn-gold text-sm px-5 py-2 flex items-center gap-2">
                  <Mail size={14} />
                  {sendReceiptMutation.isLoading ? 'Sending...' : 'Send Receipt'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700">WhatsApp Number *</label>
                <input value={receiptEmail} onChange={e => setReceiptEmail(e.target.value)}
                  placeholder="e.g. 254712345678 (international format)"
                  className="mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e]" />
                <p className="text-xs text-gray-400 mt-1">Include country code, no + symbol</p>
              </div>
              {selectedPayment && (
                <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                  <p className="text-xs font-medium text-green-800 mb-1">Message preview:</p>
                  <pre className="text-xs text-green-700 whitespace-pre-wrap font-sans leading-relaxed max-h-36 overflow-y-auto">
                    {buildWhatsAppReceiptText(selectedPayment, clientName, invoice.firm_name)}
                  </pre>
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button onClick={() => setReceiptModal({ open: false, paymentId: null })} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleSendReceiptWhatsApp}
                  className="flex items-center gap-2 text-sm px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  <MessageCircle size={14} /> Open WhatsApp
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
