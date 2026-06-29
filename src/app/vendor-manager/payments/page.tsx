"use client"

import { useMemo, useState } from "react"
import { useVendorManagerStore, type VMPayment, type VMPaymentStatus } from "@/store/useVendorManagerStore"
import {
  CreditCard, AlertTriangle, CheckCircle, Clock,
  IndianRupee, Search, X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// ─── Styles ───────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<VMPaymentStatus, string> = {
  pending:  'bg-[rgba(8,145,178,0.12)] text-[var(--color-primary)]',
  paid:     'bg-emerald-100 text-emerald-700',
  overdue:  'bg-red-100 text-red-700',
  disputed: 'bg-amber-100 text-amber-700',
}

const REF_DATE = new Date('2026-06-08')

function daysPastDue(dueDate: string): number {
  const due = new Date(dueDate)
  return Math.round((REF_DATE.getTime() - due.getTime()) / 86400000)
}

// ─── Mark Paid modal ──────────────────────────────────────────────────────────

function MarkPaidModal({ payment, onClose }: { payment: VMPayment; onClose: () => void }) {
  const markPaymentPaid = useVendorManagerStore(s => s.markPaymentPaid)

  const confirm = () => {
    markPaymentPaid(payment.id)
    toast.success(`Payment ${payment.invoiceRef} marked as paid`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-900">Confirm Payment</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3 mb-5">
          <div className="rounded-xl bg-slate-50 p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Vendor</span>
              <span className="font-semibold text-slate-800">{payment.vendorName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Invoice</span>
              <span className="font-mono text-slate-700">{payment.invoiceRef}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Amount</span>
              <span className="font-bold text-slate-900 text-base">₹{payment.amount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Due Date</span>
              <span className={cn("font-semibold", payment.status === 'overdue' ? 'text-red-600' : 'text-slate-700')}>{payment.dueDate}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer">Cancel</button>
          <button onClick={confirm} className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer">
            <CheckCircle className="h-4 w-4" /> Confirm Paid
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

type TabKey = 'all' | 'pending' | 'overdue' | 'paid' | 'disputed'

export default function PaymentsPage() {
  const payments       = useVendorManagerStore(s => s.payments)

  const [tab, setTab]           = useState<TabKey>('all')
  const [q, setQ]               = useState('')
  const [payTarget, setPayTarget] = useState<VMPayment | null>(null)

  const filtered = useMemo(() => payments.filter(p => {
    const matchQ  = !q || `${p.vendorName} ${p.invoiceRef} ${p.id}`.toLowerCase().includes(q.toLowerCase())
    const matchTab = tab === 'all' || p.status === tab
    return matchQ && matchTab
  }), [payments, q, tab])

  const overduePayments = useMemo(() => payments.filter(p => p.status === 'overdue'), [payments])
  const totalOverdue    = overduePayments.reduce((s, p) => s + p.amount, 0)

  const tabCounts: Record<TabKey, number> = {
    all:      payments.length,
    pending:  payments.filter(p => p.status === 'pending').length,
    overdue:  payments.filter(p => p.status === 'overdue').length,
    paid:     payments.filter(p => p.status === 'paid').length,
    disputed: payments.filter(p => p.status === 'disputed').length,
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'all',      label: 'All'      },
    { key: 'pending',  label: 'Pending'  },
    { key: 'overdue',  label: 'Overdue'  },
    { key: 'paid',     label: 'Paid'     },
    { key: 'disputed', label: 'Disputed' },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-[var(--color-primary)]" /> Payments
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{filtered.length} payment records</p>
        </div>
        {/* Summary chips */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[rgba(8,145,178,0.07)] border border-[rgba(8,145,178,0.20)]">
            <IndianRupee className="h-3.5 w-3.5 text-[var(--color-primary)]" />
            <span className="text-xs font-bold text-[var(--color-primary-dark)]">
              ₹{(payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0) / 100000).toFixed(1)}L pending
            </span>
          </div>
          {totalOverdue > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200">
              <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
              <span className="text-xs font-bold text-red-800">₹{(totalOverdue / 100000).toFixed(1)}L overdue</span>
            </div>
          )}
        </div>
      </div>

      {/* Overdue alert */}
      {overduePayments.length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-red-800">
              {overduePayments.length} overdue payment{overduePayments.length > 1 ? 's' : ''} — ₹{totalOverdue.toLocaleString('en-IN')} total
            </p>
            <p className="text-xs text-red-700 mt-0.5">Delayed payments risk supply interruption and penalty charges. Clear immediately.</p>
          </div>
          <button onClick={() => setTab('overdue')} className="text-xs font-bold text-red-700 hover:text-red-900 underline cursor-pointer">
            View overdue
          </button>
        </div>
      )}

      {/* Tabs + search */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer",
                tab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              {t.label}
              <span className={cn("ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                tab === t.key ? "bg-[rgba(8,145,178,0.12)] text-[var(--color-primary)]" : "bg-slate-200 text-slate-500"
              )}>{tabCounts[t.key]}</span>
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search vendor, invoice…"
            className="h-9 pl-8 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white w-52"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 border-b border-slate-100 bg-slate-50/50">
                <th className="px-5 py-3">Vendor</th>
                <th className="px-5 py-3">Invoice Ref</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Due Date</th>
                <th className="px-5 py-3">Days Past Due</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Paid Date</th>
                <th className="px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(p => {
                const pastDue = p.status !== 'paid' ? daysPastDue(p.dueDate) : 0
                return (
                  <tr key={p.id} className={cn("hover:bg-slate-50/60 transition-colors", p.status === 'overdue' && "bg-red-50/20")}>
                    <td className="px-5 py-3.5 font-semibold text-slate-800 max-w-[180px] truncate">{p.vendorName}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{p.invoiceRef}</td>
                    <td className="px-5 py-3.5 font-bold text-slate-800">₹{p.amount.toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {p.dueDate}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {p.status !== 'paid' && pastDue > 0 ? (
                        <span className="font-bold text-xs text-red-600 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {pastDue}d
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-full", STATUS_STYLE[p.status])}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">{p.paidDate ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      {(p.status === 'pending' || p.status === 'overdue') && (
                        <button
                          onClick={() => setPayTarget(p)}
                          className="text-xs font-bold text-emerald-600 hover:text-emerald-700 border border-emerald-200 hover:border-emerald-400 px-2.5 py-1 rounded-lg cursor-pointer transition-colors flex items-center gap-1"
                        >
                          <CheckCircle className="h-3 w-3" /> Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400 text-sm">No payments match your filters</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {payTarget && <MarkPaidModal payment={payTarget} onClose={() => setPayTarget(null)} />}
    </div>
  )
}
