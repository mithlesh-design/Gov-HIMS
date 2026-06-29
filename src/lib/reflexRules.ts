import type { TestRun, ReflexSuggestion } from '@/store/useLabOrdersStore'

// Reflex test rule engine. Pure function — given a just-released TestRun,
// returns suggested follow-up tests (catalog codes) the incharge can order
// with one click.

export type ReflexMatch = Pick<ReflexSuggestion, 'basedOnTestId' | 'patientName' | 'triggerSummary' | 'code' | 'reason'>

const num = (t: TestRun, analyte: string): number | undefined => {
  const v = t.analytes.find(a => a.analyte === analyte)?.value
  return typeof v === 'number' ? v : undefined
}

export function evaluateReflex(t: TestRun, patientName: string): ReflexMatch[] {
  const out: ReflexMatch[] = []

  // HbA1c ≥ 6.5% → add fasting blood sugar
  if (t.code === 'HBA1C') {
    const v = num(t, 'HbA1c')
    if (v !== undefined && v >= 6.5) {
      out.push({
        basedOnTestId: t.id, patientName, code: 'GLUC',
        triggerSummary: `HbA1c ${v}% (≥6.5)`,
        reason: 'Diabetic-range HbA1c — confirm with fasting blood sugar',
      })
    }
  }

  // Troponin I elevated → add CRP (in real life: CK-MB + 6h repeat troponin)
  if (t.code === 'TROPI') {
    const v = num(t, 'Troponin I')
    if (v !== undefined && v >= 0.04) {
      out.push({
        basedOnTestId: t.id, patientName, code: 'CRP',
        triggerSummary: `Troponin I ${v} ng/mL (>0.04)`,
        reason: 'Elevated troponin — add inflammatory marker',
      })
    }
  }

  // CBC: WBC > 15 000/µL → suggest blood culture
  if (t.code === 'CBC') {
    const v = num(t, 'WBC count')
    if (v !== undefined && v > 15000) {
      out.push({
        basedOnTestId: t.id, patientName, code: 'CULT_BLOOD',
        triggerSummary: `WBC ${v}/µL (>15 000)`,
        reason: 'Leucocytosis — rule out bacteraemia',
      })
    }
  }

  // LFT: transaminitis ≥3× ULN → suggest CRP for inflammatory context
  if (t.code === 'LFT') {
    const ast = num(t, 'AST (SGOT)')
    const alt = num(t, 'ALT (SGPT)')
    if ((ast !== undefined && ast > 120) || (alt !== undefined && alt > 168)) {
      out.push({
        basedOnTestId: t.id, patientName, code: 'CRP',
        triggerSummary: `AST ${ast ?? '-'} · ALT ${alt ?? '-'}`,
        reason: 'Significant transaminitis — add inflammatory marker',
      })
    }
  }

  // RFT: potassium critical → suggest repeat CBC (delta-check context)
  if (t.code === 'RFT') {
    const k = num(t, 'Potassium')
    if (k !== undefined && (k <= 2.5 || k >= 6.5)) {
      out.push({
        basedOnTestId: t.id, patientName, code: 'RFT',
        triggerSummary: `Potassium ${k} mmol/L (critical)`,
        reason: 'Critical potassium — repeat RFT for confirmation',
      })
    }
  }

  return out
}
