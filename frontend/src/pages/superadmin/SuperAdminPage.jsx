import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Scale, Building2, Users, Briefcase, ShieldCheck, LogOut,
  CheckCircle, XCircle, Plus, Search, Eye, EyeOff,
  RefreshCw, Trash2, Edit, ChevronDown, X, AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { superAdminApi, authApi } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'

// ── Helpers ───────────────────────────────────────────────────────────────────

const statusBadge = (status) => {
  const map = {
    active:    'bg-emerald-100 text-emerald-700',
    trial:     'bg-blue-100 text-blue-700',
    suspended: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-500',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${map[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  )
}

const planBadge = (plan) => {
  const map = {
    free:         'bg-gray-100 text-gray-600',
    starter:      'bg-sky-100 text-sky-700',
    professional: 'bg-amber-100 text-amber-700',
    enterprise:   'bg-purple-100 text-purple-700',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold capitalize ${map[plan] || 'bg-gray-100 text-gray-500'}`}>
      {plan}
    </span>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-navy-950" style={{ fontFamily: 'Playfair Display' }}>{value ?? '—'}</div>
        <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      </div>
    </div>
  )
}

// ── Create Tenant Modal ───────────────────────────────────────────────────────

function CreateTenantModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '',
    adminFirstName: '', adminLastName: '', adminPassword: '',
    plan: 'professional'
  })
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await superAdminApi.createTenant(form)
      toast.success(`Tenant "${form.name}" created!`)
      onCreated(res.data.data)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create tenant')
    } finally {
      setLoading(false)
    }
  }

  const f = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-navy-950" style={{ fontFamily: 'Playfair Display' }}>Create New Tenant</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Firm Name *</label>
            <input value={form.name} onChange={f('name')} placeholder="Kamau & Associates"
              className="input-field" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Admin First Name *</label>
              <input value={form.adminFirstName} onChange={f('adminFirstName')} placeholder="Wanjiru"
                className="input-field" required />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Admin Last Name *</label>
              <input value={form.adminLastName} onChange={f('adminLastName')} placeholder="Kamau"
                className="input-field" required />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Email *</label>
            <input value={form.email} onChange={f('email')} type="email" placeholder="admin@firm.com"
              className="input-field" required />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Phone</label>
            <input value={form.phone} onChange={f('phone')} placeholder="+254 700 000 000"
              className="input-field" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Subscription Plan</label>
            <select value={form.plan} onChange={f('plan')} className="input-field">
              <option value="free">Free</option>
              <option value="starter">Starter</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Admin Password</label>
            <div className="relative">
              <input value={form.adminPassword} onChange={f('adminPassword')}
                type={showPass ? 'text' : 'password'} placeholder="Leave blank for default"
                className="input-field pr-10" />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Default: TempPass@2024!</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 btn-gold py-2.5 rounded-xl text-sm">
              {loading ? 'Creating...' : 'Create Tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Tenant Users Modal ────────────────────────────────────────────────────────

function TenantUsersModal({ tenant, onClose }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [visiblePasswords, setVisiblePasswords] = useState({})
  const [editingPassword, setEditingPassword] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await superAdminApi.listTenantUsers(tenant.id)
      setUsers(res.data.data)
    } catch {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [tenant.id])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleSetPassword = async (userId) => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setSaving(true)
    try {
      await superAdminApi.setUserPassword(userId, newPassword)
      toast.success('Password updated')
      setEditingPassword(null)
      setNewPassword('')
      fetchUsers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (userId) => {
    try {
      await superAdminApi.toggleUserActive(userId)
      toast.success('User status updated')
      fetchUsers()
    } catch {
      toast.error('Failed to update user')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl z-10 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-navy-950" style={{ fontFamily: 'Playfair Display' }}>
              Users — {tenant.name}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{tenant.email}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No users yet</div>
          ) : (
            <div className="space-y-3">
              {users.map(user => (
                <div key={user.id} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">
                          {user.first_name} {user.last_name}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize
                          ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                          {user.role}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                          ${user.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>

                      {/* Password display */}
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-gray-400">Admin-set password:</span>
                        {user.admin_set_password ? (
                          <div className="flex items-center gap-1">
                            <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">
                              {visiblePasswords[user.id] ? user.admin_set_password : '••••••••'}
                            </code>
                            <button onClick={() => togglePasswordVisibility(user.id)}
                              className="text-gray-400 hover:text-gray-600">
                              {visiblePasswords[user.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">User-managed</span>
                        )}
                      </div>

                      {/* Set new password inline */}
                      {editingPassword === user.id ? (
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder="New password (min 6 chars)"
                            className="input-field text-xs py-1.5 flex-1"
                            autoFocus
                          />
                          <button onClick={() => handleSetPassword(user.id)} disabled={saving}
                            className="btn-gold text-xs px-3 py-1.5 rounded-lg">
                            {saving ? '...' : 'Save'}
                          </button>
                          <button onClick={() => { setEditingPassword(null); setNewPassword('') }}
                            className="text-gray-400 hover:text-gray-600">
                            <X size={14} />
                          </button>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => { setEditingPassword(user.id); setNewPassword('') }}
                        className="text-xs text-[#c9a96e] hover:underline font-medium"
                        title="Set password">
                        Set Password
                      </button>
                      <button
                        onClick={() => handleToggleActive(user.id)}
                        className={`text-xs font-medium ${user.is_active ? 'text-red-500 hover:text-red-700' : 'text-emerald-600 hover:text-emerald-800'}`}>
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Edit Tenant Modal ─────────────────────────────────────────────────────────

function EditTenantModal({ tenant, onClose, onUpdated }) {
  const [form, setForm] = useState({
    name: tenant.name || '',
    phone: tenant.phone || '',
    address: tenant.address || '',
    city: tenant.city || '',
    subscriptionPlan: tenant.subscription_plan || 'professional',
    maxUsers: tenant.max_users || 20,
    maxCases: tenant.max_cases || 500,
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await superAdminApi.updateTenant(tenant.id, form)
      toast.success('Tenant updated')
      onUpdated(res.data.data)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update')
    } finally {
      setLoading(false)
    }
  }

  const f = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-navy-950" style={{ fontFamily: 'Playfair Display' }}>Edit Tenant</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Firm Name</label>
            <input value={form.name} onChange={f('name')} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Phone</label>
              <input value={form.phone} onChange={f('phone')} className="input-field" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">City</label>
              <input value={form.city} onChange={f('city')} className="input-field" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Plan</label>
            <select value={form.subscriptionPlan} onChange={f('subscriptionPlan')} className="input-field">
              <option value="free">Free</option>
              <option value="starter">Starter</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Max Users</label>
              <input value={form.maxUsers} onChange={f('maxUsers')} type="number" className="input-field" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Max Cases</label>
              <input value={form.maxCases} onChange={f('maxCases')} type="number" className="input-field" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 btn-gold py-2.5 rounded-xl text-sm">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Delete Confirm ────────────────────────────────────────────────────────────

function DeleteConfirm({ tenant, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState('')

  const handleDelete = async () => {
    if (confirm !== tenant.name) return
    setLoading(true)
    try {
      await superAdminApi.deleteTenant(tenant.id)
      toast.success(`Tenant "${tenant.name}" deleted`)
      onDeleted(tenant.id)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Delete Tenant</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          This will permanently delete <strong>{tenant.name}</strong> and all associated data (users, cases, clients, documents, billing records). This cannot be undone.
        </p>
        <p className="text-sm text-gray-700 mb-2 font-medium">Type the firm name to confirm:</p>
        <input value={confirm} onChange={e => setConfirm(e.target.value)}
          placeholder={tenant.name} className="input-field mb-4" />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleDelete} disabled={loading || confirm !== tenant.name}
            className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed">
            {loading ? 'Deleting...' : 'Delete Permanently'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tenant Action Buttons (desktop table) ─────────────────────────────────────

function TenantActions({ tenant, onUsers, onEdit, onActivate, onDeactivate, onDelete }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={onUsers} title="View users" className="text-blue-600 hover:text-blue-800"><Users size={14} /></button>
      <button onClick={onEdit}  title="Edit"       className="text-gray-500 hover:text-gray-700"><Edit size={14} /></button>
      {tenant.subscription_status === 'suspended'
        ? <button onClick={onActivate}   title="Activate" className="text-emerald-600 hover:text-emerald-800"><CheckCircle size={14} /></button>
        : <button onClick={onDeactivate} title="Suspend"  className="text-amber-600 hover:text-amber-800"><XCircle size={14} /></button>
      }
      <button onClick={onDelete} title="Delete" className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
    </div>
  )
}

// ── Payments Tab ──────────────────────────────────────────────────────────────

function PaymentsTab() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [actionLoading, setActionLoading] = useState(null)
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectNote, setRejectNote] = useState('')

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await superAdminApi.listSubscriptionPayments({ status: statusFilter })
      setPayments(res.data.data.payments)
    } catch { toast.error('Failed to load payments') }
    finally { setLoading(false) }
  }, [statusFilter])

  useEffect(() => { fetchPayments() }, [fetchPayments])

  const handleVerify = async (id) => {
    setActionLoading(id)
    try {
      await superAdminApi.verifyPayment(id, {})
      toast.success('Payment verified & subscription activated!')
      fetchPayments()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to verify') }
    finally { setActionLoading(null) }
  }

  const handleReject = async () => {
    if (!rejectModal) return
    setActionLoading(rejectModal)
    try {
      await superAdminApi.rejectPayment(rejectModal, { notes: rejectNote })
      toast.success('Payment rejected')
      setRejectModal(null)
      setRejectNote('')
      fetchPayments()
    } catch { toast.error('Failed to reject') }
    finally { setActionLoading(null) }
  }

  const fmt = (n) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n)

  const statusBadgeLocal = (s) => {
    const map = { pending: 'bg-yellow-100 text-yellow-700', verified: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-600' }
    return <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${map[s] || 'bg-gray-100 text-gray-500'}`}>{s}</span>
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-gray-100 space-y-3">
        <h2 className="text-base md:text-lg font-bold text-[#0a0f2e]" style={{ fontFamily: 'Playfair Display' }}>
          Subscription Payments
        </h2>
        <div className="flex gap-1.5">
          {['pending','verified','rejected'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${statusFilter === s ? 'bg-[#0a0f2e] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Loading payments...</div>
      ) : payments.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No {statusFilter} payments</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Firm</th><th>MPesa Code</th><th>Amount</th>
                  <th>Year</th><th>Submitted</th><th>Status</th>
                  {statusFilter === 'pending' && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div className="font-semibold text-sm text-gray-900">{p.tenant_name}</div>
                      <div className="text-xs text-gray-400">{p.tenant_email}</div>
                    </td>
                    <td><code className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">{p.mpesa_code}</code></td>
                    <td className="font-semibold text-sm">{fmt(p.amount)}</td>
                    <td className="text-sm text-gray-600">Year {p.payment_year}</td>
                    <td className="text-xs text-gray-500">
                      {new Date(p.submitted_at).toLocaleString('en-KE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>{statusBadgeLocal(p.status)}</td>
                    {statusFilter === 'pending' && (
                      <td>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleVerify(p.id)} disabled={actionLoading === p.id}
                            className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold">
                            {actionLoading === p.id ? '...' : 'Verify'}
                          </button>
                          <button onClick={() => { setRejectModal(p.id); setRejectNote('') }}
                            className="text-xs bg-red-100 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-200 font-semibold">
                            Reject
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-50">
            {payments.map(p => (
              <div key={p.id} className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-gray-900 truncate">{p.tenant_name}</div>
                    <div className="text-xs text-gray-400 truncate">{p.tenant_email}</div>
                  </div>
                  {statusBadgeLocal(p.status)}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                  <code className="bg-gray-100 px-2 py-0.5 rounded font-mono text-gray-800">{p.mpesa_code}</code>
                  <span className="font-semibold text-gray-800">{fmt(p.amount)}</span>
                  <span>Year {p.payment_year}</span>
                  <span>{new Date(p.submitted_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' })}</span>
                </div>
                {statusFilter === 'pending' && (
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => handleVerify(p.id)} disabled={actionLoading === p.id}
                      className="flex-1 py-2 text-xs font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
                      {actionLoading === p.id ? 'Verifying...' : 'Verify & Activate'}
                    </button>
                    <button onClick={() => { setRejectModal(p.id); setRejectNote('') }}
                      className="flex-1 py-2 text-xs font-semibold rounded-lg bg-red-100 text-red-600 hover:bg-red-200">
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setRejectModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
            <h3 className="font-bold text-gray-900 mb-3">Reject Payment</h3>
            <textarea
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
              placeholder="Reason for rejection (shown to tenant)..."
              rows={3}
              className="input-field resize-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setRejectModal(null)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleReject} disabled={actionLoading} className="flex-1 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
                {actionLoading ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SuperAdminPage() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('tenants')
  const [stats, setStats] = useState(null)
  const [tenants, setTenants] = useState([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [showCreate, setShowCreate] = useState(false)
  const [selectedTenantUsers, setSelectedTenantUsers] = useState(null)
  const [editingTenant, setEditingTenant] = useState(null)
  const [deletingTenant, setDeletingTenant] = useState(null)

  const fetchAll = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const [statsRes, tenantsRes] = await Promise.all([
        superAdminApi.getStats(),
        superAdminApi.listTenants({ page, limit: 15, search, status: statusFilter })
      ])
      setStats(statsRes.data.data)
      setTenants(tenantsRes.data.data.tenants)
      setPagination(tenantsRes.data.data.pagination)
    } catch {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => {
    const t = setTimeout(() => fetchAll(1), search ? 400 : 0)
    return () => clearTimeout(t)
  }, [fetchAll, search])

  const handleLogout = async () => {
    try { await authApi.logout() } catch {}
    logout()
    navigate('/login')
  }

  const handleActivate = async (tenant) => {
    try {
      await superAdminApi.activateTenant(tenant.id)
      toast.success(`${tenant.name} activated`)
      fetchAll(pagination.page)
    } catch { toast.error('Failed to activate') }
  }

  const handleDeactivate = async (tenant) => {
    try {
      await superAdminApi.deactivateTenant(tenant.id)
      toast.success(`${tenant.name} deactivated`)
      fetchAll(pagination.page)
    } catch { toast.error('Failed to deactivate') }
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ── */}
      <header className="bg-[#0a0f2e] text-white px-4 md:px-6 py-3 md:py-4 shadow-lg sticky top-0 z-20">
        <div className="flex items-center justify-between gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 flex-shrink-0 bg-[#c9a96e] rounded-lg flex items-center justify-center">
              <Scale size={16} className="text-[#0a0f2e]" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-base leading-tight truncate" style={{ fontFamily: 'Playfair Display' }}>
                LEX ADVOCATE
              </div>
              <div className="text-[10px] text-[#c9a96e] font-semibold tracking-widest uppercase">
                Superadmin
              </div>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-[#c9a96e]" />
              <span className="text-xs text-gray-300 truncate max-w-[160px]">{user?.email}</span>
            </div>
            <button onClick={handleLogout}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors px-2.5 py-1.5 rounded-lg hover:bg-white/10 border border-white/10">
              <LogOut size={13} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 md:px-6 py-5 md:py-8">

        {/* Page title */}
        <div className="mb-5 md:mb-8">
          <h1 className="text-xl md:text-3xl font-bold text-[#0a0f2e]" style={{ fontFamily: 'Playfair Display' }}>
            Platform Dashboard
          </h1>
          <p className="text-gray-500 text-xs md:text-sm mt-0.5">Manage all law firm tenants</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-4 mb-5 md:mb-8">
          {[
            { label: 'Tenants',  value: stats?.tenants?.total,     icon: <Building2 size={16} className="text-white" />, color: 'bg-[#0a0f2e]' },
            { label: 'Active',   value: stats?.tenants?.paid,      icon: <CheckCircle size={16} className="text-white" />, color: 'bg-emerald-500' },
            { label: 'Trial',    value: stats?.tenants?.trial,     icon: <RefreshCw size={16} className="text-white" />, color: 'bg-blue-500' },
            { label: 'Suspended',value: stats?.tenants?.suspended, icon: <XCircle size={16} className="text-white" />, color: 'bg-red-500' },
            { label: 'Users',    value: stats?.totalUsers,         icon: <Users size={16} className="text-white" />, color: 'bg-[#c9a96e]' },
            { label: 'Cases',    value: stats?.totalCases,         icon: <Briefcase size={16} className="text-white" />, color: 'bg-purple-500' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-3 md:p-5 shadow-sm flex items-center gap-2 md:gap-3">
              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex-shrink-0 flex items-center justify-center ${s.color}`}>
                {s.icon}
              </div>
              <div className="min-w-0">
                <div className="text-lg md:text-2xl font-bold text-[#0a0f2e] leading-tight">{s.value ?? '—'}</div>
                <div className="text-[10px] md:text-xs text-gray-500 truncate">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 mb-4 md:mb-6 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
          {[
            { key: 'tenants',  label: 'Tenants' },
            { key: 'payments', label: 'Payments' },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === tab.key ? 'bg-[#0a0f2e] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Payments Tab ── */}
        {activeTab === 'payments' && <PaymentsTab />}

        {/* ── Tenants Tab ── */}
        {activeTab === 'tenants' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">

            {/* Toolbar */}
            <div className="p-4 md:p-6 border-b border-gray-100 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base md:text-lg font-bold text-[#0a0f2e]" style={{ fontFamily: 'Playfair Display' }}>
                  Law Firms
                  <span className="ml-1.5 text-xs font-normal text-gray-400">({pagination.total})</span>
                </h2>
                <button onClick={() => setShowCreate(true)}
                  className="btn-gold flex items-center gap-1.5 text-xs md:text-sm px-3 py-2 rounded-lg flex-shrink-0">
                  <Plus size={14} /> New Tenant
                </button>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search firms..." className="input-field pl-9 py-2 text-sm w-full" />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="input-field py-2 text-sm w-28 flex-shrink-0">
                  <option value="">All</option>
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>

            {/* Content */}
            {loading ? (
              <div className="text-center py-16 text-gray-400 text-sm">Loading tenants...</div>
            ) : tenants.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">No tenants found</div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table>
                    <thead>
                      <tr>
                        <th>Firm</th><th>Plan</th><th>Status</th>
                        <th>Users</th><th>Cases</th><th>Created</th><th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenants.map(tenant => (
                        <tr key={tenant.id}>
                          <td>
                            <div className="font-semibold text-gray-900 text-sm">{tenant.name}</div>
                            <div className="text-xs text-gray-400">{tenant.email}</div>
                            {tenant.phone && <div className="text-xs text-gray-400">{tenant.phone}</div>}
                          </td>
                          <td>{planBadge(tenant.subscription_plan)}</td>
                          <td>{statusBadge(tenant.subscription_status)}</td>
                          <td>
                            <span className="text-sm text-gray-700">{tenant.user_count}</span>
                            <span className="text-xs text-gray-400"> / {tenant.max_users}</span>
                          </td>
                          <td>
                            <span className="text-sm text-gray-700">{tenant.case_count}</span>
                            <span className="text-xs text-gray-400"> / {tenant.max_cases}</span>
                          </td>
                          <td className="text-xs text-gray-500">
                            {new Date(tenant.created_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td>
                            <TenantActions tenant={tenant}
                              onUsers={() => setSelectedTenantUsers(tenant)}
                              onEdit={() => setEditingTenant(tenant)}
                              onActivate={() => handleActivate(tenant)}
                              onDeactivate={() => handleDeactivate(tenant)}
                              onDelete={() => setDeletingTenant(tenant)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-gray-50">
                  {tenants.map(tenant => (
                    <div key={tenant.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 text-sm truncate">{tenant.name}</div>
                          <div className="text-xs text-gray-400 truncate">{tenant.email}</div>
                          {tenant.phone && <div className="text-xs text-gray-400">{tenant.phone}</div>}
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          {statusBadge(tenant.subscription_status)}
                          {planBadge(tenant.subscription_plan)}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span><strong className="text-gray-700">{tenant.user_count}</strong>/{tenant.max_users} users</span>
                        <span><strong className="text-gray-700">{tenant.case_count}</strong>/{tenant.max_cases} cases</span>
                        <span>{new Date(tenant.created_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button onClick={() => setSelectedTenantUsers(tenant)}
                          className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100">
                          Users
                        </button>
                        <button onClick={() => setEditingTenant(tenant)}
                          className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">
                          Edit
                        </button>
                        {tenant.subscription_status === 'suspended' ? (
                          <button onClick={() => handleActivate(tenant)}
                            className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                            Activate
                          </button>
                        ) : (
                          <button onClick={() => handleDeactivate(tenant)}
                            className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100">
                            Suspend
                          </button>
                        )}
                        <button onClick={() => setDeletingTenant(tenant)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between px-4 md:px-6 py-4 border-t border-gray-100">
                <p className="text-xs md:text-sm text-gray-500">
                  Page {pagination.page} of {pagination.pages}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => fetchAll(pagination.page - 1)} disabled={pagination.page <= 1}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                    Prev
                  </button>
                  <button onClick={() => fetchAll(pagination.page + 1)} disabled={pagination.page >= pagination.pages}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      {showCreate && <CreateTenantModal onClose={() => setShowCreate(false)} onCreated={() => fetchAll(1)} />}
      {selectedTenantUsers && <TenantUsersModal tenant={selectedTenantUsers} onClose={() => setSelectedTenantUsers(null)} />}
      {editingTenant && <EditTenantModal tenant={editingTenant} onClose={() => setEditingTenant(null)} onUpdated={() => fetchAll(pagination.page)} />}
      {deletingTenant && <DeleteConfirm tenant={deletingTenant} onClose={() => setDeletingTenant(null)} onDeleted={() => { fetchAll(1); setDeletingTenant(null) }} />}
    </div>
  )
}
