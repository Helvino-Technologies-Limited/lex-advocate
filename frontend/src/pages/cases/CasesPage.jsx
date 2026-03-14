import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, Briefcase } from 'lucide-react'
import { casesApi } from '../../lib/api'
import { formatDate, getStatusColor, truncate } from '../../lib/utils'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

const STATUSES = ['', 'new', 'active', 'pending', 'on_hold', 'closed', 'won', 'lost', 'settled']
const PRIORITIES = ['', 'low', 'medium', 'high', 'urgent']

export default function CasesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['cases', search, status, priority, page],
    queryFn: () => casesApi.getAll({ search, status, priority, page, limit: 20 }).then(r => r.data),
    keepPreviousData: true
  })

  const cases = data?.data || []
  const pagination = data?.pagination || {}

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Playfair Display' }}>Cases</h1>
          <p className="text-gray-500 text-sm mt-0.5">{pagination.total || 0} total cases</p>
        </div>
        <button onClick={() => navigate('/dashboard/cases/new')} className="btn-gold flex items-center gap-2 text-sm">
          <Plus size={16} /> New Case
        </button>
      </div>

      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search cases by title, number, court..."
              className="input-field pl-9 text-sm" />
          </div>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} className="input-field w-full md:w-40 text-sm">
            <option value="">All Statuses</option>
            {STATUSES.filter(Boolean).map(s => <option key={s} value={s} className="capitalize">{s.replace('_', ' ')}</option>)}
          </select>
          <select value={priority} onChange={e => { setPriority(e.target.value); setPage(1) }} className="input-field w-full md:w-36 text-sm">
            <option value="">All Priorities</option>
            {PRIORITIES.filter(Boolean).map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : cases.length === 0 ? (
        <EmptyState icon={<Briefcase size={40} />} title="No cases found" description="Create your first case to get started managing matters." action={<button onClick={() => navigate('/dashboard/cases/new')} className="btn-gold text-sm">New Case</button>} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Case</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Client</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Court</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Priority</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Next Hearing</th>
                </tr>
              </thead>
              <tbody>
                {cases.map(c => (
                  <tr key={c.id} onClick={() => navigate(`/dashboard/cases/${c.id}`)} className="border-b border-gray-50 hover:bg-amber-50/30 cursor-pointer transition-colors">
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-gray-900">{truncate(c.title, 45)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{c.case_number}</p>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <p className="text-sm text-gray-700">{c.client_org || `${c.client_first || ''} ${c.client_last || ''}`.trim() || '—'}</p>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <p className="text-sm text-gray-600">{c.court_name || '—'}</p>
                    </td>
                    <td className="px-5 py-4">
                      <Badge status={c.status}>{c.status?.replace('_', ' ')}</Badge>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <Badge status={c.priority}>{c.priority}</Badge>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <p className="text-sm text-gray-600">{c.next_hearing_date ? formatDate(c.next_hearing_date) : '—'}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">Page {pagination.page} of {pagination.totalPages} • {pagination.total} records</p>
              <div className="flex gap-2">
                <button disabled={!pagination.hasPrev} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Prev</button>
                <button disabled={!pagination.hasNext} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
