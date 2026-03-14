import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { billingApi, clientsApi, casesApi } from '../../lib/api'
import { formatCurrency } from '../../lib/utils'

export default function NewInvoicePage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [form, setForm] = useState({ clientId: '', caseId: '', dueDate: '', billingType: 'fixed', taxRate: 16, discountAmount: 0, notes: '', terms: 'Payment due within 30 days.' })
  const [items, setItems] = useState([{ description: '', quantity: 1, unitPrice: 0 }])

  const { data: clientsData } = useQuery({ queryKey: ['clients-list'], queryFn: () => clientsApi.getAll({ limit: 200 }).then(r => r.data.data) })
  const { data: casesData } = useQuery({ queryKey: ['cases-list'], queryFn: () => casesApi.getAll({ limit: 200 }).then(r => r.data.data) })

  const clients = clientsData || []
  const cases = casesData || []

  const mutation = useMutation({
    mutationFn: (data) => billingApi.createInvoice(data),
    onSuccess: (res) => { toast.success('Invoice created!'); qc.invalidateQueries(['invoices']); navigate(`/dashboard/billing/invoices/${res.data.data.id}`) },
    onError: () => toast.error('Failed to create invoice')
  })

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.quantity || 0) * parseFloat(i.unitPrice || 0)), 0)
  const taxAmount = (subtotal * parseFloat(form.taxRate || 0)) / 100
  const total = subtotal + taxAmount - parseFloat(form.discountAmount || 0)

  const addItem = () => setItems(prev => [...prev, { description: '', quantity: 1, unitPrice: 0 }])
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx))
  const updateItem = (idx, field, value) => setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))

  const inp = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e] focus:ring-2 focus:ring-[#c9a96e]/20"

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Playfair Display' }}>New Invoice</h1>
          <p className="text-gray-500 text-sm">Create a new billing invoice</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="card p-5 space-y-4">
          <h2 className="font-bold text-gray-800" style={{ fontFamily: 'Playfair Display' }}>Invoice Details</h2>
          <div>
            <label className="text-sm font-medium text-gray-700">Client *</label>
            <select value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))} className={`mt-1 ${inp}`}>
              <option value="">Select client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.organization_name || `${c.first_name} ${c.last_name}`}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Case (optional)</label>
            <select value={form.caseId} onChange={e => setForm(f => ({ ...f, caseId: e.target.value }))} className={`mt-1 ${inp}`}>
              <option value="">No linked case</option>
              {cases.map(c => <option key={c.id} value={c.id}>{c.case_number} – {c.title?.slice(0,30)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Due Date</label>
            <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className={`mt-1 ${inp}`} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Billing Type</label>
            <select value={form.billingType} onChange={e => setForm(f => ({ ...f, billingType: e.target.value }))} className={`mt-1 ${inp}`}>
              {['fixed','hourly','retainer','mixed'].map(b => <option key={b} value={b} className="capitalize">{b}</option>)}
            </select>
          </div>
        </div>

        <div className="card p-5 space-y-4">
          <h2 className="font-bold text-gray-800" style={{ fontFamily: 'Playfair Display' }}>Totals</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-semibold text-gray-800">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Tax Rate (%)</span>
              <input type="number" value={form.taxRate} onChange={e => setForm(f => ({ ...f, taxRate: e.target.value }))} className="w-20 px-2 py-1 text-sm border border-gray-200 rounded text-right outline-none focus:border-[#c9a96e]" />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Tax Amount</span>
              <span className="text-gray-600">{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Discount (KES)</span>
              <input type="number" value={form.discountAmount} onChange={e => setForm(f => ({ ...f, discountAmount: e.target.value }))} className="w-28 px-2 py-1 text-sm border border-gray-200 rounded text-right outline-none focus:border-[#c9a96e]" />
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-gray-100 pt-3">
              <span className="text-gray-800">Total</span>
              <span className="text-[#c9a96e]">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-800" style={{ fontFamily: 'Playfair Display' }}>Line Items</h2>
          <button onClick={addItem} className="text-sm text-[#c9a96e] font-semibold flex items-center gap-1 hover:underline">
            <Plus size={14} /> Add Item
          </button>
        </div>

        <div className="space-y-3">
          <div className="hidden md:grid grid-cols-12 gap-3 text-xs font-semibold text-gray-500 uppercase px-1">
            <span className="col-span-6">Description</span>
            <span className="col-span-2 text-center">Qty</span>
            <span className="col-span-2 text-right">Unit Price</span>
            <span className="col-span-1 text-right">Amount</span>
            <span className="col-span-1"></span>
          </div>

          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-3 items-center">
              <input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Item description..." className={`col-span-12 md:col-span-6 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e]`} />
              <input value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} type="number" min="0.5" step="0.5" className={`col-span-4 md:col-span-2 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e] text-center`} />
              <input value={item.unitPrice} onChange={e => updateItem(idx, 'unitPrice', e.target.value)} type="number" placeholder="0" className={`col-span-4 md:col-span-2 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e] text-right`} />
              <div className="col-span-3 md:col-span-1 text-right">
                <span className="text-sm font-medium text-gray-700">{formatCurrency(item.quantity * item.unitPrice)}</span>
              </div>
              <div className="col-span-1 flex justify-end">
                {items.length > 1 && (
                  <button onClick={() => removeItem(idx)} className="p-1.5 hover:bg-red-50 rounded text-red-400">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700">Notes</label>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Additional notes..." className={`mt-1 ${inp} resize-none`} />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Terms & Conditions</label>
          <textarea value={form.terms} onChange={e => setForm(f => ({ ...f, terms: e.target.value }))} rows={2} className={`mt-1 ${inp} resize-none`} />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button onClick={() => navigate(-1)} className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
        <button onClick={() => mutation.mutate({ ...form, taxRate: parseFloat(form.taxRate), discountAmount: parseFloat(form.discountAmount), items: items.map(i => ({ ...i, quantity: parseFloat(i.quantity), unitPrice: parseFloat(i.unitPrice) })) })}
          disabled={!form.clientId || mutation.isLoading} className="btn-gold flex items-center gap-2 text-sm px-6 py-2.5">
          {mutation.isLoading ? <><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Saving...</> : <><Save size={16} />Create Invoice</>}
        </button>
      </div>
    </div>
  )
}
