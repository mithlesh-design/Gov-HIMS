"use client"

import { useMemo, useState } from "react"
import { news2FromRecord, vitalsAnomalies, bmi as calcBmi, type O2Delivery, type Consciousness, type News2, type Anomaly } from "@/lib/vitals"
import type { VitalsRecord } from "@/store/useInpatientStore"

// Shared vitals-capture state used by both the quick VitalsForm and the
// first-visit wizard's vitals step — one source of the draft + live NEWS/anomalies.

export const VITALS_NURSE = "N. Anjali Desai"
export const O2_OPTIONS: O2Delivery[] = ["Room air", "Nasal cannula", "Face mask", "Non-rebreather", "Ventilator"]
export const AVPU_OPTIONS: { v: Consciousness; label: string }[] = [
  { v: "A", label: "A · Alert" }, { v: "V", label: "V · Voice" }, { v: "P", label: "P · Pain" }, { v: "U", label: "U · Unresponsive" },
]

export type VitalsDraftValues = Record<string, string>
export const numOf = (s: string) => { const n = parseFloat(s); return isNaN(n) ? undefined : n }
const str = (n?: number) => (n == null ? "" : String(n))

export type VitalsDraftApi = {
  f: VitalsDraftValues
  set: (k: string) => (v: string) => void
  o2: O2Delivery; setO2: (o: O2Delivery) => void
  avpu: Consciousness; setAvpu: (a: Consciousness) => void
  draft: Omit<VitalsRecord, "id" | "at">
  news: News2
  anomalies: Anomaly[]
  liveBmi?: number
  anyEntered: boolean
}

export function useVitalsDraft(priorRecords: VitalsRecord[] = []): VitalsDraftApi {
  const recs = priorRecords
  const lastDef = <K extends keyof VitalsRecord>(k: K): VitalsRecord[K] | undefined => {
    for (let i = recs.length - 1; i >= 0; i--) { const v = recs[i][k]; if (v != null) return v }
    return undefined
  }
  const [f, setF] = useState<VitalsDraftValues>({
    hr: "", sys: "", dia: "", rr: "", spo2: "", o2flow: "", temp: "", pain: "",
    glu: "", gcs: "", weight: str(lastDef("weight")), height: str(lastDef("height")), crt: "", urine: "", note: "",
  })
  const [o2, setO2] = useState<O2Delivery>(lastDef("o2Delivery") ?? "Room air")
  const [avpu, setAvpu] = useState<Consciousness>(lastDef("consciousness") ?? "A")
  const set = (k: string) => (v: string) => setF(s => ({ ...s, [k]: v }))

  const draft: Omit<VitalsRecord, "id" | "at"> = useMemo(() => ({
    by: VITALS_NURSE,
    hr: numOf(f.hr), systolicBP: numOf(f.sys), diastolicBP: numOf(f.dia), rr: numOf(f.rr),
    spo2: numOf(f.spo2), o2Delivery: o2, o2Flow: o2 === "Room air" ? undefined : numOf(f.o2flow),
    temp: numOf(f.temp), pain: numOf(f.pain), bloodGlucose: numOf(f.glu),
    consciousness: avpu, gcs: numOf(f.gcs), weight: numOf(f.weight), height: numOf(f.height),
    capillaryRefill: numOf(f.crt), urineOutput: numOf(f.urine), note: f.note.trim() || undefined,
  }), [f, o2, avpu])

  const news = useMemo(() => news2FromRecord(draft), [draft])
  const anomalies = useMemo(() => vitalsAnomalies(draft), [draft])
  const liveBmi = calcBmi(draft.weight, draft.height)
  const anyEntered = [draft.hr, draft.systolicBP, draft.rr, draft.spo2, draft.temp].some(v => v != null)

  return { f, set, o2, setO2, avpu, setAvpu, draft, news, anomalies, liveBmi, anyEntered }
}
