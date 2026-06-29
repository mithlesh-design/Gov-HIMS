"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { X, LogOut, CheckCircle2 } from "lucide-react"
import type { WardPatient } from "@/lib/useWard"

// The nurse's part of discharge: complete the nursing clearance checklist, then
// the patient is routed to the Discharge desk with the nursing pillar cleared.
const ITEMS = [
  "IV cannula / lines removed",
  "Wound care & dressings complete",
  "Take-home (TTO) medicines explained",
  "Patient & family education given",
  "Belongings & valuables returned",
  "Mobility / safe transfer assessed",
]

export function DischargeClearanceModal({ patient, alreadyQueued, onClose, onConfirm }: {
  patient: WardPatient
  alreadyQueued: boolean
  onClose: () => void
  onConfirm: (note?: string) => void
}) {
  const [checks, setChecks] = useState<boolean[]>(ITEMS.map(() => false))
  const [note, setNote] = useState("")
  const all = checks.every(Boolean)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.97, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="disch-title">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center"><LogOut className="h-5 w-5 text-amber-600" /></div>
            <div>
              <h2 id="disch-title" className="text-base font-bold text-slate-900">Nursing discharge clearance</h2>
              <p className="text-sm text-slate-500 font-medium">{patient.name} · {patient.bedNumber}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"><X className="h-4 w-4 text-slate-500" /></button>
        </div>

        <div className="px-6 py-4 overflow-y-auto space-y-4">
          <p className="text-xs text-slate-500">Complete the nursing checklist. On confirm, {patient.name.split(" ")[0]} is sent to the <span className="font-semibold">Discharge desk</span> with nursing cleared.</p>
          <div className="space-y-2">
            {ITEMS.map((item, i) => (
              <label key={item} className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={checks[i]} onChange={e => setChecks(c => c.map((v, j) => j === i ? e.target.checked : v))}
                  className="h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500 cursor-pointer" />
                {item}
              </label>
            ))}
          </div>
          <div>
            <label htmlFor="disch-note" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Handover note to discharge desk (optional)</label>
            <input id="disch-note" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. follow-up bloods in 1 week"
              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-500 bg-slate-50" />
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">Cancel</button>
          <button onClick={() => onConfirm(note.trim() || undefined)} disabled={!all}
            className="flex-1 h-10 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" /> {alreadyQueued ? "Clear & update desk" : "Clear & send to discharge"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
