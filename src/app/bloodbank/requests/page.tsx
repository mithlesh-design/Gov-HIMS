"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  Droplets, Clock, ShieldCheck, AlertTriangle, CheckCircle2, FileText,
  ScanLine, ChevronDown, ChevronRight, Search, Beaker,
} from "lucide-react"
import { useAuthStore } from "@/store/useAuthStore"
import { useBloodBankStore, BEDSIDE_CHECK_LABELS, type BedsideCheck, type CrossMatchRequest } from "@/store/useBloodBankStore"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useDialogs } from "@/components/ui/ConfirmDialog"

const fmt = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

const CHECK_ORDER: BedsideCheck[] = ['patient_id_match', 'group_abo', 'group_rh', 'expiry_ok', 'bag_integrity', 'consent']

export default function BloodBankRequestsPage() {
  const currentUser            = useAuthStore(s => s.currentUser)
  const requests               = useBloodBankStore(s => s.crossMatchRequests)
  const units                  = useBloodBankStore(s => s.units)
  const crossMatch             = useBloodBankStore(s => s.crossMatch)
  const recommendUnits         = useBloodBankStore(s => s.recommendUnits)
  const markIncompatible       = useBloodBankStore(s => s.markIncompatible)
  const toggleBedsideCheck     = useBloodBankStore(s => s.toggleBedsideCheck)
  const issueReservedUnits     = useBloodBankStore(s => s.issueReservedUnits)

  const [tab, setTab]      = useState<'pending' | 'compatible' | 'issued'>('pending')
  const [filter, setFilter] = useState('')
  const [open, setOpen]    = useState<string | null>(null)
  const { prompt, view: dialogView } = useDialogs()

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase()
    return requests.filter(r => {
      if (tab === 'pending')    return r.status === 'pending' || r.status === 'incompatible'
      if (tab === 'compatible') return r.status === 'compatible'
      return r.status === 'issued'
    }).filter(r => !f ||
      r.patientName.toLowerCase().includes(f) ||
      r.patientId.toLowerCase().includes(f) ||
      r.id.toLowerCase().includes(f) ||
      r.bloodGroup.toLowerCase().includes(f))
  }, [requests, tab, filter])

  const counts = useMemo(() => ({
    pending:    requests.filter(r => r.status === 'pending' || r.status === 'incompatible').length,
    compatible: requests.filter(r => r.status === 'compatible').length,
    issued:     requests.filter(r => r.status === 'issued').length,
  }), [requests])

  const onCrossMatch = (req: CrossMatchRequest) => {
    const reserved = crossMatch(req.id)
    if (reserved.length === 0) {
      toast.error(`No FEFO units available for ${req.bloodGroup} ${req.component}`)
      return
    }
    setTab('compatible')
    setOpen(req.id)
    toast.success(`${reserved.length} unit(s) reserved · ${req.patientName}`)
  }

  const onMarkIncompatible = async (req: CrossMatchRequest) => {
    const values = await prompt({
      title: `Mark crossmatch incompatible · ${req.patientName}`,
      body: 'Will be audit-logged. Lab will be asked to retest with another donor.',
      tone: 'danger',
      confirmLabel: 'Mark incompatible',
      fields: [
        { id: 'note', label: 'Reason', type: 'textarea',
          defaultValue: 'Donor antibody screen positive',
          required: true },
      ],
    })
    if (!values) return
    markIncompatible(req.id, values.note)
    toast.success(`Marked incompatible · ${req.patientName}`)
  }

  const onIssue = (req: CrossMatchRequest) => {
    const checks = req.bedsideChecks ?? {}
    const allChecked = CHECK_ORDER.every(c => checks[c])
    if (!allChecked) {
      toast.error('Complete all bedside safety checks before issue')
      return
    }
    const issuer = currentUser?.name ?? 'Blood Bank Tech'
    issueReservedUnits(req.id, issuer)
    setTab('issued')
    setOpen(req.id)
    toast.success(`Issued ${req.reservedUnitIds?.length ?? 0} bag(s) · ${req.patientName}`)
  }

  return (
    <div className="space-y-5 p-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Droplets className="h-6 w-6 text-red-600" />Cross-match &amp; Issue
          </h1>
          <p className="text-sm text-slate-500 mt-1">FEFO unit recommendation · bedside safety checks · NABH-compliant traceability</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search patient / group…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-300" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100 w-fit">
        {(['pending', 'compatible', 'issued'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition capitalize',
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            {t} <span className="text-slate-400">{counts[t]}</span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
            <CheckCircle2 className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-500">Nothing in this queue</p>
          </div>
        ) : filtered.map(req => {
          const checks = req.bedsideChecks ?? {}
          const isOpen = open === req.id
          const reservedUnits = (req.reservedUnitIds ?? []).map(uid => units.find(u => u.id === uid)).filter(Boolean) as typeof units
          const recommended = req.status === 'pending'
            ? recommendUnits(req.bloodGroup, req.component, req.units)
            : []
          const allChecked = CHECK_ORDER.every(c => checks[c])

          return (
            <motion.div key={req.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button onClick={() => setOpen(isOpen ? null : req.id)}
                className="w-full text-left px-4 py-3 hover:bg-slate-50 cursor-pointer flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-red-50 flex items-center justify-center text-red-600 font-black text-xs flex-shrink-0">
                  {req.bloodGroup}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                    {req.patientName}
                    <span className="text-[11px] font-bold text-slate-400">{req.patientId} · {req.id}</span>
                    {req.status === 'pending' && <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Pending</span>}
                    {req.status === 'compatible' && <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">Cross-matched</span>}
                    {req.status === 'incompatible' && <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-100 text-red-700">Incompatible</span>}
                    {req.status === 'issued' && <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-[rgba(8,145,178,0.12)] text-[var(--color-primary)]">Issued</span>}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {req.units} × {req.component} · requested by {req.requestedBy} · {fmt(req.requestedAt)}
                  </p>
                  {req.status === 'issued' && req.issuedAt && (
                    <p className="text-[11px] text-emerald-700 mt-0.5">Issued by {req.issuedBy} · {fmt(req.issuedAt)}</p>
                  )}
                  {req.status === 'incompatible' && req.incompatibilityNote && (
                    <p className="text-[11px] text-red-700 mt-0.5">Reason: {req.incompatibilityNote}</p>
                  )}
                </div>
                {isOpen ? <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                       : <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />}
              </button>

              {isOpen && (
                <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-3 space-y-3">
                  {/* Pending → cross-match action */}
                  {req.status === 'pending' && (
                    <>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5 flex items-center gap-1.5">
                          <Beaker className="h-3 w-3" />FEFO recommended units
                        </p>
                        {recommended.length === 0 ? (
                          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
                            <AlertTriangle className="h-3.5 w-3.5" />No FEFO-eligible {req.bloodGroup} {req.component} in inventory.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {recommended.map(u => {
                              const days = Math.round((new Date(u.expiresOn).getTime() - Date.now()) / 86400000)
                              return (
                                <div key={u.id} className="rounded-lg bg-white border border-slate-200 p-2.5 text-xs">
                                  <p className="font-bold text-slate-800">{u.bagNumber} · {u.bloodGroup} {u.component}</p>
                                  <p className="text-[11px] text-slate-500 mt-0.5">Collected {u.collectedOn} · expires {u.expiresOn} ({days}d)</p>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => onCrossMatch(req)} disabled={recommended.length === 0}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                          <ShieldCheck className="h-3.5 w-3.5" />Cross-match &amp; reserve
                        </button>
                        <button onClick={() => onMarkIncompatible(req)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-red-50 hover:bg-red-100 text-red-700 cursor-pointer">
                          <AlertTriangle className="h-3.5 w-3.5" />Mark incompatible
                        </button>
                      </div>
                    </>
                  )}

                  {/* Compatible → bedside check + issue */}
                  {req.status === 'compatible' && (
                    <>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5 flex items-center gap-1.5">
                          <ScanLine className="h-3 w-3" />Reserved units
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {reservedUnits.map(u => (
                            <div key={u.id} className="rounded-lg bg-white border border-emerald-200 p-2.5 text-xs">
                              <p className="font-bold text-slate-800">{u.bagNumber} · {u.bloodGroup} {u.component}</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">Expires {u.expiresOn} · donor {u.donorId}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                          Bedside transfusion safety checklist
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {CHECK_ORDER.map(c => {
                            const done = !!checks[c]
                            return (
                              <button key={c} onClick={() => toggleBedsideCheck(req.id, c)}
                                className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-semibold border cursor-pointer transition",
                                  done
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                    : "bg-white border-slate-200 text-slate-500 hover:border-slate-300")}>
                                {done ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <span className="h-3.5 w-3.5 rounded-full border border-slate-300" />}
                                {BEDSIDE_CHECK_LABELS[c]}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => onIssue(req)} disabled={!allChecked}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                          <CheckCircle2 className="h-3.5 w-3.5" />Issue {reservedUnits.length} bag(s)
                        </button>
                        {!allChecked && (
                          <span className="text-[11px] font-bold text-amber-600 flex items-center gap-1 px-2">
                            <AlertTriangle className="h-3 w-3" />Complete all checks first
                          </span>
                        )}
                      </div>
                    </>
                  )}

                  {/* Issued → traceability */}
                  {req.status === 'issued' && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5 flex items-center gap-1.5">
                        <FileText className="h-3 w-3" />Traceability
                      </p>
                      <div className="space-y-1.5">
                        {(req.issuedUnitIds ?? []).map(uid => {
                          const u = units.find(x => x.id === uid)
                          if (!u) return null
                          return (
                            <div key={uid} className="rounded-lg bg-white border border-cyan-200 p-2.5 text-xs">
                              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                                <Clock className="h-3 w-3 text-[var(--color-primary)]" />Bag {u.bagNumber} → {req.patientName} ({req.patientId})
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {u.bloodGroup} {u.component} · donor {u.donorId} · audit logged to Blood Bank module (NABH ROM)
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
      {dialogView}
    </div>
  )
}
