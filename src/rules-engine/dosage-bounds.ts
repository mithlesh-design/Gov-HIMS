export interface DosageValidationResult {
  valid: boolean
  warnings: string[]
  errors: string[]
}

interface DosageBound {
  minMgPerKg?: number
  maxMgPerKg?: number
  maxDailyMg?: number
  minDailyMg?: number
  renalAdjustRequired?: boolean
  paediatricMaxMgPerKg?: number
}

const DOSAGE_BOUNDS: Record<string, DosageBound> = {
  Paracetamol:       { maxDailyMg: 4000, minDailyMg: 500, maxMgPerKg: 60, renalAdjustRequired: false },
  Metformin:         { maxDailyMg: 2550, renalAdjustRequired: true },
  Amoxicillin:       { maxDailyMg: 3000, maxMgPerKg: 90 },
  Morphine:          { maxDailyMg: 120, maxMgPerKg: 2, renalAdjustRequired: true },
  Diazepam:          { maxDailyMg: 40, renalAdjustRequired: false },
  Warfarin:          { maxDailyMg: 10 },
  Atorvastatin:      { maxDailyMg: 80 },
  Amlodipine:        { maxDailyMg: 10 },
}

export function validateDosage(
  drugName: string,
  doseMg: number,
  weightKg: number,
  ageYears: number,
  eGFR?: number
): DosageValidationResult {
  const bounds = DOSAGE_BOUNDS[drugName]
  const errors: string[] = []
  const warnings: string[] = []
  if (!bounds) return { valid: true, warnings: [`No dosage bounds registered for ${drugName} — manual verification required`], errors: [] }
  if (bounds.maxDailyMg && doseMg > bounds.maxDailyMg) errors.push(`${drugName} dose ${doseMg}mg exceeds maximum daily dose of ${bounds.maxDailyMg}mg`)
  if (bounds.minDailyMg && doseMg < bounds.minDailyMg) warnings.push(`${drugName} dose ${doseMg}mg is below minimum effective dose of ${bounds.minDailyMg}mg`)
  if (bounds.maxMgPerKg && weightKg > 0) {
    const maxForWeight = bounds.maxMgPerKg * weightKg
    if (doseMg > maxForWeight) errors.push(`${drugName} dose ${doseMg}mg exceeds weight-based maximum (${bounds.maxMgPerKg}mg/kg × ${weightKg}kg = ${maxForWeight}mg)`)
  }
  if (bounds.renalAdjustRequired && eGFR !== undefined && eGFR < 30) warnings.push(`${drugName} requires renal dose adjustment — eGFR ${eGFR} mL/min. Consider dose reduction or alternative.`)
  if (ageYears < 18 && bounds.paediatricMaxMgPerKg && weightKg > 0) {
    const maxPaed = bounds.paediatricMaxMgPerKg * weightKg
    if (doseMg > maxPaed) errors.push(`${drugName} paediatric dose ${doseMg}mg exceeds maximum (${bounds.paediatricMaxMgPerKg}mg/kg × ${weightKg}kg = ${maxPaed}mg)`)
  }
  return { valid: errors.length === 0, errors, warnings }
}
