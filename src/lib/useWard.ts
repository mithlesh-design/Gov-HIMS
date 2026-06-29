import { useInpatientStore, lastRound, latestVitalsRecord, type Inpatient, type VitalsRecord } from "@/store/useInpatientStore"
import { useShiftStore, ALL_WARDS } from "@/store/useShiftStore"
import { ipdInsights } from "@/lib/earlyWarning"
import { news2FromRecord, bmi as calcBmi, type News2 } from "@/lib/vitals"
import type { PatientBed, Vitals, RoundsNote, Medication, IVDrip } from "@/store/useWardStore"

// Adapter: the nurse ward now reads the SAME patients as the doctor
// (useInpatientStore), mapped to the PatientBed shape the nurse UI expects.
// Every nurse action delegates to the shared store, so it lands on the doctor's
// chart/event log too. This unifies the two previously-separate datasets.

// Richer than PatientBed: also carries the live NEWS score and the full vitals
// timeline so the nurse UI can show scoring and trends.
export type WardPatient = PatientBed & {
  news?: News2
  vitalsRecords: VitalsRecord[]
  latestRecord?: VitalsRecord
  bmi?: number
}

const numFrom = (s?: string) => { const m = (s ?? '').match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : 0 }
function timeAgo(iso?: string): string {
  if (!iso) return '—'
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  return `${h} hour${h > 1 ? 's' : ''} ago`
}

function toBed(ip: Inpatient): WardPatient {
  const rec = latestVitalsRecord(ip)
  const last = lastRound(ip)?.vitals
  const vitals: Vitals = rec
    ? {
        hr: rec.hr ?? 0,
        bp: (rec.systolicBP != null && rec.diastolicBP != null) ? `${rec.systolicBP}/${rec.diastolicBP}` : (last?.bp ?? '—'),
        temp: rec.temp ?? 0,
        spo2: rec.spo2 ?? 0,
      }
    : { hr: numFrom(last?.pulse), bp: last?.bp ?? '—', temp: numFrom(last?.temp), spo2: numFrom(last?.spo2) }
  const ins = ipdInsights(ip)
  const condition: PatientBed['condition'] =
    (ip.stage === 'discharge_initiated' || ip.stage === 'discharged') ? 'Discharging'
      : ip.condition === 'Critical' ? 'Critical' : 'Stable'
  return {
    id: ip.patientId,
    name: ip.name,
    bedNumber: `${ip.ward} · ${ip.bed}`,
    condition,
    vitals,
    lastChecked: timeAgo(rec?.at ?? lastRound(ip)?.doneAt),
    aiAlert: !ip.dismissedInsight && ins.risk === 'high' ? ins.flag : undefined,
    rounds: ip.progressNotes.map(n => ({ id: n.id, timestamp: timeAgo(n.at), text: n.text, category: 'observation' as const, author: n.doctor })),
    currentMedications: ip.meds.filter(m => m.status === 'active').map(m => ({
      name: m.name, dosage: m.dose, frequency: m.freq,
      route: (m.route === 'IV' || m.route === 'IM') ? m.route : 'Oral',
      status: 'Active' as const,
    })),
    ivDrips: (ip.ivLines ?? []).map(l => ({ fluid: l.fluid, rate: l.rate, startedAt: l.startedAt, status: l.status })),
    news: rec ? news2FromRecord(rec) : undefined,
    vitalsRecords: (ip.vitals ?? []).slice().sort((a, b) => a.at.localeCompare(b.at)),
    latestRecord: rec,
    bmi: calcBmi(rec?.weight, rec?.height),
  }
}

export function useWard() {
  const inpatients = useInpatientStore(s => s.inpatients)
  const activeWard = useShiftStore(s => s.activeWard)
  const recordVitals = useInpatientStore(s => s.recordVitals)
  const dismissInsight = useInpatientStore(s => s.dismissInsight)
  const addProgressNote = useInpatientStore(s => s.addProgressNote)
  const addMed = useInpatientStore(s => s.addMed)
  const addTest = useInpatientStore(s => s.addTest)
  const addIvLine = useInpatientStore(s => s.addIvLine)

  const patients = inpatients
    .filter(i => i.stage !== 'discharged' && (activeWard === ALL_WARDS || i.ward === activeWard))
    .map(toBed)

  return {
    patients,
    activeNurses: 12,
    availableBeds: 5,
    updateVitals: (id: string, v: Omit<VitalsRecord, 'id' | 'at'>) => recordVitals(id, v),
    dismissAlert: (id: string) => dismissInsight(id),
    addRoundsNote: (patientId: string, note: Omit<RoundsNote, 'id'>) => {
      const cond = useInpatientStore.getState().inpatients.find(i => i.patientId === patientId)?.condition ?? 'Stable'
      addProgressNote(patientId, note.text, cond)
      note.medicines?.forEach(m => addMed(patientId, { name: m.name, dose: m.dosage, freq: m.frequency, route: 'Oral' }))
      note.tests?.forEach(t => addTest(patientId, { name: t.name, priority: t.urgency }))
    },
    addMedication: (patientId: string, med: Medication) => addMed(patientId, { name: med.name, dose: med.dosage, freq: med.frequency, route: med.route }),
    addIVDrip: (patientId: string, drip: IVDrip) => addIvLine(patientId, { fluid: drip.fluid, rate: drip.rate, startedAt: drip.startedAt, status: drip.status }),
  }
}
