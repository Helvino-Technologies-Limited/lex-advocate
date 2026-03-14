import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { FileDown, Loader2 } from 'lucide-react'
import { reportsApi } from '../../lib/api'
import { formatCurrency, formatDate } from '../../lib/utils'
import Spinner from '../../components/ui/Spinner'
import toast from 'react-hot-toast'

const COLORS = ['#c9a96e','#0a0f2e','#4ade80','#60a5fa','#f87171','#a78bfa','#fb923c','#34d399']

async function exportPDF({ financial, detailed, startDate, endDate }) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const gold = [201, 169, 110]
  const navy = [10, 15, 46]
  const gray = [107, 114, 128]
  const lightGray = [243, 244, 246]

  const firmName = detailed?.firm?.name || 'Law Firm'
  const periodLabel = `${new Date(startDate).toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' })} — ${new Date(endDate).toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' })}`
  const generatedAt = new Date().toLocaleString('en-KE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  function addHeader(title) {
    // Navy header bar
    doc.setFillColor(...navy)
    doc.rect(0, 0, W, 28, 'F')
    doc.setFillColor(...gold)
    doc.rect(0, 28, W, 1.5, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(201, 169, 110)
    doc.text(firmName.toUpperCase(), 14, 12)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(148, 163, 184)
    doc.text('Financial Report', 14, 20)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(255, 255, 255)
    doc.text(title, W - 14, 12, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text(`Period: ${periodLabel}`, W - 14, 20, { align: 'right' })
    doc.text(`Generated: ${generatedAt}`, W - 14, 25, { align: 'right' })
  }

  function sectionTitle(text, y) {
    doc.setFillColor(...gold)
    doc.rect(14, y, 3, 6, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...navy)
    doc.text(text, 20, y + 5)
    return y + 12
  }

  function statBox(x, y, w, label, value, color) {
    doc.setFillColor(...lightGray)
    doc.roundedRect(x, y, w, 20, 2, 2, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...gray)
    doc.text(label.toUpperCase(), x + 4, y + 7)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...(color || navy))
    doc.text(value, x + 4, y + 16)
  }

  // ── PAGE 1: Summary ─────────────────────────────────────────
  addHeader('FINANCIAL SUMMARY')

  let y = 38
  y = sectionTitle('Key Metrics', y)

  const revenue = parseFloat(financial?.revenue?.total || 0)
  const expenses = parseFloat(financial?.expenses?.total || 0)
  const profit = revenue - expenses
  const outstanding = parseFloat(financial?.outstanding?.total || 0)
  const boxW = (W - 28 - 9) / 4

  statBox(14,           y, boxW, 'Total Revenue',    formatCurrency(revenue),      [5, 150, 105])
  statBox(14 + boxW + 3, y, boxW, 'Total Expenses',  formatCurrency(expenses),     [239, 68, 68])
  statBox(14 + (boxW + 3) * 2, y, boxW, 'Net Profit', formatCurrency(profit),      profit >= 0 ? [37, 99, 235] : [239, 68, 68])
  statBox(14 + (boxW + 3) * 3, y, boxW, 'Outstanding', formatCurrency(outstanding), [217, 119, 6])
  y += 28

  // Top clients
  if (financial?.topClients?.length > 0) {
    y = sectionTitle('Top Clients by Revenue', y)
    autoTable(doc, {
      startY: y,
      head: [['#', 'Client', 'Total Paid']],
      body: financial.topClients.map((c, i) => [
        i + 1,
        c.organization_name || `${c.first_name || ''} ${c.last_name || ''}`.trim(),
        formatCurrency(c.total_paid)
      ]),
      margin: { left: 14, right: 14 },
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: navy, textColor: gold, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: { 0: { cellWidth: 12 }, 2: { halign: 'right', fontStyle: 'bold' } }
    })
    y = doc.lastAutoTable.finalY + 8
  }

  // Invoice summary by status
  if (detailed?.invoices?.length > 0) {
    const statusMap = {}
    detailed.invoices.forEach(inv => {
      const s = inv.status || 'unknown'
      if (!statusMap[s]) statusMap[s] = { count: 0, total: 0 }
      statusMap[s].count++
      statusMap[s].total += parseFloat(inv.total_amount || 0)
    })
    y = sectionTitle('Invoice Summary by Status', y)
    autoTable(doc, {
      startY: y,
      head: [['Status', 'Count', 'Total Amount']],
      body: Object.entries(statusMap).map(([status, data]) => [
        status.replace(/_/g, ' ').toUpperCase(),
        data.count,
        formatCurrency(data.total)
      ]),
      margin: { left: 14, right: 14 },
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: navy, textColor: gold, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right', fontStyle: 'bold' } }
    })
  }

  // ── PAGE 2: Invoices ─────────────────────────────────────────
  if (detailed?.invoices?.length > 0) {
    doc.addPage()
    addHeader('INVOICES')
    y = 38

    y = sectionTitle(`All Invoices (${detailed.invoices.length})`, y)
    autoTable(doc, {
      startY: y,
      head: [['Invoice #', 'Client', 'Date', 'Due Date', 'Total', 'Paid', 'Balance', 'Status']],
      body: detailed.invoices.map(inv => {
        const client = inv.organization_name || `${inv.first_name || ''} ${inv.last_name || ''}`.trim() || '—'
        return [
          inv.invoice_number,
          client.substring(0, 20),
          formatDate(inv.invoice_date),
          inv.due_date ? formatDate(inv.due_date) : '—',
          formatCurrency(inv.total_amount),
          formatCurrency(inv.amount_paid),
          formatCurrency(inv.balance_due),
          (inv.status || '').replace(/_/g, ' ')
        ]
      }),
      margin: { left: 14, right: 14 },
      styles: { fontSize: 7.5, cellPadding: 3 },
      headStyles: { fillColor: navy, textColor: gold, fontStyle: 'bold', fontSize: 7 },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: {
        4: { halign: 'right' }, 5: { halign: 'right', textColor: [5, 150, 105] },
        6: { halign: 'right', textColor: [239, 68, 68] }, 7: { halign: 'center' }
      }
    })
  }

  // ── PAGE 3: Payments ─────────────────────────────────────────
  if (detailed?.payments?.length > 0) {
    doc.addPage()
    addHeader('PAYMENTS RECEIVED')
    y = 38

    const totalPayments = detailed.payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0)
    y = sectionTitle(`Payments Received (${detailed.payments.length}) — Total: ${formatCurrency(totalPayments)}`, y)

    autoTable(doc, {
      startY: y,
      head: [['Date', 'Client', 'Invoice', 'Method', 'Reference', 'Amount']],
      body: detailed.payments.map(p => {
        const client = p.organization_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || '—'
        return [
          formatDate(p.payment_date),
          client.substring(0, 20),
          p.invoice_number || '—',
          (p.payment_method || '').replace(/_/g, ' '),
          p.mpesa_code || p.transaction_id || '—',
          formatCurrency(p.amount)
        ]
      }),
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8, cellPadding: 3.5 },
      headStyles: { fillColor: navy, textColor: gold, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      columnStyles: { 5: { halign: 'right', fontStyle: 'bold', textColor: [5, 150, 105] } }
    })
  }

  // ── PAGE 4: Expenses ─────────────────────────────────────────
  if (detailed?.expenses?.length > 0) {
    doc.addPage()
    addHeader('EXPENSES')
    y = 38

    const totalExp = detailed.expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0)
    y = sectionTitle(`Expenses (${detailed.expenses.length}) — Total: ${formatCurrency(totalExp)}`, y)

    autoTable(doc, {
      startY: y,
      head: [['Date', 'Description', 'Category', 'Case', 'Billable', 'Amount']],
      body: detailed.expenses.map(e => [
        formatDate(e.expense_date),
        (e.description || '').substring(0, 30),
        (e.category || '').replace(/_/g, ' '),
        e.case_number || '—',
        e.is_billable ? 'Yes' : 'No',
        formatCurrency(e.amount)
      ]),
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8, cellPadding: 3.5 },
      headStyles: { fillColor: navy, textColor: gold, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [254, 242, 242] },
      columnStyles: { 5: { halign: 'right', fontStyle: 'bold', textColor: [239, 68, 68] } }
    })
  }

  // Page numbers
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(...gray)
    doc.text(`Page ${i} of ${pageCount}`, W / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' })
    doc.text(`${firmName} — Confidential`, 14, doc.internal.pageSize.getHeight() - 8)
  }

  const filename = `Financial-Report-${startDate}-to-${endDate}.pdf`
  doc.save(filename)
}

