import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Briefcase, MessageSquare, Bell, Grid3X3 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { notificationsApi } from '../../lib/api'
import { timeAgo } from '../../lib/utils'

export default function BottomNav({ onMoreClick }) {
  const [showNotifs, setShowNotifs] = useState(false)
  const location = useLocation()

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getAll({ unread_only: 'false' }).then(r => r.data.data),
    refetchInterval: 30000
  })

  const unreadCount = notifData?.unreadCount || 0
  const notifications = notifData?.notifications || []

  const tabs = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Home', exact: true },
    { to: '/dashboard/cases', icon: Briefcase, label: 'Cases' },
    { to: '/dashboard/messages', icon: MessageSquare, label: 'Messages' },
  ]

  return (
    <>
      {/* Notification panel */}
      {showNotifs && (
        <div className="fixed inset-0 z-[60] md:hidden" onClick={() => setShowNotifs(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="absolute left-0 right-0 bg-white rounded-t-3xl shadow-2xl overflow-hidden flex flex-col"
            style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom))', maxHeight: '72vh' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <h3 className="font-bold text-gray-900 text-base" style={{ fontFamily: 'Playfair Display' }}>
                Notifications
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={async () => { await notificationsApi.markAllRead(); setShowNotifs(false) }}
                  className="text-xs text-[#c9a96e] font-medium"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="py-16 text-center">
                  <Bell size={32} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-gray-400 text-sm">No notifications</p>
                </div>
              ) : (
                notifications.slice(0, 20).map(n => (
                  <div key={n.id} className={`px-5 py-4 border-b border-gray-50 ${!n.is_read ? 'bg-amber-50/40' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${!n.is_read ? 'bg-[#c9a96e]' : 'bg-gray-200'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 md:hidden"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.07)'
        }}
      >
        <div className="flex items-center justify-around h-16">
          {tabs.map(({ to, icon: Icon, label, exact }) => {
            const active = exact ? location.pathname === to : location.pathname.startsWith(to)
            return (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative"
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#c9a96e] rounded-full" />
                )}
                <Icon size={22} strokeWidth={active ? 2.5 : 1.8} className={active ? 'text-[#c9a96e]' : 'text-gray-400'} />
                <span className={`text-[10px] font-semibold leading-none ${active ? 'text-[#c9a96e]' : 'text-gray-400'}`}>{label}</span>
              </NavLink>
            )
          })}

          {/* Notifications tab */}
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative"
          >
            {showNotifs && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#c9a96e] rounded-full" />
            )}
            <div className="relative">
              <Bell
                size={22}
                strokeWidth={showNotifs ? 2.5 : 1.8}
                className={showNotifs ? 'text-[#c9a96e]' : 'text-gray-400'}
              />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-semibold leading-none ${showNotifs ? 'text-[#c9a96e]' : 'text-gray-400'}`}>Alerts</span>
          </button>

          {/* More tab */}
          <button
            onClick={onMoreClick}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative"
          >
            <Grid3X3 size={22} strokeWidth={1.8} className="text-gray-400" />
            <span className="text-[10px] font-semibold leading-none text-gray-400">More</span>
          </button>
        </div>
      </nav>
    </>
  )
}
