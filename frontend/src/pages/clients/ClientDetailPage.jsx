import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Mail, Phone, MapPin, Briefcase, FileText } from 'lucide-react'
import { clientsApi } from '../../lib/api'
import { formatDate, formatCurrency } from '../../lib/utils'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'

export default function ClientDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: () => clientsApi.getOne(id).then(r => r.data.data)
  })

  if (isLoading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>
  if (!client) return <div className="text-center py-24 text-gray-500">Client not found</div>

  const name = client.client_type === 'organization' ? client.organization_name : `${client.first_name || ''} ${client.last_name || ''}`.trim()

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Playfair Display' }}>{name}</h1>
          <p className="text-sm text-gray-500 capitalize">{client.client_type} Client • {client.status}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        <div className="md:col-span-1 space-y-4">
          <div className="card p-5">
            <div className="w-16 h-16 bg-[#0a0f2e] rounded-2xl flex items-center justify-center text-[#c9a96e] text-2xl font-bold mb-4">
              {name.slice(0,2).toUpperCase()}
            </div>
            <h2 className="font-bold text-gray-900 text-lg" style={{ fontFamily: 'Playfair Display' }}>{name}</h2>
            <Badge status={client.status} className="mt-2">{client.status}</Badge>

            <div className="mt-4 space-y-3">
              {client.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail size={14} className="text-gray-400" /> {client.email}
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone size={14} className="text-gray-400" /> {client.phone}
                </div>
              )}
              {(client.address || client.city) && (
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <MapPin size={14} className="text-gray-400 mt-0.5" />
                  <span>{[client.address, client.city, client.county].filter(Boolean).join(', ')}</span>
                </div>
              )}
            </div>

            {client.id_number && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400">ID Number</p>
                <p className="text-sm font-medium text-gray-700">{client.id_number}</p>
              </div>
            )}
            {client.kra_pin && (
              <div className="mt-2">
                <p className="text-xs text-gray-400">KRA PIN</p>
                <p className="text-sm font-medium text-gray-700">{client.kra_pin}</p>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-2 space-y-5">
          <div className="card p-5">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2" style={{ fontFamily: 'Playfair Display' }}>
              <Briefcase size={16} className="text-[#c9a96e]" /> Cases ({client.cases?.length || 0})
            </h3>
            {!client.cases?.length ? (
              <div className="text-center py-8 text-gray-400 text-sm">No cases for this client</div>
            ) : (
              <div className="space-y-2">
                {client.cases.map(c => (
                  <div key={c.id} onClick={() => navigate(`/dashboard/cases/${c.id}`)} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-amber-50/30 cursor-pointer transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{c.title}</p>
                      <p className="text-xs text-gray-400">{c.case_number} • {formatDate(c.created_at)}</p>
                    </div>
                    <Badge status={c.status}>{c.status?.replace('_',' ')}</Badge>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => navigate('/dashboard/cases/new')} className="mt-4 text-sm text-[#c9a96e] font-medium hover:underline">+ New case for this client</button>
          </div>

          <div className="card p-5">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2" style={{ fontFamily: 'Playfair Display' }}>
              <FileText size={16} className="text-[#c9a96e]" /> Invoices ({client.invoices?.length || 0})
            </h3>
            {!client.invoices?.length ? (
              <div className="text-center py-8 text-gray-400 text-sm">No invoices for this client</div>
            ) : (
              <div className="space-y-2">
                {client.invoices.map(inv => (
                  <div key={inv.id} onClick={() => navigate(`/dashboard/billing/invoices/${inv.id}`)} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-amber-50/30 cursor-pointer">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{inv.invoice_number}</p>
                      <p className="text-xs text-gray-400">{formatDate(inv.invoice_date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-800">{formatCurrency(inv.total_amount)}</p>
                      <Badge status={inv.status}>{inv.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
