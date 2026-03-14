import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Users, Building2, User } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { clientsApi } from '../../lib/api'
import { formatDate, truncate } from '../../lib/utils'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'

export default function ClientsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [addModal, setAddModal] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['clients', search, status, page],
    queryFn: () => clientsApi.getAll({ search, status, page, limit: 20 }).then(r => r.data),
    keepPreviousData: true
  })

  const clients = data?.data || []
  const pagination = data?.pagination || {}

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({ defaultValues: { clientType: 'individual', status: 'active' } })
  const clientType = watch('clientType')

  const mutation = useMutation({
    mutationFn: (data) => clientsApi.create(data),
    onSuccess: () => { toast.success('Client added!'); setAddModal(false); reset(); qc.invalidateQueries(['clients']) },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to add client')
  })

  const inp = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e] focus:ring-2 focus:ring-[#c9a96e]/20"

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Playfair Display' }}>Clients</h1>
          <p className="text-gray-500 text-sm mt-0.5">{pagination.total || 0} total clients</p>
        </div>
        <button onClick={() => setAddModal(true)} className="btn-gold flex items-center gap-2 text-sm">
          <Plus size={16} /> Add Client
        </button>
      </div>

      <div className="card p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search clients by name, email, phone..." className="input-field pl-9 text-sm" />
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} className="input-field w-full md:w-40 text-sm">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="blacklisted">Blacklisted</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : clients.length === 0 ? (
        <EmptyState icon={<Users size={40} />} title="No clients found" description="Add your first client to begin managing matters." action={<button onClick={() => setAddModal(true)} className="btn-gold text-sm">Add Client</button>} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Contact</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Type</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cases</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Added</th>
                </tr>
              </thead>
              <tbody>
                {clients.map(cl => {
                  const name = cl.client_type === 'organization' ? cl.organization_name : `${cl.first_name || ''} ${cl.last_name || ''}`.trim()
                  return (
                    <tr key={cl.id} onClick={() => navigate(`/dashboard/clients/${cl.id}`)} className="border-b border-gray-50 hover:bg-amber-50/30 cursor-pointer transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-[#0a0f2e] rounded-full flex items-center justify-center text-[#c9a96e] text-xs font-bold flex-shrink-0">
                            {cl.client_type === 'organization' ? <Building2 size={14} /> : name.slice(0,2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{name}</p>
                            {cl.id_number && <p className="text-xs text-gray-400">ID: {cl.id_number}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <p className="text-sm text-gray-700">{cl.email || '—'}</p>
                        <p className="text-xs text-gray-400">{cl.phone || ''}</p>
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <Badge status={cl.client_type}>{cl.client_type}</Badge>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold text-gray-700">{cl.case_count || 0}</span>
                      </td>
                      <td className="px-5 py-4">
                        <Badge status={cl.status}>{cl.status}</Badge>
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <p className="text-sm text-gray-500">{formatDate(cl.created_at)}</p>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">Page {pagination.page} of {pagination.totalPages}</p>
              <div className="flex gap-2">
                <button disabled={!pagination.hasPrev} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Prev</button>
                <button disabled={!pagination.hasNext} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="Add New Client" size="md">
        <form onSubmit={handleSubmit(data => mutation.mutate(data))} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Client Type</label>
            <select {...register('clientType')} className={`mt-1 ${inp}`}>
              <option value="individual">Individual</option>
              <option value="organization">Organization</option>
            </select>
          </div>
          {clientType === 'organization' ? (
            <div>
              <label className="text-sm font-medium text-gray-700">Organization Name *</label>
              <input {...register('organizationName', { required: 'Required' })} placeholder="Company / Organization name" className={`mt-1 ${inp}`} />
              {errors.organizationName && <p className="text-xs text-red-500 mt-1">{errors.organizationName.message}</p>}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">First Name *</label>
                <input {...register('firstName', { required: 'Required' })} placeholder="First name" className={`mt-1 ${inp}`} />
                {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Last Name *</label>
                <input {...register('lastName', { required: 'Required' })} placeholder="Last name" className={`mt-1 ${inp}`} />
                {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName.message}</p>}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input {...register('email')} type="email" placeholder="email@example.com" className={`mt-1 ${inp}`} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Phone</label>
              <input {...register('phone')} placeholder="0712 345 678" className={`mt-1 ${inp}`} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">ID Number</label>
              <input {...register('idNumber')} placeholder="National ID" className={`mt-1 ${inp}`} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">KRA PIN</label>
              <input {...register('kraPin')} placeholder="KRA PIN" className={`mt-1 ${inp}`} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Address</label>
            <input {...register('address')} placeholder="Physical address" className={`mt-1 ${inp}`} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">City</label>
              <input {...register('city')} placeholder="City" className={`mt-1 ${inp}`} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">County</label>
              <input {...register('county')} placeholder="County" className={`mt-1 ${inp}`} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Notes</label>
            <textarea {...register('notes')} rows={2} placeholder="Any notes about this client..." className={`mt-1 ${inp} resize-none`} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setAddModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={mutation.isLoading} className="btn-gold text-sm px-5 py-2">
              {mutation.isLoading ? 'Saving...' : 'Add Client'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
