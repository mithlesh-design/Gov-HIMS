export type InteractionSeverity = 'major' | 'moderate' | 'minor'

export interface Interaction {
  drug1: string
  drug2: string
  severity: InteractionSeverity
  effect: string
  recommendation: string
}

const INTERACTION_DB: Array<Omit<Interaction, 'drug1' | 'drug2'> & { pair: [string, string] }> = [
  { pair: ['Warfarin', 'Aspirin'], severity: 'major', effect: 'Increased bleeding risk', recommendation: 'Avoid combination. If necessary, monitor INR closely and use PPI.' },
  { pair: ['Warfarin', 'Ibuprofen'], severity: 'major', effect: 'Increased anticoagulant effect and GI bleed risk', recommendation: 'Avoid NSAIDs. Use Paracetamol for pain.' },
  { pair: ['Metformin', 'Contrast Media'], severity: 'major', effect: 'Lactic acidosis risk', recommendation: 'Hold Metformin 48hrs before contrast. Restart after renal function confirmed stable.' },
  { pair: ['Amiodarone', 'Warfarin'], severity: 'major', effect: 'INR significantly elevated', recommendation: 'Reduce Warfarin dose by 30–50%. Monitor INR weekly.' },
  { pair: ['Amlodipine', 'Simvastatin'], severity: 'moderate', effect: 'Increased Simvastatin exposure — myopathy risk', recommendation: 'Use Simvastatin ≤20mg/day or switch to Rosuvastatin.' },
  { pair: ['Morphine', 'Diazepam'], severity: 'major', effect: 'Additive CNS and respiratory depression', recommendation: 'Avoid combination. If needed, reduce doses and monitor closely with pulse oximetry.' },
  { pair: ['Clarithromycin', 'Atorvastatin'], severity: 'major', effect: 'Increased Atorvastatin levels — rhabdomyolysis risk', recommendation: 'Suspend Atorvastatin during Clarithromycin course.' },
]

export function checkInteractions(drugs: string[]): Interaction[] {
  const result: Interaction[] = []
  const normalized = drugs.map((d) => d.toLowerCase())
  for (const entry of INTERACTION_DB) {
    const [d1, d2] = entry.pair
    if (normalized.includes(d1.toLowerCase()) && normalized.includes(d2.toLowerCase())) {
      result.push({ drug1: d1, drug2: d2, severity: entry.severity, effect: entry.effect, recommendation: entry.recommendation })
    }
  }
  return result
}
