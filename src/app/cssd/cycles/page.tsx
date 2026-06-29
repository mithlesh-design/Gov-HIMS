"use client"

import { Select } from "@/components/ui/Select"
import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  Beaker, Play, CheckCircle2, XCircle, ShieldAlert, Clock, ChevronDown, ChevronRight,
  AlertTriangle, ScanLine,
} from "lucide-react"
import { useAuthStore } from "@/store/useAuthStore"
import { useCSSDStore, type SterilizationMethod } from "@/store/useCSSDStore"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { notifyAndAudit, notifyAndAuditMany } from "@/lib/notifyAndAudit"

const METHOD_TINT: Record<SterilizationMethod, string> = {
  Autoclave: 'bg-rose-50 text-rose-700 ring-rose-200',
  ETO:       'bg-amber-50 text-amber-700 ring-amber-200',
  Plasma:    'bg-[rgba(8,145,178,0.07)] text-[var(--color-primary)] ring-blue-200',
  Chemical:  'bg-[rgba(8,145,178,0.07)] text-[var(--color-primary)] ring-blue-200',
}

const fmt = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
const minsSince = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))

export default function CSSDCyclesPage() {
  const currentUser   = useAuthStore(s => s.currentUser)
  const cycles        = useCSSDStore(s => s.cycles)
  const instruments   = useCSSDStore(s => s.instruments)
  const startCycle    = useCSSDStore(s => s.startCycle)
  const completeCycle = useCSSDStore(s => s.completeCycle)
  const updateBI      = useCSSDStore(s => s.updateBiologicalIndicator)

  const [tab, setTab]       = useState<'queue' | 'running' | 'completed'>('queue')
  const [open, setOpen]     = useState<string | null>(null)
  const [method, setMethod] = useState<SterilizationMethod>('Autoclave')
  const [picked, setPicked] = useState<Set<string>>(new Set())

  const dirty = useMemo(() => instruments.filter(i => i.status === 'dirty' || i.status === 'clean'), [instruments])
  const running = useMemo(() => cycles.filter(c => c.status === 'running'), [cycles])
  const completed = useMemo(() =>
    cycles.filter(c => c.status === 'passed' || c.status === 'failed')
      .sort((a, b) => new Date(b.completedAt ?? b.startedAt).getTime() - new Date(a.completedAt ?? a.startedAt).getTime()),
    [cycles],
  )

  const togglePick = (id: string) => {
    setPicked(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  const onStart = () => {
    if (picked.size === 0) {
      toast.error('Pick at least one instrument set to start a cycle')
      return
    }
    const id = startCycle({
      method,
      instrumentIds: Array.from(picked),
      operatorId: currentUser?.id ?? 'CS-1301',
      operatorName: currentUser?.name ?? 'CSSD Tech',
    })
    setPicked(new Set())
    setTab('running')
    setOpen(id)
    toast.success(`Started ${method} cycle · ${picked.size} set(s)`)
  }

  const onPass = (cycleId: string) => {
    const cyc = cycles.find(c => c.id === cycleId)
    completeCycle(cycleId, { biPass: true, chemPass: true })
    if (cyc) {
      notifyAndAudit({
        to: 'ot', type: 'system', priority: 'medium',
        title: `Sterilisation cycle passed · ${cyc.batchNumber}`,
        body: `${cyc.method} cycle ${cyc.batchNumber} passed. ${cyc.instrumentIds.length} instrument set(s) ready for OT.`,
        audit: { action: 'cssd_cycle_passed', resource: 'sterilization_cycle', resourceId: cyc.batchNumber, detail: `Cycle passed · OT notified`, userName: 'CSSD' },
      })
    }
    toast.success('Cycle passed · OT notified · instruments returned to ready')
  }
  const onFail = (cycleId: string, reason: 'BI' | 'CHEM') => {
    const cyc = cycles.find(c => c.id === cycleId)
    if (reason === 'BI') {
      completeCycle(cycleId, { biPass: false, chemPass: true, note: 'Biological indicator negative' })
      if (cyc) {
        notifyAndAuditMany(['admin', 'quality', 'ot'], {
          type: 'system', priority: 'critical',
          title: `CSSD batch FAILED · ${cyc.batchNumber}`,
          body: `${cyc.method} cycle FAILED on BI · ${cyc.instrumentIds.length} instrument set(s) recalled. Re-process required.`,
          audit: { action: 'cssd_cycle_failed', resource: 'sterilization_cycle', resourceId: cyc.batchNumber, detail: `BI negative — batch recalled`, userName: 'CSSD' },
        })
      }
      toast.error('Cycle failed — BI negative · Admin/Quality/OT notified')
    } else {
      completeCycle(cycleId, { biPass: true, chemPass: false, note: 'Chemical indicator failure' })
      if (cyc) {
        notifyAndAuditMany(['admin', 'ot'], {
          type: 'system', priority: 'high',
          title: `CSSD batch FAILED · ${cyc.batchNumber}`,
          body: `${cyc.method} cycle FAILED on chemical indicator · instruments re-queued.`,
          audit: { action: 'cssd_cycle_failed', resource: 'sterilization_cycle', resourceId: cyc.batchNumber, detail: `Chemical indicator failure`, userName: 'CSSD' },
        })
      }
      toast.error('Cycle failed — chemical indicator · Admin + OT notified')
    }
  }
  const onDelayedBI = (cycleId: string, pass: boolean) => {
    updateBI(cycleId, pass)
    if (pass) toast.success('Delayed BI: pass · cycle confirmed')
    else toast.error('Delayed BI: negative · instruments must be recalled')
  }

  return (
    <div className="space-y-5 p-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Beaker className="h-6 w-6 text-[var(--color-primary)]" />Sterilization Cycles
        </h1>
        <p className="text-sm text-slate-500 mt-1">Start cycles · BI / Chemical-indicator gating · NABH HIC evidence</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100 w-fit">
        {(['queue', 'running', 'completed'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer capitalize',
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            {t} <span className="text-slate-400">
              {t === 'queue' ? dirty.length : t === 'running' ? running.length : completed.length}
            </span>
          </button>
        ))}
      </div>

      {tab === 'queue' && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm font-bold text-slate-800">Pick instruments &amp; start cycle</p>
            <div className="flex items-center gap-2">
              <Select value={method} onChange={(e) => setMethod(e.target.value as SterilizationMethod)}
                className="text-xs font-bold border border-slate-300 rounded-lg px-2 py-1.5">
                {(['Autoclave', 'ETO', 'Plasma', 'Chemical'] as const).map(m => <option key={m}>{m}</option>)}
              </Select>
              <button onClick={onStart}
                disabled={picked.size === 0}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                <Play className="h-3.5 w-3.5" />Start cycle ({picked.size})
              </button>
            </div>
          </div>
          {dirty.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">All instruments are ready or in use — no dirty queue.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {dirty.map(i => {
                const isPicked = picked.has(i.id)
                return (
                  <button key={i.id} onClick={() => togglePick(i.id)}
                    className={cn("flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer text-left",
                      isPicked ? "bg-[rgba(8,145,178,0.07)] border-[rgba(8,145,178,0.20)]" : "bg-white border-slate-200 hover:border-slate-300")}>
                    <span className={cn("h-3.5 w-3.5 rounded border flex-shrink-0",
                      isPicked ? "bg-[var(--color-primary)] border-[var(--color-primary)]" : "bg-white border-slate-300")} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800">{i.name}</p>
                      <p className="text-[11px] text-slate-500">{i.category} · qty {i.quantity} · {i.status}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'running' && (
        <div className="space-y-3">
          {running.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-500">No cycles running</p>
            </div>
          ) : running.map(c => {
            const isOpen = open === c.id
            const items = c.instrumentIds.map(id => instruments.find(i => i.id === id)).filter(Boolean) as typeof instruments
            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button onClick={() => setOpen(isOpen ? null : c.id)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 cursor-pointer flex items-center gap-3">
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded ring-1", METHOD_TINT[c.method])}>{c.method}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                      {c.batchNumber}
                      <span className="text-[11px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Running</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {items.length} set(s) · started {fmt(c.startedAt)} ({minsSince(c.startedAt)} min)
                      {c.operatorName ? ` · ${c.operatorName}` : ''}
                    </p>
                  </div>
                  {isOpen ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                </button>
                {isOpen && (
                  <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-3 space-y-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">Loaded instruments</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {items.map(i => (
                          <div key={i.id} className="rounded-lg bg-white border border-slate-200 p-2 text-xs">
                            <p className="font-bold text-slate-800">{i.name}</p>
                            <p className="text-[10px] text-slate-500">{i.category} · qty {i.quantity}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => onPass(c.id)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer">
                        <CheckCircle2 className="h-3.5 w-3.5" />Mark passed (BI + chem)
                      </button>
                      <button onClick={() => onFail(c.id, 'CHEM')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 cursor-pointer">
                        <XCircle className="h-3.5 w-3.5" />Fail — chemical
                      </button>
                      <button onClick={() => onFail(c.id, 'BI')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-red-50 hover:bg-red-100 text-red-700 cursor-pointer">
                        <ShieldAlert className="h-3.5 w-3.5" />Fail — BI negative
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}

      {tab === 'completed' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Batch #', 'Method', 'Started', 'Completed', 'BI', 'Chem', 'Status', 'Action'].map(h =>
                  <th key={h} scope="col" className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {completed.map(c => (
                <tr key={c.id} className={cn("hover:bg-slate-50", c.status === 'failed' && 'bg-red-50/30')}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{c.batchNumber}</td>
                  <td className="px-4 py-3">
                    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded ring-1", METHOD_TINT[c.method])}>{c.method}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{fmt(c.startedAt)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{c.completedAt ? fmt(c.completedAt) : '—'}</td>
                  <td className="px-4 py-3 text-xs font-bold">
                    {c.biologicalIndicator === true ? <span className="text-emerald-700">Pass</span>
                      : c.biologicalIndicator === false ? <span className="text-red-700">Fail</span>
                      : <span className="text-amber-600">Pending</span>}
                  </td>
                  <td className="px-4 py-3 text-xs font-bold">
                    {c.chemicalIndicatorPass === true ? <span className="text-emerald-700">Pass</span>
                      : c.chemicalIndicatorPass === false ? <span className="text-red-700">Fail</span>
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("text-[10px] font-bold uppercase px-1.5 py-0.5 rounded",
                      c.status === 'passed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>
                      {c.status}
                    </span>
                    {c.failureNote && (
                      <p className="text-[10px] text-red-700 mt-0.5 flex items-center gap-1">
                        <AlertTriangle className="h-2.5 w-2.5" />{c.failureNote}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {c.biologicalIndicator === null && c.status === 'passed' && (
                      <div className="flex gap-1">
                        <button onClick={() => onDelayedBI(c.id, true)}
                          className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer">
                          BI pass
                        </button>
                        <button onClick={() => onDelayedBI(c.id, false)}
                          className="text-[10px] font-bold px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 cursor-pointer">
                          BI fail
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
        <ScanLine className="h-3 w-3" />Every cycle and BI result is logged to the audit trail as NABH HIC evidence.
      </p>
    </div>
  )
}
