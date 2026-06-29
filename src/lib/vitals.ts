// Pure, dependency-free vitals scoring. This module is a *leaf*: it imports
// nothing from the stores, so both `useInpatientStore` (to stamp a NEWS band on
// the event log at record time) and `earlyWarning` (richer doctor-facing
// insights) can use it without a circular import.
//
// `news2FromRecord` is a numeric NEWS2 (Scale 1) implementation over the
// comprehensive bedside vitals the nurse now captures. `vitalsAnomalies`
// surfaces individual out-of-range values as clinician-facing flags.

export type Consciousness = 'A' | 'V' | 'P' | 'U'
export type O2Delivery = 'Room air' | 'Nasal cannula' | 'Face mask' | 'Non-rebreather' | 'Ventilator'
export type Band = 'low' | 'medium' | 'high'
export type News2 = { score: number; band: Band; drivers: string[]; partial: boolean }

// The subset of a vitals record that feeds NEWS2. Structural, all-optional, so
// the store's richer `VitalsRecord` is assignable without a type dependency.
export type VitalScores = {
  hr?: number
  systolicBP?: number
  rr?: number
  spo2?: number
  o2Delivery?: O2Delivery
  temp?: number // °F (as captured at the bedside)
  consciousness?: Consciousness
}

const fToC = (f: number) => (f - 32) * 5 / 9
export const onSupplementalO2 = (o2?: O2Delivery) => !!o2 && o2 !== 'Room air'

// Computed BMI (kg / m²) from weight (kg) and height (cm); undefined if missing.
export function bmi(weightKg?: number, heightCm?: number): number | undefined {
  if (!weightKg || !heightCm) return undefined
  const m = heightCm / 100
  return Math.round((weightKg / (m * m)) * 10) / 10
}

// NEWS2 (Scale 1). Returns the aggregate score, the escalation band, the
// parameters that scored ≥2 (drivers), and whether the score is partial
// (respiratory rate missing — the single most important parameter).
export function news2FromRecord(v: VitalScores): News2 {
  let score = 0
  let anyThree = false
  const drivers: string[] = []
  const bump = (pts: number, label: string) => { score += pts; if (pts >= 2) drivers.push(label); if (pts === 3) anyThree = true }

  if (typeof v.rr === 'number') {
    if (v.rr <= 8) bump(3, `RR ${v.rr}`)
    else if (v.rr <= 11) bump(1, `RR ${v.rr}`)
    else if (v.rr <= 20) bump(0, `RR ${v.rr}`)
    else if (v.rr <= 24) bump(2, `RR ${v.rr}`)
    else bump(3, `RR ${v.rr}`)
  }
  if (typeof v.spo2 === 'number') {
    if (v.spo2 <= 91) bump(3, `SpO₂ ${v.spo2}%`)
    else if (v.spo2 <= 93) bump(2, `SpO₂ ${v.spo2}%`)
    else if (v.spo2 <= 95) bump(1, `SpO₂ ${v.spo2}%`)
  }
  if (onSupplementalO2(v.o2Delivery)) bump(2, `On ${v.o2Delivery}`)
  if (typeof v.systolicBP === 'number') {
    if (v.systolicBP <= 90) bump(3, `SBP ${v.systolicBP}`)
    else if (v.systolicBP <= 100) bump(2, `SBP ${v.systolicBP}`)
    else if (v.systolicBP <= 110) bump(1, `SBP ${v.systolicBP}`)
    else if (v.systolicBP >= 220) bump(3, `SBP ${v.systolicBP}`)
  }
  if (typeof v.hr === 'number') {
    if (v.hr <= 40) bump(3, `HR ${v.hr}`)
    else if (v.hr <= 50) bump(1, `HR ${v.hr}`)
    else if (v.hr <= 90) bump(0, `HR ${v.hr}`)
    else if (v.hr <= 110) bump(1, `HR ${v.hr}`)
    else if (v.hr <= 130) bump(2, `HR ${v.hr}`)
    else bump(3, `HR ${v.hr}`)
  }
  if (v.consciousness && v.consciousness !== 'A') bump(3, `Consciousness ${v.consciousness}`)
  if (typeof v.temp === 'number') {
    const c = fToC(v.temp)
    if (c <= 35) bump(3, `Temp ${v.temp}°F`)
    else if (c <= 36) bump(1, `Temp ${v.temp}°F`)
    else if (c <= 38) bump(0, `Temp ${v.temp}°F`)
    else if (c <= 39) bump(1, `Temp ${v.temp}°F`)
    else bump(2, `Temp ${v.temp}°F`)
  }

  const band: Band = score >= 7 ? 'high' : (score >= 5 || anyThree) ? 'medium' : 'low'
  return { score, band, drivers, partial: typeof v.rr !== 'number' }
}

