export interface CriticalValueResult {
  isCritical: boolean
  severity: 'critical_high' | 'critical_low' | 'normal'
  normalRange: string
  immediateAction: string
}

interface CriticalRange {
  low: number
  high: number
  unit: string
  normalRange: string
  criticalLowAction: string
  criticalHighAction: string
}

const CRITICAL_RANGES: Record<string, CriticalRange> = {
  K:       { low: 2.5, high: 6.5, unit: 'mEq/L', normalRange: '3.5–5.0 mEq/L', criticalLowAction: 'IV Potassium replacement. Cardiac monitoring. Repeat in 2 hours.', criticalHighAction: 'IV Calcium Gluconate stat. Insulin + Dextrose. Cardiology consult. Consider dialysis.' },
  Na:      { low: 120, high: 160, unit: 'mEq/L', normalRange: '135–145 mEq/L', criticalLowAction: 'Restrict fluids. Hypertonic saline if severe symptoms. Neurology consult.', criticalHighAction: 'Slow correction with IV fluids. Endocrinology consult.' },
  Glucose: { low: 50, high: 500, unit: 'mg/dL', normalRange: '70–140 mg/dL', criticalLowAction: 'Oral glucose or IV Dextrose 50% 50mL stat.', criticalHighAction: 'Insulin protocol. Check ketones. Hydration.' },
  Hb:      { low: 7, high: 20, unit: 'g/dL', normalRange: '12–17 g/dL', criticalLowAction: 'Blood transfusion assessment. Urgent haematology consult.', criticalHighAction: 'Assess for polycythaemia. Haematology consult.' },
  Creat:   { low: 0, high: 8, unit: 'mg/dL', normalRange: '0.7–1.2 mg/dL', criticalLowAction: '', criticalHighAction: 'Nephrology consult. Assess for acute kidney injury. Dialysis consideration.' },
  PLT:     { low: 20000, high: 1000000, unit: '/μL', normalRange: '150,000–400,000/μL', criticalLowAction: 'Platelet transfusion if bleeding. Haematology urgent consult.', criticalHighAction: 'Haematology consult. Assess for thrombocytosis cause.' },
  INR:     { low: 0, high: 4, unit: '', normalRange: '0.9–1.1 (therapeutic 2–3)', criticalLowAction: '', criticalHighAction: 'Hold anticoagulants. Vitamin K. Haematology consult if bleeding.' },
}

export function isCriticalValue(testCode: string, result: number): CriticalValueResult {
  const range = CRITICAL_RANGES[testCode]
  if (!range) return { isCritical: false, severity: 'normal', normalRange: 'Unknown', immediateAction: '' }
  if (result < range.low) return { isCritical: true, severity: 'critical_low', normalRange: range.normalRange, immediateAction: range.criticalLowAction }
  if (result > range.high) return { isCritical: true, severity: 'critical_high', normalRange: range.normalRange, immediateAction: range.criticalHighAction }
  return { isCritical: false, severity: 'normal', normalRange: range.normalRange, immediateAction: '' }
}
