import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { CreditCard, CheckCircle, Clock, AlertCircle, XCircle, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { subscriptionApi } from '../../lib/api'
import Spinner from '../../components/ui/Spinner'

const PAYBILL = '522533'
const ACCOUNT = '8071524'
const PRICE_YEAR1 = 50000
const PRICE_RENEWAL = 15000

function fmt(n) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n)
}

const statusConfig = {
  trial:     { color: 'bg-blue-100 text-blue-700 border-blue-200',   icon: Clock,         label: 'Free Trial' },
  active:    { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle,   label: 'Active' },
  expired:   { color: 'bg-red-100 text-red-700 border-red-200',       icon: XCircle,       label: 'Expired' },
  suspended: { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: AlertCircle, label: 'Suspended' },
}

const paymentStatusBadge = (s) => {
  const map = {
    pending:  'bg-yellow-100 text-yellow-700',
    verified: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-600',
  }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${map[s] || 'bg-gray-100 text-gray-500'}`}>{s}</span>
}

export default function SubscriptionPage() {
  const [mpesaCode, setMpesaCode] = useState('')
  const [amount, setAmount] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['subscription-status'],
    queryFn: () => subscriptionApi.getStatus().then(r => r.data.data),
  })

  const payMutation = useMutation({
    mutationFn: (form) => subscriptionApi.pay(form),
    onSuccess: () => {
      toast.success('Payment submitted! We will verify and activate your account shortly.')
      setMpesaCode('')
      setAmount('')
      refetch()
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to submit payment')
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!mpesaCode.trim()) { toast.error('Enter MPesa confirmation code'); return }
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) { toast.error('Enter valid amount'); return }
    payMutation.mutate({ mpesaCode: mpesaCode.trim(), amount: parseFloat(amount) })
  }

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  const sub = data || {}
  const cfg = statusConfig[sub.status] || statusConfig.expired
  const StatusIcon = cfg.icon
  const isExpired = sub.status === 'expired' || sub.status === 'suspended'
  const isRenewal = (sub.subscriptionYear || 0) >= 1
  const expectedAmount = isRenewal ? PRICE_RENEWAL : PRICE_YEAR1

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Playfair Display' }}>Subscription</h1>
        <p className="text-gray-500 text-sm mt-0.5">{sub.firmName}</p>
      </div>

      {/* Status Card */}
      <div className={`rounded-2xl border-2 p-6 ${cfg.color}`}>
        <div className="flex items-center gap-4">
          <StatusIcon size={40} strokeWidth={1.5} />
          <div>
            <div className="text-xl font-bold">{cfg.label}</div>
            {sub.status === 'trial' && sub.daysRemaining !== null && (
              <div className="text-sm mt-0.5">
                {sub.daysRemaining === 0
                  ? 'Trial expired today'
                  : `${sub.daysRemaining} day${sub.daysRemaining !== 1 ? 's' : ''} remaining in trial`}
              </div>
            )}
            {sub.status === 'active' && sub.daysRemaining !== null && (
              <div className="text-sm mt-0.5">Subscription active · {sub.daysRemaining} days until renewal</div>
            )}
            {isExpired && (
              <div className="text-sm mt-0.5 font-medium">Your account has been deactivated. Please pay to reactivate.</div>
            )}
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="card p-6 space-y-4">
        <h2 className="font-bold text-gray-900 text-lg" style={{ fontFamily: 'Playfair Display' }}>Pricing</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className={`rounded-xl p-4 border-2 ${!isRenewal ? 'border-[#c9a96e] bg-amber-50' : 'border-gray-100 bg-gray-50'}`}>
            <div className="text-xs font-semibold text-gray-500 uppercase mb-1">First Year</div>
            <div className="text-2xl font-bold text-gray-900">{fmt(PRICE_YEAR1)}</div>
            <div className="text-xs text-gray-500 mt-1">One-time activation</div>
          </div>
          <div className={`rounded-xl p-4 border-2 ${isRenewal ? 'border-[#c9a96e] bg-amber-50' : 'border-gray-100 bg-gray-50'}`}>
            <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Annual Renewal</div>
            <div className="text-2xl font-bold text-gray-900">{fmt(PRICE_RENEWAL)}</div>
            <div className="text-xs text-gray-500 mt-1">Every year after</div>
          </div>
        </div>
      </div>

      {/* Payment Instructions */}
      <div className="card p-6 space-y-4">
        <h2 className="font-bold text-gray-900 text-lg" style={{ fontFamily: 'Playfair Display' }}>How to Pay</h2>
        <ol className="space-y-3 text-sm text-gray-700">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1a2744] text-white text-xs flex items-center justify-center font-bold">1</span>
            <span>Open <strong>M-PESA</strong> on your phone and select <strong>Lipa na M-PESA</strong> → <strong>Pay Bill</strong></span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1a2744] text-white text-xs flex items-center justify-center font-bold">2</span>
            <div>
              <div>Enter Business Number: <strong className="text-lg font-mono text-[#1a2744]">{PAYBILL}</strong></div>
              <div className="text-xs text-gray-500">Helvino Technologies Ltd</div>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1a2744] text-white text-xs flex items-center justify-center font-bold">3</span>
            <div>
              <div>Account Number: <strong className="font-mono text-[#1a2744]">{ACCOUNT}</strong></div>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1a2744] text-white text-xs flex items-center justify-center font-bold">4</span>
            <div>
              <div>Amount: <strong>{fmt(expectedAmount)}</strong> <span className="text-gray-400">({isRenewal ? 'renewal' : 'first year'})</span></div>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1a2744] text-white text-xs flex items-center justify-center font-bold">5</span>
            <span>Enter your M-PESA PIN and confirm. You will receive an SMS with a confirmation code.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#c9a96e] text-white text-xs flex items-center justify-center font-bold">6</span>
            <span>Submit the MPesa confirmation code below. We will verify and activate your account within 24 hours.</span>
          </li>
        </ol>
      </div>

      {/* Submit Payment Code */}
      {(isExpired || sub.status === 'trial') && (
        <div className="card p-6 space-y-4">
          <h2 className="font-bold text-gray-900 text-lg" style={{ fontFamily: 'Playfair Display' }}>Submit Payment</h2>
          <p className="text-sm text-gray-500">Already paid? Enter your MPesa confirmation code to request activation.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">MPesa Confirmation Code</label>
              <input
                value={mpesaCode}
                onChange={e => setMpesaCode(e.target.value.toUpperCase())}
                placeholder="e.g. QJH4X7P2KL"
                className="input-field font-mono uppercase"
                maxLength={20}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Amount Paid (KES)</label>
              <input
                value={amount}
                onChange={e => setAmount(e.target.value)}
                type="number"
                placeholder={String(expectedAmount)}
                className="input-field"
                min={1}
              />
              <p className="text-xs text-gray-400 mt-1">Expected: {fmt(expectedAmount)}</p>
            </div>
            <button
              type="submit"
              disabled={payMutation.isLoading}
              className="btn-gold w-full flex items-center justify-center gap-2"
            >
              <Send size={16} />
              {payMutation.isLoading ? 'Submitting...' : 'Submit for Verification'}
            </button>
          </form>
        </div>
      )}

      {/* Payment History */}
      {sub.payments?.length > 0 && (
        <div className="card p-6 space-y-4">
          <h2 className="font-bold text-gray-900 text-lg" style={{ fontFamily: 'Playfair Display' }}>Payment History</h2>
          <div className="space-y-3">
            {sub.payments.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <div className="text-sm font-medium text-gray-800 font-mono">{p.mpesa_code}</div>
                  <div className="text-xs text-gray-400">
                    {fmt(p.amount)} · Year {p.payment_year} ·{' '}
                    {new Date(p.submitted_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  {p.notes && p.status === 'rejected' && <div className="text-xs text-red-500 mt-0.5">{p.notes}</div>}
                </div>
                <div>{paymentStatusBadge(p.status)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-center text-xs text-gray-400 pb-4">
        Need help? Contact <a href="mailto:helvinotechltd@gmail.com" className="text-[#c9a96e] hover:underline">helvinotechltd@gmail.com</a>
      </div>
    </div>
  )
}
