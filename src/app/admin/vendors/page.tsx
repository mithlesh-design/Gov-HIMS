"use client"

import { Select } from "@/components/ui/Select"
import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  Truck, Plus, Search, Filter, Calendar, IndianRupee,
  ShieldAlert, CheckCircle, AlertTriangle, Download, ChevronRight,
} from "lucide-react"
import { useVendorStore, CATEGORY_LABEL, type VendorCategory, type VendorInvoice } from "@/store/useVendorStore"
import { useAuthStore } from "@/store/useAuthStore"
import { canDo } from "@/lib/permissions"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { printableHtml } from "@/lib/fileIO"
import { notifyAndAudit } from "@/lib/notifyAndAudit"
import { useDialogs } from "@/components/ui/ConfirmDialog"

const CATEGORY_TINT: Record<VendorCategory, string> = {
  bmw:          'bg-amber-50 text-amber-700 ring-amber-200',
  medical_gas:  'bg-[rgba(8,145,178,0.07)] text-[#0E7490] ring-blue-200',
  amc:          'bg-[rgba(8,145,178,0.07)] text-[#0E7490] ring-blue-200',
  food:         'bg-green-50 text-green-700 ring-green-200',
  security:     'bg-slate-50 text-slate-700 ring-slate-200',
  it:           'bg-[rgba(8,145,178,0.07)] text-[#0E7490] ring-cyan-200',
  pharma:       'bg-[rgba(8,145,178,0.07)] text-[#0E7490] ring-blue-200',
  linen:        'bg-[rgba(8,145,178,0.07)] text-[#0E7490] ring-blue-200',
  consumables:  'bg-[rgba(8,145,178,0.07)] text-[#0E7490] ring-blue-200',
  utilities:    'bg-[rgba(8,145,178,0.07)] text-[#0E7490] ring-blue-200',
  other:        'bg-slate-100 text-slate-600 ring-slate-200',
}

const STATUS_TINT: Record<VendorInvoice['status'], string> = {
  open:     'bg-amber-100 text-amber-700',
  approved: 'bg-[rgba(8,145,178,0.12)] text-[#0E7490]',
  paid:     'bg-emerald-100 text-emerald-700',
  disputed: 'bg-red-100 text-red-700',
  overdue:  'bg-red-100 text-red-700',
}

const fmtDate = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
const fmtINR = (n: number) => `₹${n.toLocaleString('en-IN')}`
const today = () => new Date().toISOString().split('T')[0]!
const daysUntil = (date: string) => Math.round((new Date(date + 'T00:00:00').getTime() - new Date(today() + 'T00:00:00').getTime()) / 86400000)

type Tab = 'overview' | 'invoices' | 'vendors'

