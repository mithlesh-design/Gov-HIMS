// Prescribe-time safety: a curated drug–drug interaction matrix + an allergy
// cross-check. Deterministic and explainable — a decision aid surfaced at the
// moment of ordering (dashboard Rx panel and the copilot's prescription tool).

export type Severity = 'major' | 'moderate' | 'minor'
export type RxWarning = { type: 'interaction' | 'allergy'; severity: Severity; title: string; note: string }

const INTERACTIONS: { a: string; b: string; severity: Severity; note: string }[] = [
  { a: 'warfarin', b: 'aspirin', severity: 'major', note: 'Anticoagulant + antiplatelet — markedly increased bleeding risk.' },
  { a: 'warfarin', b: 'ibuprofen', severity: 'major', note: 'NSAID + anticoagulant — GI bleeding risk.' },
  { a: 'warfarin', b: 'naproxen', severity: 'major', note: 'NSAID + anticoagulant — bleeding risk.' },
  { a: 'warfarin', b: 'diclofenac', severity: 'major', note: 'NSAID + anticoagulant — bleeding risk.' },
  { a: 'atorvastatin', b: 'clarithromycin', severity: 'major', note: 'Strong CYP3A4 inhibitor — high myopathy/rhabdomyolysis risk.' },
  { a: 'aspirin', b: 'clopidogrel', severity: 'moderate', note: 'Dual antiplatelet therapy — heightened bleeding risk; confirm intended.' },
  { a: 'aspirin', b: 'ibuprofen', severity: 'moderate', note: 'Ibuprofen can blunt aspirin cardioprotection; separate dosing.' },
  { a: 'atorvastatin', b: 'azithromycin', severity: 'moderate', note: 'Macrolide may raise statin levels — myopathy risk.' },
  { a: 'tramadol', b: 'sertraline', severity: 'moderate', note: 'Serotonergic combination — serotonin syndrome risk.' },
  { a: 'ramipril', b: 'spironolactone', severity: 'moderate', note: 'Hyperkalaemia risk — monitor potassium.' },
  { a: 'metformin', b: 'glimepiride', severity: 'minor', note: 'Additive glucose-lowering — watch for hypoglycaemia.' },
  { a: 'ramipril', b: 'losartan', severity: 'major', note: 'ACE inhibitor + ARB dual blockade — hyperkalaemia / acute kidney injury risk.' },
  { a: 'ibuprofen', b: 'ramipril', severity: 'moderate', note: 'NSAID + ACE inhibitor — reduced renal perfusion ("triple whammy" with a diuretic).' },
  { a: 'clopidogrel', b: 'omeprazole', severity: 'moderate', note: 'PPI may reduce clopidogrel activation — prefer pantoprazole.' },
]

// Drug classes for duplicate-therapy detection.
const DRUG_CLASS: { cls: string; kws: string[] }[] = [
  { cls: 'NSAID', kws: ['ibuprofen', 'diclofenac', 'naproxen', 'aspirin', 'ketorolac', 'indomethacin'] },
  { cls: 'ACE inhibitor', kws: ['ramipril', 'enalapril', 'lisinopril', 'perindopril'] },
  { cls: 'ARB', kws: ['losartan', 'telmisartan', 'valsartan', 'olmesartan'] },
  { cls: 'statin', kws: ['atorvastatin', 'rosuvastatin', 'simvastatin'] },
  { cls: 'PPI', kws: ['pantoprazole', 'omeprazole', 'esomeprazole', 'rabeprazole'] },
  { cls: 'beta-blocker', kws: ['metoprolol', 'atenolol', 'bisoprolol', 'carvedilol'] },
  { cls: 'sulfonylurea', kws: ['glimepiride', 'gliclazide', 'glibenclamide'] },
  { cls: 'macrolide', kws: ['azithromycin', 'clarithromycin', 'erythromycin'] },
]
const classOf = (med: string) => DRUG_CLASS.find(c => c.kws.some(k => med.toLowerCase().includes(k)))?.cls

// Meds contraindicated or needing adjustment in renal impairment.
const RENAL_RISK = ['metformin', 'ibuprofen', 'diclofenac', 'naproxen', 'nitrofurantoin', 'spironolactone', 'gabapentin']
const isCKD = (text: string) => /\bckd\b|chronic kidney|renal (failure|impairment)|egfr|nephropathy/.test(text)

// allergen keyword → contraindicated drug-name keywords
const ALLERGY_CLASS: { allergen: RegExp; meds: string[]; label: string }[] = [
  { allergen: /penicillin|beta.?lactam|amoxicillin|augmentin/, meds: ['amoxicillin', 'amoxicillin-clavulanate', 'augmentin', 'ampicillin', 'piperacillin', 'penicillin', 'cloxacillin', 'cefalexin', 'cephalexin'], label: 'Penicillin/beta-lactam' },
  { allergen: /sulfa|sulpha|cotrimoxazole|septran/, meds: ['cotrimoxazole', 'sulfamethoxazole', 'sulfasalazine'], label: 'Sulfa' },
  { allergen: /nsaid/, meds: ['ibuprofen', 'diclofenac', 'naproxen', 'aspirin', 'ketorolac'], label: 'NSAID' },
]

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function checkRx(medNames: string[], ctx: { history?: string[]; allergies?: string[]; comorbidities?: string[] }): RxWarning[] {
  const meds = medNames.map(m => m.toLowerCase())
  const warnings: RxWarning[] = []

  for (const r of INTERACTIONS) {
    if (meds.some(m => m.includes(r.a)) && meds.some(m => m.includes(r.b))) {
      warnings.push({ type: 'interaction', severity: r.severity, title: `${cap(r.a)} + ${cap(r.b)}`, note: r.note })
    }
  }

  // Duplicate therapy — two drugs of the same class.
  const byClass = new Map<string, string[]>()
  medNames.forEach(m => { const c = classOf(m); if (c) byClass.set(c, [...(byClass.get(c) ?? []), m]) })
  for (const [cls, list] of byClass) {
    if (list.length >= 2) warnings.push({ type: 'interaction', severity: 'moderate', title: `Duplicate ${cls}`, note: `${list.join(' + ')} — same class; additive risk, usually avoid co-prescribing.` })
  }

  const ctxText = [...(ctx.allergies ?? []), ...(ctx.history ?? []), ...(ctx.comorbidities ?? [])].join(' ').toLowerCase()

  // Renal dosing — flag renal-risk meds when the patient is flagged CKD/renal.
  if (isCKD(ctxText)) {
    for (const m of medNames) {
      if (RENAL_RISK.some(k => m.toLowerCase().includes(k))) {
        warnings.push({ type: 'interaction', severity: 'major', title: `Renal caution — ${m}`, note: 'Patient has renal impairment; this drug is contraindicated or needs dose adjustment.' })
      }
    }
  }

  // Allergy cross-check.
  if (ctxText && !/no known (drug )?allerg/.test(ctxText)) {
    for (const a of ALLERGY_CLASS) {
      if (!a.allergen.test(ctxText)) continue
      const hit = medNames.find(m => a.meds.some(k => m.toLowerCase().includes(k)))
      if (hit) warnings.push({ type: 'allergy', severity: 'major', title: `Allergy — ${a.label}`, note: `Patient is flagged ${a.label}-allergic; ${hit} is contraindicated.` })
    }
  }

  return warnings
}

export const hasMajor = (w: RxWarning[]) => w.some(x => x.severity === 'major')
