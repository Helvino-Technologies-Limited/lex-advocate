import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { authApi } from '../../lib/api'
import toast from 'react-hot-toast'
import {
  Scale, LayoutDashboard, Briefcase, Users, CheckSquare, FileText,
  DollarSign, BarChart3, Settings, LogOut, MessageSquare, Bell,
  ChevronLeft, ChevronRight, UserCog, X, CreditCard
} from 'lucide-react'
import { cn } from '../../lib/utils'

const navItems = [
  { to: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard', exact: true },
  { to: '/dashboard/cases', icon: <Briefcase size={18} />, label: 'Cases' },
  { to: '/dashboard/clients', icon: <Users size={18} />, label: 'Clients' },
  { to: '/dashboard/tasks', icon: <CheckSquare size={18} />, label: 'Tasks' },
  { to: '/dashboard/documents', icon: <FileText size={18} />, label: 'Documents' },
  { to: '/dashboard/billing', icon: <DollarSign size={18} />, label: 'Billing' },
  { to: '/dashboard/messages', icon: <MessageSquare size={18} />, label: 'Messages' },
  { to: '/dashboard/reports', icon: <BarChart3 size={18} />, label: 'Reports' },
]

const adminItems = [
  { to: '/dashboard/users', icon: <UserCog size={18} />, label: 'Team Members' },
  { to: '/dashboard/settings', icon: <Settings size={18} />, label: 'Settings' },
  { to: '/dashboard/subscription', icon: <CreditCard size={18} />, label: 'Subscription' },
]

export default function Sidebar({ isOpen, isCollapsed, onClose, onToggleCollapse }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch {}
    logout()
    navigate('/login')
    toast.success('Logged out')
  }

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase()

  return (
    <aside className={cn(
      'fixed md:relative top-0 left-0 h-full z-30 md:z-auto',
      'flex flex-col bg-[#0a0f2e] text-white transition-all duration-300',
      isOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0',
      isCollapsed ? 'md:w-20' : 'md:w-64'
    )}>
      {/* Logo */}
      <div className={cn('flex items-center gap-3 px-5 py-5 border-b border-white/10', isCollapsed && 'md:justify-center md:px-3')}>
        <div className="w-9 h-9 bg-[#c9a96e] rounded-xl flex items-center justify-center flex-shrink-0">
          <Scale size={18} className="text-navy-950" />
        </div>
        {!isCollapsed && (
          <div>
            <span className="font-bold text-white text-lg" style={{ fontFamily: 'Playfair Display' }}>LEX</span>
            <span className="font-bold text-[#c9a96e] text-lg" style={{ fontFamily: 'Playfair Display' }}> ADV</span>
          </div>
        )}
        <button className="md:hidden ml-auto" onClick={onClose}>
          <X size={18} className="text-gray-400" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to} end={item.exact}
            className={({ isActive }) => cn('sidebar-link', isActive && 'active')}
            title={isCollapsed ? item.label : ''}>
            <span className="flex-shrink-0">{item.icon}</span>
            {!isCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}

        {['admin', 'super_admin'].includes(user?.role) && (
          <>
            <div className={cn('pt-4 pb-2 px-2', isCollapsed && 'hidden')}>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Admin</span>
            </div>
            {isCollapsed && <div className="my-2 border-t border-white/10" />}
            {adminItems.map(item => (
              <NavLink key={item.to} to={item.to}
                className={({ isActive }) => cn('sidebar-link', isActive && 'active')}
                title={isCollapsed ? item.label : ''}>
                <span className="flex-shrink-0">{item.icon}</span>
                {!isCollapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User */}
      <div className="border-t border-white/10 p-3">
        <div className={cn('flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer', isCollapsed && 'md:justify-center')}
          onClick={() => navigate('/dashboard/profile')}>
          <div className="w-8 h-8 bg-[#c9a96e] rounded-full flex items-center justify-center text-navy-950 text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-gray-400 capitalize truncate">{user?.role}</p>
            </div>
          )}
        </div>
        <button onClick={handleLogout}
          className={cn('sidebar-link w-full mt-1 text-red-400 hover:text-red-300 hover:bg-red-500/10', isCollapsed && 'md:justify-center')}
          title="Logout">
          <LogOut size={16} />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>

      {/* Collapse toggle (desktop) */}
      <button onClick={onToggleCollapse}
        className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#c9a96e] rounded-full items-center justify-center text-navy-950 hover:shadow-gold">
        {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  )
}
