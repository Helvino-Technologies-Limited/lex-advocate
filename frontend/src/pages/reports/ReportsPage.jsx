import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { reportsApi } from '../../lib/api'
import { formatCurrency, formatDate } from '../../lib/utils'
import Spinner from '../../components/ui/Spinner'

const COLORS = ['#c9a96e','#0a0f2e','#4ade80','#60a5fa','#f87171','#a78bfa','#fb923c','#34d399']

export default function ReportsPage() {
  const [tab, setTab] = useState('financial')
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])

  const { data: financial, isLoading: finLoading } = useQuery({
    queryKey: ['report-financial', startDate, endDate],
    queryFn: () => reportsApi.getFinancial({ startDate, endDate }).then(r => r.data.data),
    enabled: tab === 'financial'
  })

  const { data: caseReport, isLoading: caseLoading } = useQuery({
    queryKey: ['report-cases'],
    queryFn: () => reportsApi.getCases().then(r => r.data.data),
    enabled: tab === 'cases'
  })

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Playfair Display' }}>Reports & Analytics</h1>
        <p className="text-gray-500 text-sm mt-0.5">Insights into your firm's performance</p>
      </div>

      <div className="card overflow-hidden">
        <div className="flex border-b border-gray-100">
          {['financial','cases'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-6 py-3.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${tab === t ? 'border-[#c9a96e] text-[#c9a96e]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t === 'financial' ? 'Financial Report' : 'Case Analytics'}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === 'financial' && (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="text-sm font-medium text-gray-700">From</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e]" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">To</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e]" />
                </div>
              </div>

              {finLoading ? <div className="flex justify-center py-12"><Spinner /></div> : financial && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Total Revenue', value: formatCurrency(financial.revenue?.total || 0), color: 'text-green-600', bg: 'bg-green-50' },
                      { label: 'Total Expenses', value: formatCurrency(financial.expenses?.total || 0), color: 'text-red-600', bg: 'bg-red-50' },
                      { label: 'Net Profit', value: formatCurrency((financial.revenue?.total || 0) - (financial.expenses?.total || 0)), color: 'text-blue-600', bg: 'bg-blue-50' },
                      { label: 'Outstanding', value: formatCurrency(financial.outstanding?.total || 0), color: 'text-orange-600', bg: 'bg-orange-50' },
                    ].map((item, i) => (
                      <div key={i} className={`${item.bg} p-5 rounded-xl`}>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{item.label}</p>
                        <p className={`text-2xl font-bold ${item.color}`} style={{ fontFamily: 'Playfair Display' }}>{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {financial.topClients?.length > 0 && (
                    <div>
                      <h3 className="font-bold text-gray-900 mb-4" style={{ fontFamily: 'Playfair Display' }}>Top Clients by Revenue</h3>
                      <div className="space-y-3">
                        {financial.topClients.map((c, i) => {
                          const name = c.organization_name || `${c.first_name} ${c.last_name}`
                          const maxPaid = Math.max(...financial.topClients.map(x => x.total_paid))
                          const pct = (c.total_paid / maxPaid) * 100
                          return (
                            <div key={i} className="flex items-center gap-3">
                              <div className="w-6 h-6 bg-[#0a0f2e] rounded-full flex items-center justify-center text-[#c9a96e] text-xs font-bold flex-shrink-0">{i+1}</div>
                              <div className="flex-1">
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="font-medium text-gray-700">{name}</span>
                                  <span className="font-bold text-gray-900">{formatCurrency(c.total_paid)}</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-[#c9a96e] rounded-full transition-all" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {tab === 'cases' && (
            <div className="space-y-6">
              {caseLoading ? <div className="flex justify-center py-12"><Spinner /></div> : caseReport && (
                <>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-bold text-gray-900 mb-4" style={{ fontFamily: 'Playfair Display' }}>Case Status Distribution</h3>
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={caseReport.statusDistribution} cx="50%" cy="50%" outerRadius={85} dataKey="count" nameKey="status" paddingAngle={3}>
                            {caseReport.statusDistribution?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div>
                      <h3 className="font-bold text-gray-900 mb-4" style={{ fontFamily: 'Playfair Display' }}>Cases by Type</h3>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={caseReport.typeDistribution?.slice(0,7) || []} layout="vertical">
                          <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="type" tick={{ fontSize: 11 }} width={100} axisLine={false} tickLine={false} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#c9a96e" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {caseReport.advocateWorkload?.length > 0 && (
                    <div>
                      <h3 className="font-bold text-gray-900 mb-4" style={{ fontFamily: 'Playfair Display' }}>Advocate Workload</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Advocate</th>
                              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total Cases</th>
                              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Active</th>
                            </tr>
                          </thead>
                          <tbody>
                            {caseReport.advocateWorkload.map((a, i) => (
                              <tr key={i} className="border-b border-gray-50">
                                <td className="px-4 py-3 text-sm font-medium text-gray-800">{a.first_name} {a.last_name}</td>
                                <td className="px-4 py-3 text-sm text-gray-600 text-right">{a.case_count}</td>
                                <td className="px-4 py-3 text-sm font-semibold text-green-600 text-right">{a.active_cases}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {caseReport.monthlyNew?.length > 0 && (
                    <div>
                      <h3 className="font-bold text-gray-900 mb-4" style={{ fontFamily: 'Playfair Display' }}>New Cases Per Month</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={caseReport.monthlyNew}>
                          <XAxis dataKey="month" tickFormatter={v => formatDate(v, 'MMM yy')} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                          <Tooltip labelFormatter={v => formatDate(v, 'MMMM yyyy')} />
                          <Bar dataKey="count" fill="#0a0f2e" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
