"use client"

import { useEffect, useState } from "react"
import { RotateCcw, ShieldAlert, Database, CheckCircle2 } from "lucide-react"
import { resetDemoData, listDemoKeys } from "@/lib/demoReset"
import { useDialogs } from "@/components/ui/ConfirmDialog"
import { toast } from "sonner"

export default function AdminSettingsPage() {
  const [keys, setKeys] = useState<string[]>([])
  const { confirm, view: dialogView } = useDialogs()

  useEffect(() => { setKeys(listDemoKeys()) }, [])

  const onReset = async () => {
    const ok = await confirm({
      title: 'Reset all demo data?',
      body: `Clears ${keys.length} persisted store${keys.length !== 1 ? 's' : ''} from this browser, then reloads with fresh seeds. Any work in progress this session is lost. The login is preserved.`,
      tone: 'danger',
      confirmLabel: 'Reset & reload',
    })
    if (!ok) return
    const { cleared } = resetDemoData()
    toast.success(`Cleared ${cleared} store${cleared !== 1 ? 's' : ''} · reloading`)
    setTimeout(() => window.location.reload(), 400)
  }

  return (
    <div className="space-y-6 p-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Database className="h-6 w-6 text-[var(--color-primary)]" />Demo Settings
        </h1>
        <p className="text-sm text-slate-500 mt-1">Manage the local demo dataset. Phase-1 stores patient and operational data in this browser only.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-start gap-3 mb-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-900">Persisted stores</p>
            <p className="text-xs text-slate-500 mt-0.5">{keys.length} Zustand store{keys.length !== 1 ? 's' : ''} active in this browser&apos;s localStorage.</p>
          </div>
        </div>
        {keys.length > 0 && (
          <details className="border-t border-slate-100 pt-3">
            <summary className="text-xs font-bold text-slate-600 cursor-pointer hover:text-slate-900">Show keys ({keys.length})</summary>
            <ul className="text-[11px] text-slate-500 font-mono mt-2 space-y-0.5 max-h-48 overflow-y-auto">
              {keys.map(k => <li key={k}>{k}</li>)}
            </ul>
          </details>
        )}
      </div>

      <div className="bg-amber-50/40 rounded-xl border border-amber-200 p-5">
        <div className="flex items-start gap-3 mb-3">
          <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-900">Reset demo data</p>
            <p className="text-xs text-slate-600 mt-0.5">
              If the OPD board, lab queue, or ER triage look thin or stale, your browser is showing persisted state from a previous session.
              Reset clears it; the next reload re-seeds with the latest demo dataset (30+ OPD patients, 7 ER cases, lab orders at every stage, IPD inpatients, OT cases, claims, discharges).
              <strong className="text-slate-900"> Your login stays.</strong>
            </p>
          </div>
        </div>
        <button onClick={onReset}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold cursor-pointer">
          <RotateCcw className="h-4 w-4" />Reset all demo data
        </button>
      </div>

      {dialogView}
    </div>
  )
}
