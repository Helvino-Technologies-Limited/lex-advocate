import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  CreditCard, CheckCircle, Clock, AlertCircle, XCircle, Send, Copy, Check
} from 'lucide-react'
import toast from 'react-hot-toast'
import { subscriptionApi } from '../../lib/api'
import Spinner from '../../components/ui/Spinner'

const PAYBILL  = '522533'
const ACCOUNT  = '8071524'
const PRICE_Y1 = 50000
const PRICE_RN = 15000

const fmt = (n) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n)

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button onClick={copy}
      className="ml-2 p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
      title="Copy">
      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
    </button>
  )
}

function PayBadge({ status }) {
  const map = {
    pending:  'bg-yellow-100 text-yellow-700',
    verified: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-600',
  }
  return (
    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize ${map[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  )
}

const STATUS_CFG = {
  trial:     { bg: 'bg-blue-50  border-blue-300',  text: 'text-blue-800',  Icon: Clock,        label: 'Free Trial' },
  active:    { bg: 'bg-green-50 border-green-300', text: 'text-green-800', Icon: CheckCircle,  label: 'Active Subscription' },
  expired:   { bg: 'bg-red-50   border-red-300',   text: 'text-red-800',   Icon: XCircle,      label: 'Subscription Expired' },
  suspended: { bg: 'bg-orange-50 border-orange-300', text: 'text-orange-800', Icon: AlertCircle, label: 'Account Suspended' },
}

export default function SubscriptionPage() {
  const [mpesaCode, setMpesaCode] = useState('')
  const [amount, setAmount]       = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['subscription-status'],
    queryFn: () => subscriptionApi.getStatus().then(r => r.data.data),
  })

  const payMutation = useMutation({
    mutationFn: (form) => subscriptionApi.pay(form),
    onSuccess: () => {
      toast.success('Payment submitted! We will verify and activate your account within 24 hours.')
      setMpesaCode('')
      setAmount('')
      refetch()
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to submit payment'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!mpesaCode.trim())                          { toast.error('Enter MPesa confirmation code'); return }
    if (!amount || isNaN(amount) || +amount <= 0)   { toast.error('Enter valid amount'); return }
    payMutation.mutate({ mpesaCode: mpesaCode.trim(), amount: parseFloat(amount) })
  }

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  const sub = data || {}
  const cfg = STATUS_CFG[sub.status] || STATUS_CFG.expired
  const { Icon } = cfg
  const isExpired   = sub.status === 'expired' || sub.status === 'suspended'
  const isTrial     = sub.status === 'trial'
  const isRenewal   = (sub.subscriptionYear || 0) >= 1
  const expectedAmt = isRenewal ? PRICE_RN : PRICE_Y1

  const trialProgress = sub.trialEndsAt
    ? Math.max(0, Math.min(100, (1 - sub.daysRemaining / 5) * 100))
    : null

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pb-10">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Playfair Display' }}>
          Subscription
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">{sub.firmName}</p>
      </div>

      {/* Status card */}
      <div className={`rounded-2xl border-2 p-5 ${cfg.bg}`}>
        <div className="flex items-start gap-4">
          <Icon size={36} strokeWidth={1.5} className={cfg.text} />
          <div className="flex-1 min-w-0">
            <div className={`text-lg font-bold ${cfg.text}`}>{cfg.label}</div>

            {isTrial && sub.daysRemaining !== null && (
              <>
                <p className={`text-sm mt-0.5 ${cfg.text}`}>
                  {sub.daysRemaining === 0
                    ? 'Your trial expires today — subscribe now to avoid losing access!'
                    : sub.daysRemaining === 1
                    ? '1 day left in your trial — subscribe to keep access.'
                    : `${sub.daysRemaining} day${sub.daysRemaining !== 1 ? 's' : ''} remaining in your 5-day free trial.`}
                </p>
                {/* Trial progress bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs font-medium text-blue-700 mb-1">
                    <span>Trial started</span>
                    <span>{sub.daysRemaining} day{sub.daysRemaining !== 1 ? 's' : ''} left</span>
                    <span>Expires</span>
                  </div>
                  <div className="h-2 rounded-full bg-blue-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: `${trialProgress ?? 0}%` }}
                    />
                  </div>
                </div>
              </>
            )}

            {sub.status === 'active' && sub.daysRemaining !== null && (
              <p className={`text-sm mt-0.5 ${cfg.text}`}>
                Your subscription is active · renews in {sub.daysRemaining} day{sub.daysRemaining !== 1 ? 's' : ''}
              </p>
            )}

            {isExpired && (
              <p className={`text-sm mt-0.5 font-medium ${cfg.text}`}>
                Access is restricted. Pay below to reactivate your account.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="card p-5">
        <h2 className="font-bold text-gray-900 mb-4" style={{ fontFamily: 'Playfair Display' }}>Pricing</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className={`rounded-xl p-4 border-2 transition-colors ${!isRenewal ? 'border-[#c9a96e] bg-amber-50' : 'border-gray-100 bg-gray-50'}`}>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">First Year</div>
            <div className="text-2xl font-bold text-[#1a2744]">{fmt(PRICE_Y1)}</div>
            <div className="text-xs text-gray-500 mt-1">Full year access</div>
          </div>
          <div className={`rounded-xl p-4 border-2 transition-colors ${isRenewal ? 'border-[#c9a96e] bg-amber-50' : 'border-gray-100 bg-gray-50'}`}>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Annual Renewal</div>
            <div className="text-2xl font-bold text-[#1a2744]">{fmt(PRICE_RN)}</div>
            <div className="text-xs text-gray-500 mt-1">Every year after</div>
          </div>
        </div>
      </div>

      {/* MPesa Payment Details — prominent box */}
      <div className="rounded-2xl border-2 border-[#c9a96e] bg-amber-50 p-5">
        <h2 className="font-bold text-[#1a2744] mb-4 flex items-center gap-2" style={{ fontFamily: 'Playfair Display' }}>
          <CreditCard size={20} className="text-[#c9a96e]" />
          Pay via M-PESA Paybill
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <div className="bg-white rounded-xl border border-amber-200 p-4 text-center">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Paybill Number</div>
            <div className="flex items-center justify-center gap-1">
              <span className="text-2xl font-bold font-mono text-[#1a2744]">{PAYBILL}</span>
              <CopyButton value={PAYBILL} />
            </div>
            <div className="text-xs text-gray-400 mt-1">Helvino Technologies</div>
          </div>
          <div className="bg-white rounded-xl border border-amber-200 p-4 text-center">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Account Number</div>
            <div className="flex items-center justify-center gap-1">
              <span className="text-2xl font-bold font-mono text-[#1a2744]">{ACCOUNT}</span>
              <CopyButton value={ACCOUNT} />
            </div>
            <div className="text-xs text-gray-400 mt-1">Your account</div>
          </div>
          <div className="bg-white rounded-xl border border-amber-200 p-4 text-center">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Amount</div>
            <div className="flex items-center justify-center gap-1">
              <span className="text-2xl font-bold font-mono text-[#1a2744]">{fmt(expectedAmt)}</span>
              <CopyButton value={String(expectedAmt)} />
            </div>
            <div className="text-xs text-gray-400 mt-1">{isRenewal ? 'Annual renewal' : 'First year'}</div>
          </div>
        </div>

        <ol className="space-y-2.5 text-sm text-gray-700">
          {[
            'Open M-PESA → Lipa na M-PESA → Pay Bill',
            `Enter Business No: ${PAYBILL} (Helvino Technologies Ltd)`,
            `Enter Account No: ${ACCOUNT}`,
            `Enter Amount: ${fmt(expectedAmt)}`,
            'Enter your M-PESA PIN and confirm',
            'Copy the confirmation code from your SMS and submit it below',
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className={`flex-shrink-0 w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold
                ${i === 5 ? 'bg-[#c9a96e]' : 'bg-[#1a2744]'}`}>
                {i + 1}
              </span>
              <span dangerouslySetInnerHTML={{ __html: step.replace(/([\d]+)/g, '<strong>$1</strong>') }} />
            </li>
          ))}
        </ol>
      </div>

      {/* Submit Payment Code */}
      {(isExpired || isTrial || sub.status === 'active') && (
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-1" style={{ fontFamily: 'Playfair Display' }}>
            Submit Payment Confirmation
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            After paying, enter the M-PESA confirmation code from your SMS. Your account will be activated within 24 hours.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">M-PESA Confirmation Code</label>
              <input
                value={mpesaCode}
                onChange={e => setMpesaCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                placeholder="e.g. QJH4X7P2KL"
                className="input-field font-mono tracking-widest text-lg uppercase"
                maxLength={20}
                autoCapitalize="characters"
              />
              <p className="text-xs text-gray-400 mt-1">Found in the M-PESA confirmation SMS</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Amount Paid (KES)</label>
              <input
                value={amount}
                onChange={e => setAmount(e.target.value)}
                type="number"
                placeholder={String(expectedAmt)}
                className="input-field"
                min={1}
              />
              <p className="text-xs text-gray-400 mt-1">Expected: {fmt(expectedAmt)}</p>
            </div>
            <button
              type="submit"
              disabled={payMutation.isLoading}
              className="btn-gold w-full flex items-center justify-center gap-2 py-3 text-base"
            >
              <Send size={17} />
              {payMutation.isLoading ? 'Submitting...' : 'Submit for Verification'}
            </button>
          </form>
        </div>
      )}

      {/* Payment History */}
      {sub.payments?.length > 0 && (
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-4" style={{ fontFamily: 'Playfair Display' }}>Payment History</h2>
          <div className="divide-y divide-gray-50">
            {sub.payments.map(p => (
              <div key={p.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-mono font-semibold text-gray-800">{p.mpesa_code}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {fmt(p.amount)} · Year {p.payment_year} ·{' '}
                    {new Date(p.submitted_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  {p.notes && p.status === 'rejected' && (
                    <div className="text-xs text-red-500 mt-0.5">{p.notes}</div>
                  )}
                </div>
                <PayBadge status={p.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-center text-xs text-gray-400">
        Questions? Email{' '}
        <a href="mailto:helvinotechltd@gmail.com" className="text-[#c9a96e] hover:underline">
          helvinotechltd@gmail.com
        </a>
      </p>
    </div>
  )
}
