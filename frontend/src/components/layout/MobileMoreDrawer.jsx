import { useNavigate, NavLink } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { authApi } from '../../lib/api'
import toast from 'react-hot-toast'
import {
  Users, CheckSquare, FileText, DollarSign, BarChart3,
  Settings, LogOut, UserCog, ChevronRight, User
} from 'lucide-react'

const menuItems = [
  { to: '/dashboard/clients',   icon: Users,      label: 'Clients',   bg: 'bg-blue-50',   text: 'text-blue-600' },
  { to: '/dashboard/tasks',     icon: CheckSquare, label: 'Tasks',    bg: 'bg-green-50',  text: 'text-green-600' },
  { to: '/dashboard/documents', icon: FileText,   label: 'Documents', bg: 'bg-purple-50', text: 'text-purple-600' },
  { to: '/dashboard/billing',   icon: DollarSign, label: 'Billing',   bg: 'bg-amber-50',  text: 'text-amber-600' },
  { to: '/dashboard/reports',   icon: BarChart3,  label: 'Reports',   bg: 'bg-red-50',    text: 'text-red-500' },
]

const adminItems = [
  { to: '/dashboard/users',    icon: UserCog,  label: 'Team',     bg: 'bg-indigo-50', text: 'text-indigo-600' },
  { to: '/dashboard/settings', icon: Settings, label: 'Settings', bg: 'bg-slate-50',  text: 'text-slate-600' },
]

export default function MobileMoreDrawer({ isOpen, onClose }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    onClose()
    try { await authApi.logout() } catch {}
    logout()
    navigate('/login')
    toast.success('Logged out')
  }

  const handleProfile = () => {
    navigate('/dashboard/profile')
    onClose()
  }

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase()
  const isAdmin = ['admin', 'super_admin'].includes(user?.role)
  const items = isAdmin ? [...menuItems, ...adminItems] : menuItems

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[55] md:hidden" onClick={onClose}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Drawer */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-gray-100 rounded-t-3xl overflow-hidden flex flex-col"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          maxHeight: '90vh',
          animation: 'slideUpDrawer 0.28s ease-out'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Profile card */}
        <div className="px-4 pb-3 flex-shrink-0">
          <button
            onClick={handleProfile}
            className="w-full bg-white rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-sm active:bg-gray-50 transition-colors"
          >
            <div className="w-12 h-12 bg-[#0a0f2e] rounded-full flex items-center justify-center text-[#c9a96e] font-bold text-base flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="font-bold text-gray-900 text-sm">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-gray-500 mt-0.5 capitalize">{user?.role?.replace(/_/g, ' ')}</p>
              <p className="text-xs text-[#c9a96e] mt-0.5 font-medium">View profile →</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <User size={16} className="text-gray-500" />
            </div>
          </button>
        </div>

        {/* Menu grid */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Navigation</p>
          <div className="grid grid-cols-3 gap-3">
            {items.map(({ to, icon: Icon, label, bg, text }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                className={({ isActive }) =>
                  `bg-white rounded-2xl p-3.5 flex flex-col items-center gap-2 shadow-sm transition-all active:scale-95 ${isActive ? 'ring-2 ring-[#c9a96e]/50' : ''}`
                }
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg}`}>
                  <Icon size={22} className={text} />
                </div>
                <span className="text-xs font-semibold text-gray-700 text-center leading-tight">{label}</span>
              </NavLink>
            ))}
          </div>

          {/* Logout */}
          <div className="mt-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Account</p>
            <button
              onClick={handleLogout}
              className="w-full bg-white rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-sm active:bg-red-50 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-red-50">
                <LogOut size={20} className="text-red-500" />
              </div>
              <span className="font-semibold text-red-500">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
