import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { tenantApi } from '../../lib/api'
import Spinner from '../../components/ui/Spinner'

export default function SettingsPage() {
  const qc = useQueryClient()
  const { data: tenant, isLoading } = useQuery({ queryKey: ['tenant-current'], queryFn: () => tenantApi.getCurrent().then(r => r.data.data) })
  const [form, setForm] = useState(null)

  const mutation = useMutation({
    mutationFn: (data) => tenantApi.updateSettings(data),
    onSuccess: () => { toast.success('Settings saved!'); qc.invalidateQueries(['tenant-current']) },
    onError: () => toast.error('Failed to save settings')
  })

  if (isLoading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>
  if (!form && tenant) {
    setForm({ name: tenant.name || '', phone: tenant.phone || '', address: tenant.address || '', city: tenant.city || '', website: tenant.website || '' })
    return null
  }

  const inp = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e] focus:ring-2 focus:ring-[#c9a96e]/20"

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Playfair Display' }}>Firm Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage your law firm's details</p>
      </div>

      <div className="card p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Plan', value: tenant?.subscription_plan },
          { label: 'Status', value: tenant?.subscription_status },
          { label: 'Users', value: `${tenant?.user_count} / ${tenant?.max_users}` },
          { label: 'Cases', value: `${tenant?.case_count} / ${tenant?.max_cases}` },
        ].map((item, i) => (
          <div key={i}>
            <p className="text-xs text-gray-400 uppercase tracking-wider">{item.label}</p>
            <p className="text-sm font-bold text-gray-800 mt-1 capitalize">{item.value}</p>
          </div>
        ))}
      </div>

      {form && (
        <div className="card p-6 space-y-5">
          <h2 className="font-bold text-gray-800" style={{ fontFamily: 'Playfair Display' }}>Firm Information</h2>
          <div>
            <label className="text-sm font-medium text-gray-700">Firm Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={`mt-1 ${inp}`} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Phone</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="0712 345 678" className={`mt-1 ${inp}`} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Website</label>
              <input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://yourfirm.co.ke" className={`mt-1 ${inp}`} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Address</label>
            <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Firm physical address" className={`mt-1 ${inp}`} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">City</label>
            <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="City" className={`mt-1 ${inp}`} />
          </div>
          <div className="flex justify-end">
            <button onClick={() => mutation.mutate(form)} disabled={mutation.isLoading} className="btn-gold text-sm px-6 py-2.5">
              {mutation.isLoading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