export default function VendorsPage() {
  const currentUser = useAuthStore(s => s.currentUser)
  const vendors = useVendorStore(s => s.vendors)
  const invoices = useVendorStore(s => s.invoices)
  const approveInvoice = useVendorStore(s => s.approveInvoice)
  const markPaid = useVendorStore(s => s.markPaid)
  const disputeInvoice = useVendorStore(s => s.disputeInvoice)
  const getOverdueInvoices = useVendorStore(s => s.getOverdueInvoices)
  const getExpiringMoUs = useVendorStore(s => s.getExpiringMoUs)
  const getTotalPayable = useVendorStore(s => s.getTotalPayable)
  const getMonthlySpend = useVendorStore(s => s.getMonthlySpend)

  const canWrite = canDo(currentUser?.role, 'finance.vendor')
  const actorName = currentUser?.name ?? 'Administrator'
  const { prompt, view: dialogView } = useDialogs()

  const [tab, setTab] = useState<Tab>('overview')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<VendorCategory | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<VendorInvoice['status'] | 'all'>('all')

  const overdue = getOverdueInvoices()
  const expiringMoUs = getExpiringMoUs(60)
  const totalPayable = getTotalPayable()
  const thisMonth = today().slice(0, 7)
  const monthSpend = getMonthlySpend(thisMonth)

  const kpis = useMemo(() => ({
    activeVendors: vendors.length,
    openInvoices: invoices.filter(i => i.status === 'open' || i.status === 'approved' || i.status === 'overdue').length,
    overdueCount: overdue.length,
    disputedCount: invoices.filter(i => i.status === 'disputed').length,
  }), [vendors, invoices, overdue])

  const filteredInvoices = useMemo(() => {
    return invoices.filter(i => {
      if (statusFilter !== 'all' && i.status !== statusFilter) return false
      if (categoryFilter !== 'all' && i.category !== categoryFilter) return false
      if (search) {
        const s = search.toLowerCase()
        return i.vendorName.toLowerCase().includes(s) ||
          i.invoiceNumber.toLowerCase().includes(s) ||
          i.description.toLowerCase().includes(s)
      }
      return true
    }).sort((a, b) => {
      // Overdue first, then open, then approved, then disputed, then paid
      const order = { overdue: 0, open: 1, approved: 2, disputed: 3, paid: 4 } as const
      const d = order[a.status] - order[b.status]
      return d !== 0 ? d : a.dueDate.localeCompare(b.dueDate)
    })
  }, [invoices, statusFilter, categoryFilter, search])

  const filteredVendors = useMemo(() => {
    return vendors.filter(v => {
      if (categoryFilter !== 'all' && v.category !== categoryFilter) return false
      if (search) {
        const s = search.toLowerCase()
        return v.name.toLowerCase().includes(s) ||
          v.contactName.toLowerCase().includes(s) ||
          v.contactEmail.toLowerCase().includes(s)
      }
      return true
    }).sort((a, b) => b.contractValue - a.contractValue)
  }, [vendors, categoryFilter, search])

  const handleApprove = (id: string) => {
    if (!canWrite) { toast.error("You don't have permission"); return }
    const inv = invoices.find(i => i.id === id)
    approveInvoice(id, actorName)
    if (inv) {
      notifyAndAudit({
        to: 'admin', type: 'system', priority: 'low',
        title: `Invoice approved · ${inv.vendorName}`,
        body: `${inv.invoiceNumber} (${inv.category}) — ₹${(inv.amount + inv.gstAmount).toLocaleString('en-IN')} approved for payment.`,
        audit: { action: 'finance_invoice_approved', resource: 'vendor_invoice', resourceId: id, detail: `Approved ${inv.invoiceNumber}`, userName: actorName },
      })
    }
    toast.success(`Invoice approved for payment`)
  }

  const handlePay = (id: string) => {
    if (!canWrite) { toast.error("You don't have permission"); return }
    const inv = invoices.find(i => i.id === id)
    if (!inv) return
    const ref = `NEFT-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`
    markPaid(id, ref, actorName)
    notifyAndAudit({
      to: 'admin', type: 'system', priority: 'medium',
      title: `Vendor paid · ${inv.vendorName}`,
      body: `${inv.invoiceNumber} settled · NEFT ${ref} · ₹${(inv.amount + inv.gstAmount).toLocaleString('en-IN')}.`,
      audit: { action: 'finance_vendor_paid', resource: 'vendor_invoice', resourceId: id, detail: `Paid via ${ref}`, userName: actorName },
    })
    toast.success(`${inv.vendorName} paid · ${ref}`)
  }

  // M11-C — generate an invoice PDF (printable HTML).
  function downloadInvoicePdf(invId: string) {
    const inv = invoices.find(i => i.id === invId); if (!inv) return
    const v = vendors.find(x => x.id === inv.vendorId)
    printableHtml(`Vendor Invoice · ${inv.invoiceNumber}`, `
      <div class="info-row">
        <div class="info-item"><span class="info-label">Vendor</span><span class="info-value">${inv.vendorName}</span></div>
        <div class="info-item"><span class="info-label">Category</span><span class="info-value">${inv.category}</span></div>
        <div class="info-item"><span class="info-label">Invoice #</span><span class="info-value">${inv.invoiceNumber}</span></div>
        <div class="info-item"><span class="info-label">Issued</span><span class="info-value">${inv.issuedDate}</span></div>
        <div class="info-item"><span class="info-label">Due Date</span><span class="info-value">${inv.dueDate}</span></div>
        <div class="info-item"><span class="info-label">Status</span><span class="info-value">${inv.status.toUpperCase()}</span></div>
      </div>
      ${v?.contactEmail ? `<p><b>Contact:</b> ${v.contactEmail}</p>` : ''}
      <h3>Invoice Breakdown</h3>
      <table>
        <thead><tr><th>Description</th><th style="text-align:right">Amount (₹)</th></tr></thead>
        <tbody>
          <tr><td>Subtotal</td><td style="text-align:right">${inv.amount.toLocaleString('en-IN')}</td></tr>
          <tr><td>GST</td><td style="text-align:right">${inv.gstAmount.toLocaleString('en-IN')}</td></tr>
          <tr class="total"><td>Total payable</td><td style="text-align:right">₹${(inv.amount + inv.gstAmount).toLocaleString('en-IN')}</td></tr>
        </tbody>
      </table>
      ${inv.paymentRef ? `<p><b>Payment reference:</b> ${inv.paymentRef}</p>` : ''}
    `)
  }

  const handleDispute = async (id: string) => {
    if (!canWrite) { toast.error("You don't have permission"); return }
    const values = await prompt({
      title: 'Raise invoice dispute',
      body: 'Captured in the audit trail and routed to Finance Head for resolution.',
      tone: 'warn',
      confirmLabel: 'Mark disputed',
      fields: [
        { id: 'reason', label: 'Reason for dispute', type: 'textarea',
          placeholder: 'e.g. weight discrepancy, missing items, billing error',
          required: true },
      ],
    })
    if (!values) return
    disputeInvoice(id, values.reason, actorName)
    toast.success('Invoice marked disputed')
  }

  const exportCSV = () => {
    const header = ['Vendor', 'Invoice #', 'Category', 'Amount', 'GST', 'Total', 'Issued', 'Due', 'Status']
    const csv = [
      header.join(','),
      ...filteredInvoices.map(i => [
        `"${i.vendorName}"`, i.invoiceNumber, i.category,
        i.amount, i.gstAmount, i.amount + i.gstAmount,
        i.issuedDate, i.dueDate, i.status,
      ].join(',')),
    ].join('\n')
    if (typeof window !== 'undefined') {
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `vendor-invoices-${today()}.csv`; a.click()
      URL.revokeObjectURL(url)
    }
    toast.success(`Exported ${filteredInvoices.length} invoices`)
  }

  return (
    <div className="space-y-5 p-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="h-6 w-6 text-emerald-600" />Vendor &amp; Payments
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Vendor master · invoices · payment lifecycle · MoU expiry tracker · NABH IMS
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer">
            <Download className="h-3.5 w-3.5" />Export
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPI label="Active vendors" value={kpis.activeVendors} tint="bg-slate-50 border-slate-200 text-slate-700" />
        <KPI label="Open invoices" value={kpis.openInvoices} tint="bg-[rgba(8,145,178,0.07)] border-[rgba(8,145,178,0.20)] text-[#0E7490]" />
        <KPI label="Overdue" value={kpis.overdueCount} tint={kpis.overdueCount > 0 ? "bg-red-50 border-red-200 text-red-700" : "bg-slate-50 border-slate-200 text-slate-600"} />
        <KPI label="Total payable" value={fmtINR(totalPayable)} tint="bg-emerald-50 border-emerald-200 text-emerald-700" small />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100 w-fit">
        {(['overview', 'invoices', 'vendors'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            data-testid={`vendor-tab-${t}`}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer capitalize',
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            {t}
            {t === 'invoices' && <span className="ml-1 text-slate-400">{invoices.length}</span>}
            {t === 'vendors' && <span className="ml-1 text-slate-400">{vendors.length}</span>}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Overdue */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-600" />Overdue invoices
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wide text-red-700 bg-red-50 px-2 py-0.5 rounded">{overdue.length}</span>
            </div>
            {overdue.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-3 text-center">No overdue invoices.</p>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {overdue.map(i => (
                  <div key={i.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-red-50/50 border border-red-100">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{i.vendorName}</p>
                      <p className="text-[11px] text-red-700">{Math.abs(daysUntil(i.dueDate))}d overdue · {fmtINR(i.amount + i.gstAmount)}</p>
                    </div>
                    {canWrite && (
                      <button onClick={() => handlePay(i.id)}
                        className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer">
                        Pay
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* MoUs expiring */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-amber-600" />MoUs expiring ≤60 days
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 px-2 py-0.5 rounded">{expiringMoUs.length}</span>
            </div>
            {expiringMoUs.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-3 text-center">No MoUs expiring soon.</p>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {expiringMoUs.map(v => {
                  const d = daysUntil(v.mouExpiry)
                  return (
                    <div key={v.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-amber-50/40 border border-amber-100">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{v.name}</p>
                        <p className="text-[11px] text-amber-700">{CATEGORY_LABEL[v.category]} · {d}d to expiry · {fmtINR(v.contractValue)}/yr</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Monthly spend by category */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-emerald-600" />This month spend by category
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{fmtINR(monthSpend)}</span>
            </div>
            {(() => {
              const byCat = new Map<VendorCategory, number>()
              for (const i of invoices) {
                if (i.paidDate?.startsWith(thisMonth)) {
                  byCat.set(i.category, (byCat.get(i.category) ?? 0) + i.amount + i.gstAmount)
                }
              }
              const sorted = Array.from(byCat.entries()).sort((a, b) => b[1] - a[1])
              const max = sorted[0]?.[1] ?? 1
              if (sorted.length === 0) {
                return <p className="text-xs text-slate-400 italic py-3 text-center">No paid invoices this month.</p>
              }
              return (
                <div className="space-y-2">
                  {sorted.map(([cat, amt]) => (
                    <div key={cat}>
                      <p className="text-xs text-slate-600 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ring-1', CATEGORY_TINT[cat])}>{cat}</span>
                          {CATEGORY_LABEL[cat]}
                        </span>
                        <b className="tabular-nums">{fmtINR(amt)}</b>
                      </p>
                      <div className="h-1.5 mt-0.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${(amt / max) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {tab === 'invoices' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search vendor / invoice # / description"
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300" />
            </div>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as VendorInvoice['status'] | 'all')}
              className="text-xs font-bold border border-slate-300 rounded-xl px-2 py-2 bg-white">
              <option value="all">All status</option>
              <option value="open">Open</option>
              <option value="approved">Approved</option>
              <option value="overdue">Overdue</option>
              <option value="disputed">Disputed</option>
              <option value="paid">Paid</option>
            </Select>
            <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as VendorCategory | 'all')}
              className="text-xs font-bold border border-slate-300 rounded-xl px-2 py-2 bg-white">
              <option value="all">All categories</option>
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Invoice', 'Vendor', 'Category', 'Amount', 'Due', 'Status', 'Action'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400 italic">No invoices match.</td></tr>
                ) : filteredInvoices.map((i, idx) => {
                  const days = daysUntil(i.dueDate)
                  const overdueNow = (i.status === 'open' || i.status === 'approved') && days < 0
                  return (
                    <motion.tr key={i.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.01 }}
                      className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold text-slate-800">{i.invoiceNumber}</p>
                        <p className="text-[11px] text-slate-500">{i.description}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700">{i.vendorName}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ring-1', CATEGORY_TINT[i.category])}>
                          {i.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-800 tabular-nums">
                        {fmtINR(i.amount + i.gstAmount)}
                        <p className="text-[10px] text-slate-400 font-normal">incl. ₹{i.gstAmount.toLocaleString('en-IN')} GST</p>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <p className="text-slate-700">{fmtDate(i.dueDate)}</p>
                        <p className={cn('text-[10px]',
                          overdueNow || i.status === 'overdue' ? 'text-red-600 font-bold' :
                          days <= 7 ? 'text-amber-600 font-bold' :
                          'text-slate-400')}>
                          {days >= 0 ? `${days}d left` : `${Math.abs(days)}d overdue`}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded',
                          overdueNow ? STATUS_TINT.overdue : STATUS_TINT[i.status])}>
                          {overdueNow ? 'overdue' : i.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {canWrite && (
                          <div className="flex gap-1">
                            {i.status === 'open' && (
                              <button onClick={() => handleApprove(i.id)}
                                className="text-[10px] font-bold px-2 py-1 rounded bg-[rgba(8,145,178,0.07)] hover:bg-[rgba(8,145,178,0.14)] text-[#0E7490] cursor-pointer">
                                Approve
                              </button>
                            )}
                            {(i.status === 'approved' || i.status === 'overdue' || (i.status === 'open' && overdueNow)) && (
                              <button onClick={() => handlePay(i.id)}
                                className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer">
                                Pay
                              </button>
                            )}
                            {(i.status === 'open' || i.status === 'approved') && (
                              <button onClick={() => handleDispute(i.id)}
                                className="text-[10px] font-bold px-2 py-1 rounded text-red-600 hover:bg-red-50 cursor-pointer">
                                Dispute
                              </button>
                            )}
                            <button onClick={() => downloadInvoicePdf(i.id)}
                              title="Download invoice PDF" className="text-[10px] font-bold px-2 py-1 rounded text-slate-600 hover:bg-slate-100 cursor-pointer">
                              PDF
                            </button>
                            {i.status === 'paid' && (
                              <span className="text-[10px] text-emerald-700 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />Paid {i.paidDate ? fmtDate(i.paidDate) : ''}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'vendors' && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search vendor / contact / email"
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300" />
            </div>
            <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as VendorCategory | 'all')}
              className="text-xs font-bold border border-slate-300 rounded-xl px-2 py-2 bg-white">
              <option value="all">All categories</option>
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Vendor', 'Category', 'Contract', 'MoU Expiry', 'Contact', 'GST'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVendors.map((v, i) => {
                  const days = daysUntil(v.mouExpiry)
                  return (
                    <motion.tr key={v.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }}
                      className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold text-slate-800">{v.name}</p>
                        <p className="text-[11px] text-slate-400">{v.id}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ring-1', CATEGORY_TINT[v.category])}>
                          {CATEGORY_LABEL[v.category]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold tabular-nums">{fmtINR(v.contractValue)}/yr</td>
                      <td className="px-4 py-3 text-xs">
                        <p className="text-slate-700">{fmtDate(v.mouExpiry)}</p>
                        <p className={cn('text-[10px]',
                          days < 0 ? 'text-red-600 font-bold' :
                          days <= 60 ? 'text-amber-600 font-bold' :
                          'text-slate-400')}>
                          {days >= 0 ? `${days}d left` : `${Math.abs(days)}d overdue`}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-600">
                        <p>{v.contactName}</p>
                        <p className="text-slate-400">{v.contactEmail}</p>
                      </td>
                      <td className="px-4 py-3 text-[10px] font-mono text-slate-500">{v.gstNumber}</td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      {dialogView}
    </div>
  )
}

function KPI({ label, value, tint, small }: { label: string; value: string | number; tint: string; small?: boolean }) {
  return (
    <div className={cn('rounded-xl border p-4', tint)}>
      <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">{label}</p>
      <p className={cn('font-black mt-1 tabular-nums', small ? 'text-base' : 'text-2xl')}>{value}</p>
    </div>
  )
}