export default function ReportsPage() {
  const [tab, setTab] = useState('financial')
  const [exporting, setExporting] = useState(false)
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])

  const { data: financial, isLoading: finLoading } = useQuery({
    queryKey: ['report-financial', startDate, endDate],
    queryFn: () => reportsApi.getFinancial({ startDate, endDate }).then(r => r.data.data),
    enabled: tab === 'financial'
  })

  const { data: caseReport, isLoading: caseLoading } = useQuery({
    queryKey: ['report-cases'],
    queryFn: () => reportsApi.getCases().then(r => r.data.data),
    enabled: tab === 'cases'
  })

  const handleExportPDF = async () => {
    setExporting(true)
    try {
      const [finRes, detailRes] = await Promise.all([
        reportsApi.getFinancial({ startDate, endDate }),
        reportsApi.getDetailed({ startDate, endDate })
      ])
      await exportPDF({
        financial: finRes.data.data,
        detailed: detailRes.data.data,
        startDate,
        endDate
      })
      toast.success('PDF exported successfully!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to export PDF')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Playfair Display' }}>Reports & Analytics</h1>
          <p className="text-gray-500 text-sm mt-0.5">Insights into your firm's performance</p>
        </div>
        {tab === 'financial' && (
          <button onClick={handleExportPDF} disabled={exporting}
            className="flex items-center gap-2 text-sm px-4 py-2 bg-[#0a0f2e] text-white rounded-lg hover:bg-[#1a2060] transition-colors disabled:opacity-60">
            {exporting ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
            {exporting ? 'Exporting...' : 'Export PDF'}
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="flex border-b border-gray-100">
          {['financial','cases'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-6 py-3.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${tab === t ? 'border-[#c9a96e] text-[#c9a96e]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t === 'financial' ? 'Financial Report' : 'Case Analytics'}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === 'financial' && (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="text-sm font-medium text-gray-700">From</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                    className="mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e]" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">To</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                    className="mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#c9a96e]" />
                </div>
              </div>

              {finLoading ? <div className="flex justify-center py-12"><Spinner /></div> : financial && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Total Revenue', value: formatCurrency(financial.revenue?.total || 0), color: 'text-green-600', bg: 'bg-green-50' },
                      { label: 'Total Expenses', value: formatCurrency(financial.expenses?.total || 0), color: 'text-red-600', bg: 'bg-red-50' },
                      { label: 'Net Profit', value: formatCurrency((financial.revenue?.total || 0) - (financial.expenses?.total || 0)), color: 'text-blue-600', bg: 'bg-blue-50' },
                      { label: 'Outstanding', value: formatCurrency(financial.outstanding?.total || 0), color: 'text-orange-600', bg: 'bg-orange-50' },
                    ].map((item, i) => (
                      <div key={i} className={`${item.bg} p-5 rounded-xl`}>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{item.label}</p>
                        <p className={`text-2xl font-bold ${item.color}`} style={{ fontFamily: 'Playfair Display' }}>{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {financial.topClients?.length > 0 && (
                    <div>
                      <h3 className="font-bold text-gray-900 mb-4" style={{ fontFamily: 'Playfair Display' }}>Top Clients by Revenue</h3>
                      <div className="space-y-3">
                        {financial.topClients.map((c, i) => {
                          const name = c.organization_name || `${c.first_name} ${c.last_name}`
                          const maxPaid = Math.max(...financial.topClients.map(x => x.total_paid))
                          const pct = (c.total_paid / maxPaid) * 100
                          return (
                            <div key={i} className="flex items-center gap-3">
                              <div className="w-6 h-6 bg-[#0a0f2e] rounded-full flex items-center justify-center text-[#c9a96e] text-xs font-bold flex-shrink-0">{i+1}</div>
                              <div className="flex-1">
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="font-medium text-gray-700">{name}</span>
                                  <span className="font-bold text-gray-900">{formatCurrency(c.total_paid)}</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-[#c9a96e] rounded-full transition-all" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {tab === 'cases' && (
            <div className="space-y-6">
              {caseLoading ? <div className="flex justify-center py-12"><Spinner /></div> : caseReport && (
                <>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-bold text-gray-900 mb-4" style={{ fontFamily: 'Playfair Display' }}>Case Status Distribution</h3>
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={caseReport.statusDistribution} cx="50%" cy="50%" outerRadius={85} dataKey="count" nameKey="status" paddingAngle={3}>
                            {caseReport.statusDistribution?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-4" style={{ fontFamily: 'Playfair Display' }}>Cases by Type</h3>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={caseReport.typeDistribution?.slice(0,7) || []} layout="vertical">
                          <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="type" tick={{ fontSize: 11 }} width={100} axisLine={false} tickLine={false} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#c9a96e" radius={[0,4,4,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {caseReport.advocateWorkload?.length > 0 && (
                    <div>
                      <h3 className="font-bold text-gray-900 mb-4" style={{ fontFamily: 'Playfair Display' }}>Advocate Workload</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Advocate</th>
                              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total Cases</th>
                              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Active</th>
                            </tr>
                          </thead>
                          <tbody>
                            {caseReport.advocateWorkload.map((a, i) => (
                              <tr key={i} className="border-b border-gray-50">
                                <td className="px-4 py-3 text-sm font-medium text-gray-800">{a.first_name} {a.last_name}</td>
                                <td className="px-4 py-3 text-sm text-gray-600 text-right">{a.case_count}</td>
                                <td className="px-4 py-3 text-sm font-semibold text-green-600 text-right">{a.active_cases}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {caseReport.monthlyNew?.length > 0 && (
                    <div>
                      <h3 className="font-bold text-gray-900 mb-4" style={{ fontFamily: 'Playfair Display' }}>New Cases Per Month</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={caseReport.monthlyNew}>
                          <XAxis dataKey="month" tickFormatter={v => formatDate(v, 'MMM yy')} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                          <Tooltip labelFormatter={v => formatDate(v, 'MMMM yyyy')} />
                          <Bar dataKey="count" fill="#0a0f2e" radius={[4,4,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
