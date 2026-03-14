import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Search, Plus, Scale } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { notificationsApi } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { timeAgo } from '../../lib/utils'

export default function Header() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getAll({ unread_only: 'false' }).then(r => r.data.data),
    refetchInterval: 30000
  })

  const unreadCount = notifData?.unreadCount || 0
  const notifications = notifData?.notifications || []
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase()

  return (
    <header className="bg-white border-b border-gray-100 px-4 md:px-6 h-14 md:h-16 flex items-center justify-between gap-4 flex-shrink-0 relative z-40">

      {/* Left side */}
      <div className="flex items-center gap-3">
        {/* Mobile logo */}
        <div className="flex md:hidden items-center gap-2">
          <div className="w-8 h-8 bg-[#c9a96e] rounded-lg flex items-center justify-center flex-shrink-0">
            <Scale size={16} className="text-[#0a0f2e]" />
          </div>
          <span className="font-bold text-[#0a0f2e] text-base" style={{ fontFamily: 'Playfair Display' }}>
            Lex<span className="text-[#c9a96e]">Adv</span>
          </span>
        </div>

        {/* Desktop search */}
        <div className="hidden md:flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 w-64 border border-gray-200 focus-within:border-[#c9a96e] transition-colors">
          <Search size={15} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search cases, clients..."
            className="bg-transparent text-sm outline-none w-full text-gray-600 placeholder-gray-400"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1.5 md:gap-2">

        {/* Mobile search icon */}
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="md:hidden p-2 hover:bg-gray-100 rounded-xl text-gray-500 transition-colors"
        >
          <Search size={20} />
        </button>

        {/* Desktop new case */}
        <button
          onClick={() => navigate('/dashboard/cases/new')}
          className="hidden md:flex items-center gap-1.5 btn-gold text-xs px-3 py-2 rounded-lg"
        >
          <Plus size={14} /> New Case
        </button>

        {/* Desktop notifications */}
        <div className="hidden md:block relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 hover:bg-gray-100 rounded-xl text-gray-500 transition-colors"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={async () => { await notificationsApi.markAllRead() }}
                    className="text-xs text-[#c9a96e] hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">No notifications</div>
                ) : (
                  notifications.slice(0, 10).map(n => (
                    <div key={n.id} className={`p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer ${!n.is_read ? 'bg-amber-50/50' : ''}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.is_read ? 'bg-[#c9a96e]' : 'bg-gray-200'}`} />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{n.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User avatar */}
        <button
          onClick={() => navigate('/dashboard/profile')}
          className="w-9 h-9 bg-[#0a0f2e] rounded-full flex items-center justify-center text-[#c9a96e] text-sm font-bold flex-shrink-0"
        >
          {initials}
        </button>
      </div>

      {/* Mobile search overlay */}
      {showSearch && (
        <div className="md:hidden absolute top-14 left-0 right-0 bg-white border-b border-gray-100 px-4 py-3 z-50 shadow-md">
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 focus-within:border-[#c9a96e] transition-colors">
            <Search size={16} className="text-gray-400 flex-shrink-0" />
            <input
              autoFocus
              type="text"
              placeholder="Search cases, clients..."
              className="bg-transparent text-sm outline-none w-full text-gray-700 placeholder-gray-400"
              onBlur={() => setShowSearch(false)}
            />
          </div>
        </div>
      )}
    </header>
  )
}
