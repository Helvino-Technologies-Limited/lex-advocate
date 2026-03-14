import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Users, CheckSquare, DollarSign, Calendar, TrendingUp, AlertTriangle, Clock } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { dashboardApi } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency, formatDateTime, formatDate, getStatusColor } from '../../lib/utils'
import StatsCard from '../../components/ui/StatsCard'
import Spinner from '../../components/ui/Spinner'

const PIE_COLORS = ['#c9a96e', '#0a0f2e', '#4ade80', '#60a5fa', '#f87171', '#a78bfa']

export default function DashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.getStats().then(r => r.data.data),
    refetchInterval: 60000
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Playfair Display' }}>
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.firstName}! 👋
          </h1>
          <p className="text-gray-500 text-sm mt-1">Here's what's happening at {user?.tenantName}</p>
        </div>
        <div className="text-right hidden md:block">
          <p className="text-sm font-semibold text-gray-700">{formatDate(new Date(), 'EEEE, MMMM d')}</p>
          <p className="text-xs text-gray-400">{formatDate(new Date(), 'yyyy')}</p>
        </div>
      </div>

      {stats?.overdueTasksCount > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">
            You have <strong>{stats.overdueTasksCount} overdue task{stats.overdueTasksCount > 1 ? 's' : ''}</strong>.{' '}
            <button onClick={() => navigate('/dashboard/tasks')} className="underline font-semibold">Review now</button>
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Cases" value={stats?.cases?.total || 0} subtitle={`${stats?.cases?.active || 0} active`} icon={<Briefcase size={22} />} color="navy" onClick={() => navigate('/dashboard/cases')} />
        <StatsCard title="Clients" value={stats?.clients?.total || 0} subtitle={`${stats?.clients?.active || 0} active`} icon={<Users size={22} />} color="gold" onClick={() => navigate('/dashboard/clients')} />
        <StatsCard title="Tasks" value={stats?.tasks?.total || 0} subtitle={`${stats?.tasks?.in_progress || 0} in progress`} icon={<CheckSquare size={22} />} color="blue" onClick={() => navigate('/dashboard/tasks')} />
        <StatsCard title="Revenue" value={formatCurrency(stats?.billing?.total_received || 0)} subtitle={`${formatCurrency(stats?.billing?.total_outstanding || 0)} outstanding`} icon={<DollarSign size={22} />} color="green" onClick={() => navigate('/dashboard/billing')} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-bold text-gray-900" style={{ fontFamily: 'Playfair Display' }}>Revenue (Last 6 Months)</h2>
              <p className="text-xs text-gray-400">Monthly payment collections</p>
            </div>
            <TrendingUp size={18} className="text-[#c9a96e]" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={stats?.monthlyRevenue || []}>
              <defs>
                <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c9a96e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#c9a96e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tickFormatter={v => formatDate(v, 'MMM')} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
              <Tooltip formatter={v => [formatCurrency(v), 'Revenue']} labelFormatter={v => formatDate(v, 'MMMM yyyy')} />
              <Area type="monotone" dataKey="total" stroke="#c9a96e" strokeWidth={2.5} fill="url(#goldGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h2 className="font-bold text-gray-900 mb-1" style={{ fontFamily: 'Playfair Display' }}>Case Types</h2>
          <p className="text-xs text-gray-400 mb-4">Distribution by category</p>
          {stats?.caseTypes?.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={stats.caseTypes} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="count" nameKey="type" paddingAngle={3}>
                  {stats.caseTypes.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-gray-300 text-sm">No data yet</div>
          )}
          <div className="space-y-1.5 mt-2">
            {stats?.caseTypes?.slice(0, 5).map((ct, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-xs text-gray-600 truncate">{ct.type}</span>
                </div>
                <span className="text-xs font-semibold text-gray-700">{ct.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900" style={{ fontFamily: 'Playfair Display' }}>Upcoming Hearings</h2>
            <Calendar size={16} className="text-[#c9a96e]" />
          </div>
          {!stats?.upcomingHearings?.length ? (
            <div className="text-center py-8 text-gray-400 text-sm">No upcoming hearings</div>
          ) : (
            <div className="space-y-3">
              {stats.upcomingHearings.map((h, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-amber-50/50 border border-amber-100 cursor-pointer hover:bg-amber-50" onClick={() => navigate(`/dashboard/cases/${h.case_id}`)}>
                  <div className="w-10 h-10 bg-[#c9a96e]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar size={16} className="text-[#c9a96e]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{h.case_title}</p>
                    <p className="text-xs text-gray-500">{h.case_number} {h.hearing_type ? `• ${h.hearing_type}` : ''}</p>
                    <p className="text-xs font-medium text-[#c9a96e] mt-0.5">{formatDateTime(h.hearing_date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900" style={{ fontFamily: 'Playfair Display' }}>Recent Activity</h2>
            <Clock size={16} className="text-[#c9a96e]" />
          </div>
          {!stats?.recentActivity?.length ? (
            <div className="text-center py-8 text-gray-400 text-sm">No recent activity</div>
          ) : (
            <div className="space-y-3">
              {stats.recentActivity.map((a, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold
                    ${a.type === 'case' ? 'bg-[#0a0f2e]' : a.type === 'client' ? 'bg-[#c9a96e]' : 'bg-green-500'}`}>
                    {a.type === 'case' ? 'C' : a.type === 'client' ? 'CL' : 'INV'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">{a.description}</p>
                    <p className="text-xs text-gray-400 capitalize">{a.type} • {formatDate(a.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'New Cases', value: stats?.cases?.new_cases || 0, color: 'bg-blue-50 text-blue-700 border-blue-100' },
          { label: 'Pending Cases', value: stats?.cases?.pending || 0, color: 'bg-yellow-50 text-yellow-700 border-yellow-100' },
          { label: 'Closed Cases', value: stats?.cases?.closed || 0, color: 'bg-gray-50 text-gray-700 border-gray-100' },
          { label: 'Overdue Invoices', value: stats?.billing?.overdue_count || 0, color: 'bg-red-50 text-red-700 border-red-100' },
        ].map((item, i) => (
          <div key={i} className={`p-4 rounded-xl border ${item.color} text-center`}>
            <p className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display' }}>{item.value}</p>
            <p className="text-xs font-medium mt-1">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
