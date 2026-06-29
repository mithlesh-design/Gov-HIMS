export interface AllergyBlockResult {
  blocked: boolean
  allergen: string
  reaction: string
  recommendation: string
}

const ALLERGY_CLASS_MAP: Record<string, string[]> = {
  Penicillin: ['Amoxicillin', 'Ampicillin', 'Cloxacillin', 'Piperacillin', 'Amoxicillin-Clavulanate'],
  Sulfonamide: ['Sulfamethoxazole', 'Co-trimoxazole', 'Dapsone'],
  NSAID: ['Ibuprofen', 'Diclofenac', 'Naproxen', 'Aspirin', 'Ketorolac'],
  Opioid: ['Morphine', 'Tramadol', 'Codeine', 'Pethidine'],
  Benzodiazepine: ['Diazepam', 'Lorazepam', 'Midazolam', 'Clonazepam'],
  Statin: ['Atorvastatin', 'Rosuvastatin', 'Simvastatin'],
}

export function isAllergyContraindicated(
  drugName: string,
  documentedAllergies: string[]
): AllergyBlockResult {
  const drug = drugName.toLowerCase()
  for (const allergy of documentedAllergies) {
    const allergyLower = allergy.toLowerCase()
    if (drug.includes(allergyLower) || allergyLower.includes(drug)) {
      return { blocked: true, allergen: allergy, reaction: 'Cross-reactive allergy', recommendation: `Avoid ${drugName}. Document allergy class. Use alternative class.` }
    }
    for (const [allergyClass, members] of Object.entries(ALLERGY_CLASS_MAP)) {
      const allergyMatchesClass = allergyLower.includes(allergyClass.toLowerCase())
      const drugInClass = members.some((m) => m.toLowerCase() === drug)
      if (allergyMatchesClass && drugInClass) {
        return { blocked: true, allergen: allergy, reaction: `Cross-reactivity — ${allergyClass} class`, recommendation: `${drugName} belongs to ${allergyClass} class. Patient allergic to ${allergy}. Select alternative.` }
      }
    }
  }
  return { blocked: false, allergen: '', reaction: '', recommendation: '' }
}
