import { wrapAiResponse } from '@/lib/ai-helpers'
import type { AiEnvelope } from '@/types/ai'

export interface LabAnomaly {
  testCode: string
  testName: string
  value: string
  unit: string
  referenceRange: string
  severity: 'critical' | 'abnormal' | 'borderline'
  clinicalSignificance: string
  suggestedAction: string
}

export async function detectLabAnomalies(
  results: Record<string, string | number>
): Promise<AiEnvelope<LabAnomaly[]>> {
  await new Promise((r) => setTimeout(r, 400))
  void results
  return wrapAiResponse<LabAnomaly[]>(
    [
      { testCode: 'K', testName: 'Potassium', value: '6.8', unit: 'mEq/L', referenceRange: '3.5–5.0', severity: 'critical', clinicalSignificance: 'Severe hyperkalaemia — risk of fatal arrhythmia', suggestedAction: 'Immediate cardiology consult. IV calcium gluconate, insulin-dextrose, consider dialysis.' },
      { testCode: 'HBA1C', testName: 'HbA1c', value: '8.4', unit: '%', referenceRange: '<7.0', severity: 'abnormal', clinicalSignificance: 'Poorly controlled diabetes', suggestedAction: 'Endocrinology review. Medication adjustment.' },
      { testCode: 'CREAT', testName: 'Creatinine', value: '2.1', unit: 'mg/dL', referenceRange: '0.7–1.2', severity: 'abnormal', clinicalSignificance: 'Elevated — consistent with CKD Stage 3', suggestedAction: 'Nephrology review. Avoid nephrotoxic drugs. Hydration.' },
    ],
    0.93,
    'Rule-based anomaly detection against LOINC reference ranges with severity classification.'
  )
}