export type Anomaly = { label: string; severity: 'warning' | 'critical' }

// Full anomaly set used by the comprehensive vitals form. Operates on the whole
// record (more fields than NEWS uses, e.g. glucose, pain, urine output).
export type AnomalyInput = VitalScores & {
  pain?: number
  bloodGlucose?: number
  capillaryRefill?: number
  urineOutput?: number
}

export function vitalsAnomalies(v: AnomalyInput): Anomaly[] {
  const out: Anomaly[] = []
  const add = (label: string, severity: Anomaly['severity']) => out.push({ label, severity })

  if (typeof v.hr === 'number') {
    if (v.hr < 40) add(`Severe bradycardia (HR ${v.hr})`, 'critical')
    else if (v.hr < 50) add(`Bradycardia (HR ${v.hr})`, 'warning')
    else if (v.hr > 130) add(`Severe tachycardia (HR ${v.hr})`, 'critical')
    else if (v.hr > 110) add(`Tachycardia (HR ${v.hr})`, 'warning')
  }
  if (typeof v.systolicBP === 'number') {
    if (v.systolicBP < 90) add(`Hypotension (SBP ${v.systolicBP})`, 'critical')
    else if (v.systolicBP <= 100) add(`Low BP (SBP ${v.systolicBP})`, 'warning')
    else if (v.systolicBP >= 180) add(`Hypertension (SBP ${v.systolicBP})`, 'warning')
  }
  if (typeof v.rr === 'number') {
    if (v.rr < 8 || v.rr >= 30) add(`Abnormal RR (${v.rr})`, 'critical')
    else if (v.rr <= 11 || v.rr >= 25) add(`Abnormal RR (${v.rr})`, 'warning')
  }
  if (typeof v.spo2 === 'number') {
    if (v.spo2 < 88) add(`Severe hypoxaemia (SpO₂ ${v.spo2}%)`, 'critical')
    else if (v.spo2 < 92) add(`Low SpO₂ (${v.spo2}%)`, 'warning')
    else if (v.spo2 < 95) add(`Borderline SpO₂ (${v.spo2}%)`, 'warning')
  }
  if (typeof v.temp === 'number') {
    if (v.temp >= 104) add(`High fever (${v.temp}°F)`, 'critical')
    else if (v.temp >= 100.4) add(`Fever (${v.temp}°F)`, 'warning')
    else if (v.temp < 95) add(`Hypothermia (${v.temp}°F)`, 'critical')
  }
  if (typeof v.pain === 'number' && v.pain >= 7) add(`Severe pain (${v.pain}/10)`, 'warning')
  if (typeof v.bloodGlucose === 'number') {
    if (v.bloodGlucose < 54) add(`Severe hypoglycaemia (${v.bloodGlucose} mg/dL)`, 'critical')
    else if (v.bloodGlucose < 70) add(`Hypoglycaemia (${v.bloodGlucose} mg/dL)`, 'warning')
    else if (v.bloodGlucose > 400) add(`Critical hyperglycaemia (${v.bloodGlucose} mg/dL)`, 'critical')
    else if (v.bloodGlucose > 300) add(`Hyperglycaemia (${v.bloodGlucose} mg/dL)`, 'warning')
  }
  if (v.consciousness && v.consciousness !== 'A') add(`Reduced consciousness (${v.consciousness})`, 'critical')
  if (typeof v.capillaryRefill === 'number') {
    if (v.capillaryRefill > 4) add(`Markedly delayed cap refill (${v.capillaryRefill}s)`, 'critical')
    else if (v.capillaryRefill > 2) add(`Delayed cap refill (${v.capillaryRefill}s)`, 'warning')
  }
  if (typeof v.urineOutput === 'number') {
    if (v.urineOutput < 20) add(`Oliguria (${v.urineOutput} mL/hr)`, 'critical')
    else if (v.urineOutput < 30) add(`Low urine output (${v.urineOutput} mL/hr)`, 'warning')
  }
  return out
}
