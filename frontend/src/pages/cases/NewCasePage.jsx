import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { casesApi, clientsApi, usersApi } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'

const CASE_TYPES = ['Civil','Criminal','Family','Commercial','Employment','Land & Property','Constitutional','Human Rights','Succession','Intellectual Property','Tax','Immigration','Other']
const BILLING_TYPES = ['hourly','fixed','retainer','contingency','pro_bono']

export default function NewCasePage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const { register, handleSubmit, watch, formState: { errors } } = useForm({ defaultValues: { status: 'new', priority: 'medium', billingType: 'hourly', isProBono: false } })

  const { data: clientsData } = useQuery({ queryKey: ['clients-list'], queryFn: () => clientsApi.getAll({ limit: 100 }).then(r => r.data.data) })
  const { data: usersData } = useQuery({ queryKey: ['users-list'], queryFn: () => usersApi.getAll({ limit: 100, role: 'advocate' }).then(r => r.data.data), enabled: user?.role === 'admin' })

  const clients = clientsData || []
  const advocates = usersData || []
  const billingType = watch('billingType')

  const mutation = useMutation({
    mutationFn: (data) => casesApi.create(data),
    onSuccess: (res) => {
      toast.success('Case created successfully!')
      qc.invalidateQueries(['cases'])
      navigate(`/dashboard/cases/${res.data.data.id}`)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create case')
  })

  const onSubmit = (data) => {
    mutation.mutate({
      ...data,
      hourlyRate: data.hourlyRate ? parseFloat(data.hourlyRate) : undefined,
      fixedFee: data.fixedFee ? parseFloat(data.fixedFee) : undefined,
      retainerAmount: data.retainerAmount ? parseFloat(data.retainerAmount) : undefined,
      estimatedValue: data.estimatedValue ? parseFloat(data.estimatedValue) : undefined,
    })
  }

  const labelClass = "text-sm font-medium text-gray-700"
  const inputClass = "mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e] focus:ring-2 focus:ring-[#c9a96e]/20 transition-all"
  const errorClass = "text-xs text-red-500 mt-1"

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Playfair Display' }}>New Case</h1>
          <p className="text-gray-500 text-sm">Create a new legal matter</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card p-6 space-y-5">
          <h2 className="font-bold text-gray-800 text-lg border-b border-gray-100 pb-3" style={{ fontFamily: 'Playfair Display' }}>Case Information</h2>
          <div>
            <label className={labelClass}>Case Title *</label>
            <input {...register('title', { required: 'Title is required' })} placeholder="e.g., John Doe vs Kenya Revenue Authority" className={inputClass} />
            {errors.title && <p className={errorClass}>{errors.title.message}</p>}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Case Type</label>
              <select {...register('caseType')} className={inputClass}>
                <option value="">Select type</option>
                {CASE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Client</label>
              <select {...register('clientId')} className={inputClass}>
                <option value="">Select client</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.organization_name || `${c.first_name} ${c.last_name}`}</option>)}
              </select>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Status</label>
              <select {...register('status')} className={inputClass}>
                {['new','active','pending','on_hold'].map(s => <option key={s} value={s} className="capitalize">{s.replace('_',' ')}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Priority</label>
              <select {...register('priority')} className={inputClass}>
                {['low','medium','high','urgent'].map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
              </select>
            </div>
            {user?.role === 'admin' && (
              <div>
                <label className={labelClass}>Lead Advocate</label>
                <select {...register('leadAdvocateId')} className={inputClass}>
                  <option value="">Select advocate</option>
                  {advocates.map(a => <option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>)}
                </select>
              </div>
            )}
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea {...register('description')} rows={3} placeholder="Brief description of the case..." className={`${inputClass} resize-none`} />
          </div>
        </div>

        <div className="card p-6 space-y-5">
          <h2 className="font-bold text-gray-800 text-lg border-b border-gray-100 pb-3" style={{ fontFamily: 'Playfair Display' }}>Court Details</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Court Name</label>
              <input {...register('courtName')} placeholder="e.g., High Court of Kenya" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Court Station</label>
              <input {...register('courtStation')} placeholder="e.g., Nairobi" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Jurisdiction</label>
              <input {...register('jurisdiction')} placeholder="e.g., Civil Division" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Judge Name</label>
              <input {...register('judgeName')} placeholder="e.g., Hon. Justice Mwangi" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Opposing Party</label>
              <input {...register('opposingParty')} placeholder="Name of opposing party" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Opposing Counsel</label>
              <input {...register('opposingCounsel')} placeholder="Opposing counsel name" className={inputClass} />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Date Filed</label>
              <input {...register('dateFiled')} type="date" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Next Hearing Date</label>
              <input {...register('nextHearingDate')} type="datetime-local" className={inputClass} />
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-5">
          <h2 className="font-bold text-gray-800 text-lg border-b border-gray-100 pb-3" style={{ fontFamily: 'Playfair Display' }}>Billing</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Billing Type</label>
              <select {...register('billingType')} className={inputClass}>
                {BILLING_TYPES.map(b => <option key={b} value={b} className="capitalize">{b.replace('_',' ')}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Estimated Value (KES)</label>
              <input {...register('estimatedValue')} type="number" placeholder="0.00" className={inputClass} />
            </div>
          </div>
          {billingType === 'hourly' && (
            <div>
              <label className={labelClass}>Hourly Rate (KES)</label>
              <input {...register('hourlyRate')} type="number" placeholder="0.00" className={`${inputClass} max-w-xs`} />
            </div>
          )}
          {billingType === 'fixed' && (
            <div>
              <label className={labelClass}>Fixed Fee (KES)</label>
              <input {...register('fixedFee')} type="number" placeholder="0.00" className={`${inputClass} max-w-xs`} />
            </div>
          )}
          {billingType === 'retainer' && (
            <div>
              <label className={labelClass}>Retainer Amount (KES)</label>
              <input {...register('retainerAmount')} type="number" placeholder="0.00" className={`${inputClass} max-w-xs`} />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
          <button type="submit" disabled={mutation.isLoading} className="btn-gold flex items-center gap-2 text-sm px-6 py-2.5">
            {mutation.isLoading ? <><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Saving...</> : <><Save size={16} />Create Case</>}
          </button>
        </div>
      </form>
    </div>
  )
}
