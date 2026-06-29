"use client"

import { useState } from "react"
import { useCSSDStore, type InstrumentStatus, type Instrument } from "@/store/useCSSDStore"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { CheckCircle2, Droplets, Activity, Box } from "lucide-react"
import { notifyAndAudit } from "@/lib/notifyAndAudit"

const TRANSITIONS: Record<InstrumentStatus, { next: InstrumentStatus; label: string; icon: React.ElementType; tone: string }[]> = {
  dirty:        [{ next: 'clean',      label: 'Mark cleaned',  icon: Droplets,     tone: 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)]' }],
  clean:        [{ next: 'sterilizing', label: 'Send to cycle', icon: Activity,     tone: 'bg-amber-600 hover:bg-amber-700' }],
  sterilizing:  [],   // status flips automatically on completeCycle
  ready:        [{ next: 'in_use',     label: 'Issue to OT',    icon: Box,          tone: 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)]' }],
  in_use:       [{ next: 'dirty',      label: 'Returned dirty', icon: CheckCircle2, tone: 'bg-slate-600 hover:bg-slate-700' }],
}

export default function CSSDInstruments() {
  const { instruments, updateInstrument } = useCSSDStore()
  const [filter, setFilter] = useState<'all' | InstrumentStatus>('all')

  const shown = filter === 'all' ? instruments : instruments.filter((i) => i.status === filter)
  const counts = instruments.reduce((acc, i) => {
    acc[i.status] = (acc[i.status] ?? 0) + 1
    return acc
  }, {} as Record<InstrumentStatus, number>)

  function advance(i: Instrument, next: InstrumentStatus, label: string) {
    updateInstrument(i.id, { status: next, lastSterilizedAt: next === 'ready' ? new Date().toISOString() : i.lastSterilizedAt })
    if (next === 'ready') {
      notifyAndAudit({
        to: 'ot', type: 'system', priority: 'medium',
        title: `Instrument ready · ${i.name}`,
        body: `${i.name} (${i.category}) is sterilized and ready for OT use.`,
        audit: { action: 'cssd_cycle_passed', resource: 'instrument', resourceId: i.id, detail: `${i.name} marked ready`, userName: 'CSSD' },
      })
    }
    toast.success(`${i.name} → ${label.toLowerCase()}`)
  }

  return (
    <div className="space-y-5 pt-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Instrument Tracking</h2>
          <p className="text-sm text-slate-500 mt-1">Lifecycle: dirty → clean → sterilizing → ready → in_use → dirty</p>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {(['all','dirty','clean','sterilizing','ready','in_use'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg ${filter === f ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} cursor-pointer`}>
              {f.toUpperCase().replace('_',' ')} {f !== 'all' ? `· ${counts[f] ?? 0}` : `· ${instruments.length}`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {shown.map((ins) => (
          <div key={ins.id} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-slate-900 truncate">{ins.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{ins.category}</p>
              </div>
              <Badge variant={ins.status === 'ready' ? 'success' : ins.status === 'in_use' ? 'primary' : ins.status === 'sterilizing' ? 'warning' : 'danger'}>
                {ins.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            <div className="mt-3 text-xs text-slate-600 space-y-1">
              <p>Quantity: <span className="font-semibold">{ins.quantity}</span></p>
              {ins.lastSterilizedAt && <p>Last Sterilized: <span className="font-semibold">{new Date(ins.lastSterilizedAt).toLocaleString()}</span></p>}
              {ins.assignedOT && <p>Assigned to: <span className="font-semibold text-[var(--color-primary)]">{ins.assignedOT}</span></p>}
            </div>
            <div className="mt-3 flex items-center gap-1.5 flex-wrap">
              {TRANSITIONS[ins.status].map((t) => (
                <button key={t.label} onClick={() => advance(ins, t.next, t.label)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-white ${t.tone} cursor-pointer`}>
                  <t.icon className="h-3 w-3" /> {t.label}
                </button>
              ))}
              {ins.status === 'sterilizing' && <span className="text-[10.5px] text-slate-400 italic">Auto-flips when cycle completes</span>}
            </div>
          </div>
        ))}
        {shown.length === 0 && (
          <div className="col-span-full p-6 text-center text-sm text-slate-400 bg-slate-50 rounded-xl">
            No instruments with status “{filter.toUpperCase().replace('_',' ')}”.
          </div>
        )}
      </div>
    </div>
  )
}
