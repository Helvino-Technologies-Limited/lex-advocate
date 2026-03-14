import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Menu, Search, Plus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { notificationsApi } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { timeAgo } from '../../lib/utils'

export default function Header({ onMenuClick }) {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [showNotifications, setShowNotifications] = useState(false)

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getAll({ unread_only: 'false' }).then(r => r.data.data),
    refetchInterval: 30000
  })

  const unreadCount = notifData?.unreadCount || 0
  const notifications = notifData?.notifications || []

  return (
    <header className="bg-white border-b border-gray-100 px-4 md:px-6 h-16 flex items-center justify-between gap-4 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="md:hidden p-2 hover:bg-gray-100 rounded-lg">
          <Menu size={20} />
        </button>

        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 w-64 border border-gray-200">
          <Search size={15} className="text-gray-400" />
          <input type="text" placeholder="Search cases, clients..." className="bg-transparent text-sm outline-none w-full text-gray-600 placeholder-gray-400" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Quick Add */}
        <button onClick={() => navigate('/dashboard/cases/new')}
          className="hidden md:flex items-center gap-1.5 btn-gold text-xs px-3 py-2 rounded-lg">
          <Plus size={14} />
          New Case
        </button>

        {/* Notifications */}
        <div className="relative">
          <button onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 hover:bg-gray-100 rounded-lg text-gray-600">
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
                {unreadCount > 0 && (
                  <button onClick={async () => { await notificationsApi.markAllRead() }} className="text-xs text-[#c9a96e] hover:underline">
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
                        {!n.is_read && <div className="w-2 h-2 bg-[#c9a96e] rounded-full mt-1.5 flex-shrink-0" />}
                        <div className={n.is_read ? 'ml-5' : ''}>
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
        <button onClick={() => navigate('/dashboard/profile')}
          className="w-9 h-9 bg-[#0a0f2e] rounded-full flex items-center justify-center text-[#c9a96e] text-sm font-bold">
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </button>
      </div>
    </header>
  )
}
