"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { X, ShieldAlert, AlertTriangle, CheckCircle2 } from "lucide-react"
import { useERStore, type ERPatient, type MLCInjuryType, type MLCAlcoholScreen } from "@/store/useERStore"
import { toast } from "sonner"

const INJURY_TYPES: { value: MLCInjuryType; label: string }[] = [
  { value: 'RTA', label: 'Road Traffic Accident' },
  { value: 'Assault', label: 'Assault / Physical violence' },
  { value: 'Self-harm', label: 'Self-harm / Suicide attempt' },
  { value: 'Burn', label: 'Burns' },
  { value: 'Fall', label: 'Fall' },
  { value: 'Poisoning', label: 'Poisoning / Overdose' },
  { value: 'Other', label: 'Other' },
]

const ALCOHOL_SCREENS: { value: MLCAlcoholScreen; label: string }[] = [
  { value: 'pending', label: 'Pending — sample sent' },
  { value: 'positive', label: 'Positive' },
  { value: 'negative', label: 'Negative' },
  { value: 'refused', label: 'Patient refused' },
]

// MLC numbers follow a hospital-prefix + year + sequence pattern.
// Real hospitals use their NABH-assigned prefix; for the demo we generate
// "MLC-YYYY-NNNN" deterministically based on the second-of-day.
function suggestMLCNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const sec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()
  return `MLC-${year}-${String(sec).padStart(4, '0')}`
}

export function MLCModal({ patient, filedBy, onClose }: {
  patient: ERPatient
  filedBy: string
  onClose: () => void
}) {
  const setMLC = useERStore(s => s.setMLC)
  const existing = patient.mlc

  const [mlcNumber, setMlcNumber]       = useState(existing?.mlcNumber ?? suggestMLCNumber())
  const [policeStation, setPoliceStation] = useState(existing?.policeStation ?? '')
  const [officerName, setOfficerName]   = useState(existing?.officerName ?? '')
  const [officerBadge, setOfficerBadge] = useState(existing?.officerBadge ?? '')
  const [injuryType, setInjuryType]     = useState<MLCInjuryType>(existing?.injuryType ?? 'RTA')
  const [alcoholScreen, setAlcoholScreen] = useState<MLCAlcoholScreen>(existing?.alcoholScreen ?? 'pending')
  const [witnessName, setWitnessName]   = useState(existing?.witnessName ?? '')
  const [witnessPhone, setWitnessPhone] = useState(existing?.witnessPhone ?? '')
  const [notes, setNotes]               = useState(existing?.notes ?? '')

  const canSave = mlcNumber.trim().length >= 5 && policeStation.trim().length >= 2

  const onSave = () => {
    setMLC(patient.id, {
      mlcNumber: mlcNumber.trim(), policeStation: policeStation.trim(),
      officerName: officerName.trim() || undefined,
      officerBadge: officerBadge.trim() || undefined,
      injuryType, alcoholScreen,
      witnessName: witnessName.trim() || undefined,
      witnessPhone: witnessPhone.trim() || undefined,
      notes: notes.trim() || undefined,
      filedBy,
    })
    toast.success(`MLC ${mlcNumber.trim()} filed · audit officer notified`)
    onClose()
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 6 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-red-50">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-600" />
            <div>
              <h2 className="text-base font-bold text-red-900">MLC documentation</h2>
              <p className="text-xs text-red-700">Medico-Legal Case · {patient.name} · {patient.patientId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-red-100 cursor-pointer">
            <X className="h-4 w-4 text-red-600" />
          </button>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-800 flex items-start gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            MLC is a legal-evidence record. Police intimation is mandatory for trauma, poisoning, assault, self-harm, and suspicious death cases. Notes here go into the patient's permanent file.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">MLC number</label>
              <input value={mlcNumber} onChange={e => setMlcNumber(e.target.value)}
                className="w-full h-9 px-3 mt-1 rounded-lg border border-slate-200 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Police station</label>
              <input value={policeStation} onChange={e => setPoliceStation(e.target.value)}
                placeholder="e.g. Andheri East PS"
                className="w-full h-9 px-3 mt-1 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Investigating officer (name)</label>
              <input value={officerName} onChange={e => setOfficerName(e.target.value)}
                placeholder="e.g. PSI Patil"
                className="w-full h-9 px-3 mt-1 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Officer badge / buckle</label>
              <input value={officerBadge} onChange={e => setOfficerBadge(e.target.value)}
                placeholder="e.g. M-2341"
                className="w-full h-9 px-3 mt-1 rounded-lg border border-slate-200 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Nature of injury</label>
            <div className="grid grid-cols-2 gap-1.5 mt-1.5">
              {INJURY_TYPES.map(t => (
                <button key={t.value} type="button" onClick={() => setInjuryType(t.value)}
                  className={`text-xs font-bold px-2 py-1.5 rounded-lg border transition cursor-pointer text-left ${
                    injuryType === t.value
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Alcohol screen</label>
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              {ALCOHOL_SCREENS.map(s => (
                <button key={s.value} type="button" onClick={() => setAlcoholScreen(s.value)}
                  className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border transition cursor-pointer ${
                    alcoholScreen === s.value
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Witness name (optional)</label>
              <input value={witnessName} onChange={e => setWitnessName(e.target.value)}
                placeholder="e.g. Rajesh Kumar (brother)"
                className="w-full h-9 px-3 mt-1 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Witness phone</label>
              <input value={witnessPhone} onChange={e => setWitnessPhone(e.target.value)}
                placeholder="98765 43210"
                className="w-full h-9 px-3 mt-1 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Notes (mechanism, alleged history, body markings)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="e.g. Bike hit by truck at Andheri flyover. Helmet on. Bleeding from forehead laceration ~5cm. Right wrist deformity, suspected fracture."
              className="w-full mt-1 rounded-lg border border-slate-200 p-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/50">
          <button onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer">
            Cancel
          </button>
          <button onClick={onSave} disabled={!canSave}
            className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />File MLC
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
