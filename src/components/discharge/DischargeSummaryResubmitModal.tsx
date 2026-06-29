"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { X, FileText, Stethoscope, Bed, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { DischargePatient } from "@/store/useDischargeStore"

export interface ResubmitData {
  summary: string
  followUpDate: string
  instructions: string
}

/**
 * Discharge-summary resubmission form. Opened when a doctor's clearance is
 * withdrawn for a queued patient: the doctor reviews / edits the summary and
 * resubmits, which returns the patient to IPD / Inpatients (handled by the
 * caller via onResubmit).
 */
export function DischargeSummaryResubmitModal({
  patient, initialSummary, onClose, onResubmit,
}: {
  patient: DischargePatient
  initialSummary: string
  onClose: () => void
  onResubmit: (data: ResubmitData) => void
}) {
  const [summary, setSummary] = useState(initialSummary)
  const [followUpDate, setFollowUpDate] = useState(patient.followUpDate?.split("T")[0] ?? "")
  const [instructions, setInstructions] = useState(patient.dischargeInstructions ?? "")

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="resubmit-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0">
              <FileText className="h-5 w-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <h2 id="resubmit-title" className="text-base font-bold text-slate-900">Review & resubmit discharge summary</h2>
              <p className="text-sm text-slate-500 font-medium truncate">{patient.patientName} · {patient.diagnosis}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer flex-shrink-0">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto space-y-4">
          {/* Read-only context */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5" />{patient.wardBed}</span>
            <span className="flex items-center gap-1"><Stethoscope className="h-3.5 w-3.5" />{patient.attendingDoctor}</span>
            <span>{patient.payerType}</span>
          </div>

          <p className="text-[12.5px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Doctor clearance was withdrawn. Review the summary below and resubmit — the patient will be returned to <b>IPD / Inpatients</b> for continued care.
          </p>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Discharge summary</label>
            <textarea
              value={summary}
              onChange={e => setSummary(e.target.value)}
              rows={10}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Follow-up date</label>
              <input
                type="date"
                value={followUpDate}
                onChange={e => setFollowUpDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Discharge instructions</label>
            <textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              rows={3}
              placeholder="Medication, activity, red-flag advice…"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => onResubmit({ summary, followUpDate, instructions })}
            disabled={!summary.trim()}
            className="gap-1.5"
          >
            <RotateCcw className="h-4 w-4" /> Resubmit & return to IPD
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
