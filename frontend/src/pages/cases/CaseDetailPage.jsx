import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Edit, Plus, FileText, Calendar, MessageSquare, Users, Clock, ChevronDown, ChevronUp, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { casesApi } from '../../lib/api'
import { formatDate, formatDateTime, getStatusColor, truncate } from '../../lib/utils'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'

export default function CaseDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('overview')
  const [noteModal, setNoteModal] = useState(false)
  const [hearingModal, setHearingModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [noteContent, setNoteContent] = useState('')
  const [hearing, setHearing] = useState({ hearingDate: '', hearingType: '', venue: '', judgeName: '', notes: '', nextHearingDate: '' })
  const [editData, setEditData] = useState({})

  const { data: caseData, isLoading } = useQuery({
    queryKey: ['case', id],
    queryFn: () => casesApi.getOne(id).then(r => r.data.data)
  })

  const noteMutation = useMutation({
    mutationFn: (data) => casesApi.addNote(id, data),
    onSuccess: () => { toast.success('Note added'); setNoteModal(false); setNoteContent(''); qc.invalidateQueries(['case', id]) },
    onError: () => toast.error('Failed to add note')
  })

  const hearingMutation = useMutation({
    mutationFn: (data) => casesApi.addHearing(id, data),
    onSuccess: () => { toast.success('Hearing added'); setHearingModal(false); qc.invalidateQueries(['case', id]) },
    onError: () => toast.error('Failed to add hearing')
  })

  const updateMutation = useMutation({
    mutationFn: (data) => casesApi.update(id, data),
    onSuccess: () => { toast.success('Case updated'); setEditModal(false); qc.invalidateQueries(['case', id]) },
    onError: () => toast.error('Failed to update case')
  })

  if (isLoading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>
  if (!caseData) return <div className="text-center py-24 text-gray-500">Case not found</div>

  const c = caseData
  const clientName = c.client_org || `${c.client_first || ''} ${c.client_last || ''}`.trim() || '—'
  const advocateName = c.advocate_first ? `${c.advocate_first} ${c.advocate_last}` : '—'

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'notes', label: `Notes (${c.notes?.length || 0})` },
    { key: 'hearings', label: `Hearings (${c.hearings?.length || 0})` },
    { key: 'tasks', label: `Tasks (${c.tasks?.length || 0})` },
    { key: 'documents', label: `Docs (${c.documents?.length || 0})` },
    { key: 'team', label: 'Team' },
  ]

  return (
    <div className="space-y-5 animate-fade-in max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 mt-1">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Playfair Display' }}>{c.title}</h1>
              <Badge status={c.status}>{c.status?.replace('_',' ')}</Badge>
              <Badge status={c.priority}>{c.priority}</Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">{c.case_number} {c.case_type ? `• ${c.case_type}` : ''}</p>
          </div>
        </div>
        <button onClick={() => { setEditData({ status: c.status, priority: c.priority, nextHearingDate: c.next_hearing_date ? c.next_hearing_date.slice(0,16) : '' }); setEditModal(true) }}
          className="btn-navy flex items-center gap-2 text-sm flex-shrink-0">
          <Edit size={14} /> Edit
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Client', value: clientName },
          { label: 'Lead Advocate', value: advocateName },
          { label: 'Court', value: c.court_name || '—' },
          { label: 'Next Hearing', value: c.next_hearing_date ? formatDate(c.next_hearing_date) : '—' },
        ].map((item, i) => (
          <div key={i} className="card p-4">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{item.label}</p>
            <p className="text-sm font-semibold text-gray-800 mt-1">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px
                ${activeTab === tab.key ? 'border-[#c9a96e] text-[#c9a96e]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {c.description && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{c.description}</p>
                </div>
              )}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Court Information</h3>
                  <div className="space-y-2">
                    {[
                      ['Court', c.court_name],
                      ['Station', c.court_station],
                      ['Jurisdiction', c.jurisdiction],
                      ['Judge', c.judge_name],
                      ['Opposing Party', c.opposing_party],
                      ['Opposing Counsel', c.opposing_counsel],
                    ].map(([label, value]) => value ? (
                      <div key={label} className="flex gap-2 text-sm">
                        <span className="text-gray-400 min-w-28">{label}:</span>
                        <span className="text-gray-700 font-medium">{value}</span>
                      </div>
                    ) : null)}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Billing & Timeline</h3>
                  <div className="space-y-2">
                    {[
                      ['Billing Type', c.billing_type],
                      ['Date Filed', c.date_filed ? formatDate(c.date_filed) : null],
                      ['Closed Date', c.closed_date ? formatDate(c.closed_date) : null],
                      ['Hourly Rate', c.hourly_rate ? `KES ${c.hourly_rate}` : null],
                      ['Fixed Fee', c.fixed_fee ? `KES ${c.fixed_fee}` : null],
                      ['Pro Bono', c.is_pro_bono ? 'Yes' : null],
                    ].map(([label, value]) => value ? (
                      <div key={label} className="flex gap-2 text-sm">
                        <span className="text-gray-400 min-w-28">{label}:</span>
                        <span className="text-gray-700 font-medium capitalize">{value}</span>
                      </div>
                    ) : null)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button onClick={() => setNoteModal(true)} className="btn-gold text-sm flex items-center gap-2">
                  <Plus size={14} /> Add Note
                </button>
              </div>
              {!c.notes?.length ? (
                <div className="text-center py-12 text-gray-400 text-sm">No notes yet. Add the first note.</div>
              ) : (
                c.notes.map(note => (
                  <div key={note.id} className="p-4 bg-amber-50/40 border border-amber-100 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-600">{note.first_name} {note.last_name}</span>
                      <span className="text-xs text-gray-400">{formatDateTime(note.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{note.content}</p>
                    {note.is_private && <span className="text-xs text-orange-500 mt-1 inline-block">Private</span>}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'hearings' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button onClick={() => setHearingModal(true)} className="btn-gold text-sm flex items-center gap-2">
                  <Plus size={14} /> Add Hearing
                </button>
              </div>
              {!c.hearings?.length ? (
                <div className="text-center py-12 text-gray-400 text-sm">No hearings recorded.</div>
              ) : (
                c.hearings.map(h => (
                  <div key={h.id} className="p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{formatDateTime(h.hearing_date)}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{h.hearing_type || 'Hearing'} {h.venue ? `• ${h.venue}` : ''}</p>
                      </div>
                      <Badge status={h.status}>{h.status}</Badge>
                    </div>
                    {h.notes && <p className="text-sm text-gray-600 mt-2">{h.notes}</p>}
                    {h.next_hearing_date && (
                      <p className="text-xs text-[#c9a96e] font-medium mt-2">Next: {formatDateTime(h.next_hearing_date)}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button onClick={() => navigate('/dashboard/tasks')} className="btn-navy text-sm flex items-center gap-2">
                  <Plus size={14} /> New Task
                </button>
              </div>
              {!c.tasks?.length ? (
                <div className="text-center py-12 text-gray-400 text-sm">No tasks for this case.</div>
              ) : (
                c.tasks.map(t => (
                  <div key={t.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${t.status === 'completed' ? 'bg-green-400' : t.status === 'in_progress' ? 'bg-blue-400' : 'bg-gray-300'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{t.title}</p>
                      <p className="text-xs text-gray-400">{t.first_name} {t.last_name} {t.due_date ? `• Due: ${formatDate(t.due_date)}` : ''}</p>
                    </div>
                    <Badge status={t.status}>{t.status?.replace('_',' ')}</Badge>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button onClick={() => navigate('/dashboard/documents')} className="btn-gold text-sm flex items-center gap-2">
                  <Plus size={14} /> Upload Document
                </button>
              </div>
              {!c.documents?.length ? (
                <div className="text-center py-12 text-gray-400 text-sm">No documents uploaded.</div>
              ) : (
                c.documents.map(d => (
                  <div key={d.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-xs font-bold text-gray-500">
                      {d.file_type || 'FILE'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{d.title}</p>
                      <p className="text-xs text-gray-400">{d.category} • {formatDate(d.created_at)}</p>
                    </div>
                    <Badge status={d.category}>{d.category}</Badge>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'team' && (
            <div className="space-y-3">
              {!c.team?.length ? (
                <div className="text-center py-12 text-gray-400 text-sm">No team members assigned.</div>
              ) : (
                c.team.map(m => (
                  <div key={m.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg">
                    <div className="w-9 h-9 bg-[#0a0f2e] rounded-full flex items-center justify-center text-[#c9a96e] text-sm font-bold">
                      {m.first_name?.[0]}{m.last_name?.[0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{m.first_name} {m.last_name}</p>
                      <p className="text-xs text-gray-400 capitalize">{m.user_role} • {m.role}</p>
                    </div>
                    <p className="text-xs text-gray-400">{m.email}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={noteModal} onClose={() => setNoteModal(false)} title="Add Case Note" size="sm">
        <div className="space-y-4">
          <textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} rows={5} placeholder="Enter your note..." className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e] resize-none" />
          <div className="flex justify-end gap-3">
            <button onClick={() => setNoteModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={() => noteMutation.mutate({ content: noteContent })} disabled={!noteContent.trim() || noteMutation.isLoading} className="btn-gold text-sm px-5 py-2 flex items-center gap-2">
              <Send size={14} /> Save Note
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={hearingModal} onClose={() => setHearingModal(false)} title="Add Hearing" size="sm">
        <div className="space-y-4">
          {[
            { label: 'Hearing Date *', key: 'hearingDate', type: 'datetime-local' },
            { label: 'Hearing Type', key: 'hearingType', type: 'text', placeholder: 'e.g., Mention, Hearing, Ruling' },
            { label: 'Venue', key: 'venue', type: 'text', placeholder: 'Court room / venue' },
            { label: 'Judge Name', key: 'judgeName', type: 'text', placeholder: 'Hon. Justice ...' },
            { label: 'Next Hearing Date', key: 'nextHearingDate', type: 'datetime-local' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-sm font-medium text-gray-700">{f.label}</label>
              <input type={f.type} value={hearing[f.key]} onChange={e => setHearing(h => ({ ...h, [f.key]: e.target.value }))}
                placeholder={f.placeholder} className="mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e]" />
            </div>
          ))}
          <div>
            <label className="text-sm font-medium text-gray-700">Notes</label>
            <textarea value={hearing.notes} onChange={e => setHearing(h => ({ ...h, notes: e.target.value }))} rows={2} className="mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e] resize-none" />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setHearingModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={() => hearingMutation.mutate(hearing)} disabled={!hearing.hearingDate || hearingMutation.isLoading} className="btn-gold text-sm px-5 py-2">Save Hearing</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title="Edit Case" size="sm">
        <div className="space-y-4">
          {[
            { label: 'Status', key: 'status', type: 'select', options: ['new','active','pending','on_hold','closed','won','lost','settled'] },
            { label: 'Priority', key: 'priority', type: 'select', options: ['low','medium','high','urgent'] },
          ].map(f => (
            <div key={f.key}>
              <label className="text-sm font-medium text-gray-700">{f.label}</label>
              <select value={editData[f.key] || ''} onChange={e => setEditData(d => ({ ...d, [f.key]: e.target.value }))}
                className="mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e]">
                {f.options.map(o => <option key={o} value={o} className="capitalize">{o.replace('_',' ')}</option>)}
              </select>
            </div>
          ))}
          <div>
            <label className="text-sm font-medium text-gray-700">Next Hearing Date</label>
            <input type="datetime-local" value={editData.nextHearingDate || ''} onChange={e => setEditData(d => ({ ...d, nextHearingDate: e.target.value }))}
              className="mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e]" />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setEditModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={() => updateMutation.mutate(editData)} disabled={updateMutation.isLoading} className="btn-gold text-sm px-5 py-2">Save Changes</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
