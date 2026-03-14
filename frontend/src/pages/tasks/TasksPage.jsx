import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, CheckSquare, Check } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { tasksApi, casesApi, usersApi } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { formatDate, getStatusColor, getPriorityIcon } from '../../lib/utils'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'

const CATEGORIES = ['general','court_appearance','document_drafting','client_follow_up','research','filing','billing','meeting','other']

export default function TasksPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [addModal, setAddModal] = useState(false)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', search, status, priority, page],
    queryFn: () => tasksApi.getAll({ search, status, priority, page, limit: 25 }).then(r => r.data),
    keepPreviousData: true
  })

  const { data: casesData } = useQuery({ queryKey: ['cases-list'], queryFn: () => casesApi.getAll({ limit: 100 }).then(r => r.data.data) })
  const { data: usersData } = useQuery({ queryKey: ['users-list'], queryFn: () => usersApi.getAll({ limit: 100 }).then(r => r.data.data), enabled: user?.role === 'admin' })

  const tasks = data?.data || []
  const pagination = data?.pagination || {}
  const cases = casesData || []
  const users = usersData || []

  const { register, handleSubmit, reset } = useForm({ defaultValues: { status: 'not_started', priority: 'medium', category: 'general' } })

  const createMutation = useMutation({
    mutationFn: (data) => tasksApi.create(data),
    onSuccess: () => { toast.success('Task created!'); setAddModal(false); reset(); qc.invalidateQueries(['tasks']) },
    onError: () => toast.error('Failed to create task')
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => tasksApi.update(id, data),
    onSuccess: () => { toast.success('Task updated'); qc.invalidateQueries(['tasks']) },
    onError: () => toast.error('Failed to update task')
  })

  const inp = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e] focus:ring-2 focus:ring-[#c9a96e]/20"

  const statusCols = [
    { key: 'not_started', label: 'Not Started', color: 'bg-gray-50 border-gray-200' },
    { key: 'in_progress', label: 'In Progress', color: 'bg-blue-50 border-blue-200' },
    { key: 'completed', label: 'Completed', color: 'bg-green-50 border-green-200' },
    { key: 'deferred', label: 'Deferred', color: 'bg-orange-50 border-orange-200' },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Playfair Display' }}>Tasks</h1>
          <p className="text-gray-500 text-sm mt-0.5">{pagination.total || 0} total tasks</p>
        </div>
        <button onClick={() => setAddModal(true)} className="btn-gold flex items-center gap-2 text-sm">
          <Plus size={16} /> New Task
        </button>
      </div>

      <div className="card p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..." className="input-field pl-9 text-sm" />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)} className="input-field w-full md:w-40 text-sm">
          <option value="">All Statuses</option>
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="deferred">Deferred</option>
        </select>
        <select value={priority} onChange={e => setPriority(e.target.value)} className="input-field w-full md:w-36 text-sm">
          <option value="">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : tasks.length === 0 ? (
        <EmptyState icon={<CheckSquare size={40} />} title="No tasks found" description="Create your first task to start tracking work." action={<button onClick={() => setAddModal(true)} className="btn-gold text-sm">New Task</button>} />
      ) : (
        <div className="hidden md:grid md:grid-cols-4 gap-4">
          {statusCols.map(col => {
            const colTasks = tasks.filter(t => t.status === col.key)
            return (
              <div key={col.key} className={`rounded-xl border p-4 ${col.color}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-700">{col.label}</h3>
                  <span className="text-xs font-bold bg-white/60 px-2 py-0.5 rounded-full text-gray-600">{colTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {colTasks.map(t => (
                    <div key={t.id} className="bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-gray-800 leading-snug">{t.title}</p>
                        <span className="text-base flex-shrink-0">{getPriorityIcon(t.priority)}</span>
                      </div>
                      {t.case_title && <p className="text-xs text-gray-400 mt-1 truncate">📁 {t.case_title}</p>}
                      {t.due_date && <p className={`text-xs mt-1 font-medium ${new Date(t.due_date) < new Date() && t.status !== 'completed' ? 'text-red-500' : 'text-gray-400'}`}>Due: {formatDate(t.due_date)}</p>}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">{t.assignee_first ? `${t.assignee_first} ${t.assignee_last}` : 'Unassigned'}</span>
                        {t.status !== 'completed' && (
                          <button onClick={() => updateMutation.mutate({ id: t.id, data: { status: 'completed' } })}
                            className="p-1 hover:bg-green-100 rounded text-green-500 transition-colors">
                            <Check size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tasks.length > 0 && (
        <div className="md:hidden card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Task</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Due</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(t => (
                <tr key={t.id} className="border-b border-gray-50 hover:bg-amber-50/30">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-800">{t.title}</p>
                    <p className="text-xs text-gray-400">{getPriorityIcon(t.priority)} {t.priority}</p>
                  </td>
                  <td className="px-4 py-3"><Badge status={t.status}>{t.status?.replace('_',' ')}</Badge></td>
                  <td className="px-4 py-3">
                    <p className={`text-xs font-medium ${t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed' ? 'text-red-500' : 'text-gray-500'}`}>
                      {t.due_date ? formatDate(t.due_date) : '—'}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button disabled={!pagination.hasPrev} onClick={() => setPage(p => p - 1)} className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Previous</button>
          <span className="text-sm text-gray-500">Page {pagination.page} of {pagination.totalPages}</span>
          <button disabled={!pagination.hasNext} onClick={() => setPage(p => p + 1)} className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next</button>
        </div>
      )}

      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="New Task" size="md">
        <form onSubmit={handleSubmit(data => createMutation.mutate(data))} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Task Title *</label>
            <input {...register('title', { required: true })} placeholder="Task title" className={`mt-1 ${inp}`} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Priority</label>
              <select {...register('priority')} className={`mt-1 ${inp}`}>
                {['urgent','high','medium','low'].map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Category</label>
              <select {...register('category')} className={`mt-1 ${inp}`}>
                {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c.replace('_',' ')}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Due Date</label>
              <input {...register('dueDate')} type="datetime-local" className={`mt-1 ${inp}`} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Case (optional)</label>
              <select {...register('caseId')} className={`mt-1 ${inp}`}>
                <option value="">No case</option>
                {cases.map(c => <option key={c.id} value={c.id}>{c.case_number} – {c.title?.slice(0,30)}</option>)}
              </select>
            </div>
          </div>
          {user?.role === 'admin' && (
            <div>
              <label className="text-sm font-medium text-gray-700">Assign To</label>
              <select {...register('assignedTo')} className={`mt-1 ${inp}`}>
                <option value="">Select team member</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.role})</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-gray-700">Description</label>
            <textarea {...register('description')} rows={3} placeholder="Task details..." className={`mt-1 ${inp} resize-none`} />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setAddModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={createMutation.isLoading} className="btn-gold text-sm px-5 py-2">
              {createMutation.isLoading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
