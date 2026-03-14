import { useNavigate } from 'react-router-dom'
import { AlertTriangle, XCircle } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

export default function SubscriptionBanner({ subscriptionData }) {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  if (!subscriptionData || user?.role === 'super_admin') return null

  const { status, daysRemaining } = subscriptionData

  // Show banner only for trial expiring soon (<=3 days) or expired
  const showTrialWarning = status === 'trial' && daysRemaining !== null && daysRemaining <= 3
  const showExpired = status === 'expired' || status === 'suspended'

  if (!showTrialWarning && !showExpired) return null

  if (showExpired) {
    return (
      <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm">
          <XCircle size={16} className="flex-shrink-0" />
          <span className="font-medium">Your subscription has expired. Access is restricted.</span>
        </div>
        <button
          onClick={() => navigate('/dashboard/subscription')}
          className="flex-shrink-0 text-xs bg-white text-red-600 font-bold px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
        >
          Renew Now
        </button>
      </div>
    )
  }

  return (
    <div className="bg-amber-500 text-white px-4 py-2.5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-sm">
        <AlertTriangle size={15} className="flex-shrink-0" />
        <span>
          <span className="font-semibold">Trial ending soon</span>
          {daysRemaining === 0
            ? ' — expires today!'
            : ` — ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`}
        </span>
      </div>
      <button
        onClick={() => navigate('/dashboard/subscription')}
        className="flex-shrink-0 text-xs bg-white text-amber-600 font-bold px-3 py-1 rounded-lg hover:bg-amber-50 transition-colors"
      >
        Subscribe
      </button>
    </div>
  )
}
