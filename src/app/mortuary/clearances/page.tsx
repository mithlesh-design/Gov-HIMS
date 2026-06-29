"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import {
  ShieldCheck, FileText, AlertTriangle, Clock, CheckCircle2, ScanLine,
} from "lucide-react"
import { useAuthStore } from "@/store/useAuthStore"
import { useMortuaryStore } from "@/store/useMortuaryStore"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useDialogs } from "@/components/ui/ConfirmDialog"

const fmt = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function MortuaryClearancesPage() {
  const currentUser = useAuthStore(s => s.currentUser)
  const records     = useMortuaryStore(s => s.records)
  const issueDeathCertificate = useMortuaryStore(s => s.issueDeathCertificate)
  const clearMLC    = useMortuaryStore(s => s.clearMLC)
  const releaseBody = useMortuaryStore(s => s.releaseBody)

  const pending = useMemo(() =>
    records.filter(r => r.legalClearance !== 'released')
      .sort((a, b) => new Date(a.timeOfDeath).getTime() - new Date(b.timeOfDeath).getTime()),
    [records],
  )
  const { confirm, prompt, view: dialogView } = useDialogs()

  const onIssueCert = (id: string) => {
    issueDeathCertificate(id, currentUser?.name ?? 'Mortuary Officer')
    toast.success('Death certificate issued')
  }

  const onClearMLC = async (id: string) => {
    const autopsy = await confirm({
      title: 'Clear MLC',
      body: 'Was autopsy completed prior to MLC clearance? This is captured in the audit trail.',
      confirmLabel: 'Yes, autopsy completed',
      cancelLabel: 'No, MLC only',
    })
    clearMLC(id, currentUser?.name ?? 'Mortuary Officer', autopsy)
    toast.success('MLC cleared')
  }

  const onRelease = async (id: string) => {
    const values = await prompt({
      title: 'Release body to next of kin',
      body: 'Captures name + relationship for the audit trail. Required before release.',
      tone: 'warn',
      confirmLabel: 'Release',
      fields: [
        { id: 'name',     label: 'Next-of-kin name',         placeholder: 'e.g. Rajesh Patil', required: true },
        { id: 'relation', label: 'Relation to deceased',      placeholder: 'son / spouse / daughter / father', required: true },
      ],
    })
    if (!values) return
    releaseBody(id, `${values.name} · ${values.relation}`, currentUser?.name ?? 'Mortuary Officer')
    toast.success('Body released · audit logged')
  }

  return (
    <div className="space-y-5 p-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-slate-700" />Legal Clearances
        </h1>
        <p className="text-sm text-slate-500 mt-1">Death certificate · MLC clearance · body release · NABH ROM evidence</p>
      </div>

      <div className="space-y-3">
        {pending.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-500">All records released · no pending clearances</p>
          </div>
        ) : pending.map(r => {
          const ageHours = Math.round((Date.now() - new Date(r.timeOfDeath).getTime()) / 3600000)
          return (
            <motion.div key={r.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className={cn("bg-white rounded-xl border p-4",
                r.isMLC ? "border-red-200" : "border-slate-200")}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                    {r.patientName} <span className="text-xs font-bold text-slate-400">{r.patientId}</span>
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">Slot {r.bodySlot}</span>
                    {r.isMLC && <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-100 text-red-700">MLC</span>}
                    {r.legalClearance === 'pending' && <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Pending</span>}
                    {r.legalClearance === 'mlc' && <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-100 text-red-700">MLC hold</span>}
                    {r.legalClearance === 'cleared' && <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">Cleared</span>}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" />Time of death {fmt(r.timeOfDeath)} ({ageHours}h ago) · certified by {r.certifiedBy}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{r.age}Y / {r.gender} · {r.ward} {r.bedNumber} · cause: {r.causeOfDeath}</p>
                  {r.isMLC && (
                    <p className="text-[11px] text-red-700 mt-1">MLC {r.mlcNumber} · {r.policeStation}</p>
                  )}
                  {r.autopsyRequired && !r.autopsyCompletedAt && (
                    <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />Autopsy required · pending
                    </p>
                  )}
                  {r.deathCertificateNumber && (
                    <p className="text-[11px] text-slate-600 mt-1 flex items-center gap-1">
                      <FileText className="h-3 w-3" />Death cert {r.deathCertificateNumber}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  {!r.deathCertificateNumber && (
                    <button onClick={() => onIssueCert(r.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer">
                      <FileText className="h-3.5 w-3.5" />Issue death cert
                    </button>
                  )}
                  {r.isMLC && r.legalClearance === 'mlc' && (
                    <button onClick={() => onClearMLC(r.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer">
                      <ShieldCheck className="h-3.5 w-3.5" />Clear MLC
                    </button>
                  )}
                  {r.legalClearance === 'cleared' && (
                    <button onClick={() => onRelease(r.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white cursor-pointer">
                      <CheckCircle2 className="h-3.5 w-3.5" />Release to family
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
        <ScanLine className="h-3 w-3" />Every certificate issue · MLC clearance · release is recorded as NABH ROM evidence.
      </p>
      {dialogView}
    </div>
  )
}
