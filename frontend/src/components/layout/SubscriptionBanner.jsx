import { useNavigate } from 'react-router-dom'
import { Clock, AlertTriangle, XCircle, CreditCard } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

export default function SubscriptionBanner({ subscriptionData }) {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  if (!subscriptionData || user?.role === 'super_admin') return null

  const { status, daysRemaining } = subscriptionData

  const go = () => navigate('/dashboard/subscription')

  // Expired / suspended — red, urgent
  if (status === 'expired' || status === 'suspended') {
    return (
      <div className="bg-red-600 text-white px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <XCircle size={16} className="flex-shrink-0" />
          <span><strong>Subscription expired.</strong> Your account is restricted — pay to reactivate.</span>
        </div>
        <button onClick={go}
          className="flex-shrink-0 text-xs bg-white text-red-600 font-bold px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap">
          Pay Now →
        </button>
      </div>
    )
  }

  // Trial — show for all remaining days
  if (status === 'trial' && daysRemaining !== null) {
    const isUrgent = daysRemaining <= 2
    const isWarning = daysRemaining <= 5

    const bg = isUrgent ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-[#1a2744]'
    const btnClass = isUrgent
      ? 'bg-white text-red-600'
      : isWarning
      ? 'bg-white text-amber-600'
      : 'bg-[#c9a96e] text-[#1a2744]'

    const msg = daysRemaining === 0
      ? 'Your free trial expires TODAY'
      : daysRemaining === 1
      ? 'Your free trial expires TOMORROW'
      : `Free trial: ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`

    const Icon = isUrgent ? AlertTriangle : Clock

    return (
      <div className={`${bg} text-white px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap`}>
        <div className="flex items-center gap-2 text-sm">
          <Icon size={15} className="flex-shrink-0" />
          <span>
            <strong>{msg}</strong>
            {daysRemaining <= 5 && ' — subscribe now to keep access'}
          </span>
        </div>
        <button onClick={go}
          className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${btnClass}`}>
          <span className="flex items-center gap-1">
            <CreditCard size={12} />
            Subscribe — KSh 50,000/yr
          </span>
        </button>
      </div>
    )
  }

  return null
}
