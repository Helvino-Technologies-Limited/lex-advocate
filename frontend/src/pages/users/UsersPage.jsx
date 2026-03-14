import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, UserCog } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { usersApi } from '../../lib/api'
import { formatDate, getInitials } from '../../lib/utils'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'

export default function UsersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [addModal, setAddModal] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, role],
    queryFn: () => usersApi.getAll({ search, role, limit: 50 }).then(r => r.data.data)
  })
  const users = data || []

  const { register, handleSubmit, reset, formState: { errors } } = useForm({ defaultValues: { role: 'advocate' } })

  const mutation = useMutation({
    mutationFn: (data) => usersApi.create(data),
    onSuccess: () => { toast.success('User created! They will receive login instructions.'); setAddModal(false); reset(); qc.invalidateQueries(['users']) },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create user')
  })

  const toggleUser = useMutation({
    mutationFn: ({ id, isActive }) => usersApi.update(id, { isActive }),
    onSuccess: () => { toast.success('User status updated'); qc.invalidateQueries(['users']) }
  })

  const inp = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e] focus:ring-2 focus:ring-[#c9a96e]/20"

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Playfair Display' }}>Team Members</h1>
          <p className="text-gray-500 text-sm mt-0.5">{users.length} users in your firm</p>
        </div>
        <button onClick={() => setAddModal(true)} className="btn-gold flex items-center gap-2 text-sm">
          <Plus size={16} /> Add User
        </button>
      </div>

      <div className="card p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search team members..." className="input-field pl-9 text-sm" />
        </div>
        <select value={role} onChange={e => setRole(e.target.value)} className="input-field w-full md:w-40 text-sm">
          <option value="">All Roles</option>
          {['admin','advocate','paralegal','accountant','client'].map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
        </select>
      </div>

      {isLoading ? <div className="flex justify-center py-16"><Spinner size="lg" /></div> : users.length === 0 ? (
        <EmptyState icon={<UserCog size={40} />} title="No users found" description="Add team members to collaborate on cases." action={<button onClick={() => setAddModal(true)} className="btn-gold text-sm">Add User</button>} />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map(u => (
            <div key={u.id} className="card p-5 hover:shadow-card-hover transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-[#0a0f2e] rounded-full flex items-center justify-center text-[#c9a96e] text-sm font-bold flex-shrink-0">
                    {getInitials(u.first_name, u.last_name)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{u.first_name} {u.last_name}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </div>
                </div>
                <Badge status={u.is_active ? 'active' : 'inactive'}>{u.is_active ? 'Active' : 'Inactive'}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Badge status={u.role} className="capitalize">{u.role}</Badge>
                  {u.specialization && <p className="text-xs text-gray-400 mt-1">{u.specialization}</p>}
                </div>
                <button onClick={() => toggleUser.mutate({ id: u.id, isActive: !u.is_active })}
                  className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${u.is_active ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                  {u.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
              {u.last_login && <p className="text-xs text-gray-300 mt-2">Last login: {formatDate(u.last_login)}</p>}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="Add Team Member" size="md">
        <form onSubmit={handleSubmit(data => mutation.mutate(data))} className="space-y-4">
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
          <div>
            <label className="text-sm font-medium text-gray-700">Email Address *</label>
            <input {...register('email', { required: 'Required' })} type="email" placeholder="user@firm.co.ke" className={`mt-1 ${inp}`} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Phone</label>
            <input {...register('phone')} placeholder="0712 345 678" className={`mt-1 ${inp}`} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Role *</label>
              <select {...register('role')} className={`mt-1 ${inp}`}>
                {['advocate','paralegal','accountant','admin','client'].map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Specialization</label>
              <input {...register('specialization')} placeholder="e.g., Corporate Law" className={`mt-1 ${inp}`} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">LSK Bar Number</label>
            <input {...register('barNumber')} placeholder="LSK/20xx/xxxxxx" className={`mt-1 ${inp}`} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Temporary Password *</label>
            <input {...register('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 chars' } })} type="password" placeholder="Temporary password" className={`mt-1 ${inp}`} />
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
          </div>
          <p className="text-xs text-gray-400">The user will receive an email with login instructions and should change their password on first login.</p>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setAddModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={mutation.isLoading} className="btn-gold text-sm px-5 py-2">
              {mutation.isLoading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
