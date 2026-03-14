import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { authApi } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore()
  const [form, setForm] = useState({ firstName: user?.firstName || '', lastName: user?.lastName || '', phone: user?.phone || '', specialization: user?.specialization || '', barNumber: user?.barNumber || '', bio: user?.bio || '' })
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })

  const updateMutation = useMutation({
    mutationFn: (data) => authApi.updateProfile(data),
    onSuccess: (res) => { toast.success('Profile updated!'); updateUser(res.data.data) },
    onError: () => toast.error('Update failed')
  })

  const pwMutation = useMutation({
    mutationFn: (data) => authApi.changePassword(data),
    onSuccess: () => { toast.success('Password changed!'); setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' }) },
    onError: (err) => toast.error(err.response?.data?.message || 'Password change failed')
  })

  const handlePwSubmit = (e) => {
    e.preventDefault()
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error('Passwords do not match'); return }
    pwMutation.mutate({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
  }

  const inp = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e] focus:ring-2 focus:ring-[#c9a96e]/20"

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Playfair Display' }}>My Profile</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage your personal information</p>
      </div>

      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
          <div className="w-16 h-16 bg-[#0a0f2e] rounded-full flex items-center justify-center text-[#c9a96e] text-2xl font-bold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div>
            <p className="font-bold text-gray-900">{user?.firstName} {user?.lastName}</p>
            <p className="text-sm text-gray-500 capitalize">{user?.role} • {user?.tenantName}</p>
          </div>
        </div>

        <h2 className="font-bold text-gray-800" style={{ fontFamily: 'Playfair Display' }}>Personal Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">First Name</label>
            <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} className={`mt-1 ${inp}`} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Last Name</label>
            <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} className={`mt-1 ${inp}`} />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Phone</label>
          <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="0712 345 678" className={`mt-1 ${inp}`} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Specialization</label>
            <input value={form.specialization} onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))} placeholder="e.g., Corporate Law" className={`mt-1 ${inp}`} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">LSK Bar Number</label>
            <input value={form.barNumber} onChange={e => setForm(f => ({ ...f, barNumber: e.target.value }))} placeholder="LSK/20xx/xxxxxx" className={`mt-1 ${inp}`} />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Bio</label>
          <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={3} placeholder="A short bio..." className={`mt-1 ${inp} resize-none`} />
        </div>
        <div className="flex justify-end">
          <button onClick={() => updateMutation.mutate(form)} disabled={updateMutation.isLoading} className="btn-gold text-sm px-6 py-2.5">
            {updateMutation.isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="font-bold text-gray-800" style={{ fontFamily: 'Playfair Display' }}>Change Password</h2>
        <form onSubmit={handlePwSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Current Password</label>
            <input type="password" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} className={`mt-1 ${inp}`} required />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">New Password</label>
            <input type="password" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} className={`mt-1 ${inp}`} required minLength={8} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Confirm New Password</label>
            <input type="password" value={pwForm.confirmPassword} onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))} className={`mt-1 ${inp}`} required />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={pwMutation.isLoading} className="btn-navy text-sm px-6 py-2.5">
              {pwMutation.isLoading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
