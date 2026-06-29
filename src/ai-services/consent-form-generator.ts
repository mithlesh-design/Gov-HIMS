import { wrapAiResponse } from '@/lib/ai-helpers'
import type { AiEnvelope } from '@/types/ai'

export interface ConsentFormContent {
  procedureOverview: string
  risks: string[]
  benefits: string[]
  alternatives: string[]
  patientRights: string[]
  declarationText: string
}

// Procedure-specific consent content library
const PROCEDURE_TEMPLATES: Record<string, Omit<ConsentFormContent, 'declarationText'>> = {
  angioplasty: {
    procedureOverview:
      'Coronary angioplasty (Percutaneous Coronary Intervention — PCI) is a minimally invasive procedure to open narrowed or blocked coronary arteries. A thin catheter with a small balloon at the tip is threaded through a blood vessel to the blocked artery and inflated to widen the passage. A stent (small wire mesh tube) is usually placed to keep the artery open.',
    risks: [
      'Bleeding or bruising at the catheter insertion site',
      'Damage to the artery or surrounding blood vessels',
      'Blood clots forming around the stent (rare, risk reduced with medications)',
      'Allergic reaction to contrast dye used during the procedure',
      'Abnormal heart rhythms during the procedure',
      'Heart attack, stroke, or kidney problems in rare cases',
      'Need for emergency bypass surgery (less than 1%)',
    ],
    benefits: [
      'Immediate relief from chest pain (angina) in most cases',
      'Restoration of blood flow to heart muscle, reducing damage',
      'Significantly lower risk compared to open bypass surgery',
      'Short hospital stay, typically 1–2 days',
      'Reduced long-term risk of heart attack with dual antiplatelet therapy',
    ],
    alternatives: [
      'Medical management with medications (aspirin, blood thinners, statins)',
      'Coronary artery bypass grafting (CABG) — open-heart surgery',
      'Continued monitoring without immediate intervention (if clinically appropriate)',
    ],
    patientRights: [
      'The right to ask questions and receive honest, understandable answers',
      'The right to withdraw consent before the procedure begins',
      'The right to know the qualifications and experience of the performing team',
      'The right to a second medical opinion before proceeding',
      'The right to be informed of any unexpected findings during the procedure',
    ],
  },
  appendectomy: {
    procedureOverview:
      'Laparoscopic appendectomy is a surgical procedure to remove the appendix using small incisions and a camera (laparoscope). It is the standard treatment for appendicitis. The procedure is performed under general anaesthesia and typically takes 30–60 minutes.',
    risks: [
      'Infection at the incision site or inside the abdomen',
      'Bleeding requiring further intervention',
      'Injury to nearby structures (bowel, bladder, blood vessels) in rare cases',
      'Conversion to open surgery if laparoscopic approach is not feasible',
      'Anaesthesia-related reactions',
      'Post-operative ileus (temporary bowel inactivity)',
    ],
    benefits: [
      'Definitive treatment for appendicitis, preventing rupture',
      'Faster recovery compared to open surgery (typically 1–3 days)',
      'Smaller scars and less post-operative pain',
      'Lower risk of wound complications',
    ],
    alternatives: [
      'Antibiotic therapy alone (may be appropriate for uncomplicated appendicitis)',
      'Open appendectomy (larger incision, appropriate in some cases)',
      'Watchful waiting — only in very specific, carefully selected cases',
    ],
    patientRights: [
      'The right to ask questions and receive honest, understandable answers',
      'The right to withdraw consent before the procedure begins',
      'The right to know the qualifications and experience of the surgeon',
      'The right to a second medical opinion before proceeding',
      'The right to understand the risks of not having the procedure',
    ],
  },
  'c-section': {
    procedureOverview:
      'A Caesarean section (C-section) is a surgical procedure in which a baby is delivered through an incision in the mother\'s abdomen and uterus. It is performed under regional anaesthesia (spinal or epidural) or, in emergencies, general anaesthesia. The procedure takes approximately 45–60 minutes.',
    risks: [
      'Increased blood loss compared to vaginal delivery',
      'Infection of the uterus, incision, or urinary tract',
      'Blood clots in the legs or lungs (deep vein thrombosis / pulmonary embolism)',
      'Injury to nearby organs (bladder, bowel) in rare cases',
      'Longer recovery time than vaginal birth',
      'Implications for future pregnancies (uterine rupture risk, placenta praevia)',
      'Anaesthesia-related reactions',
    ],
    benefits: [
      'Safe delivery when vaginal birth is not possible or carries high risk',
      'Controlled environment, reducing emergency complications',
      'Scheduled procedure timing in planned cases',
      'Avoids prolonged difficult labour in specific clinical scenarios',
    ],
    alternatives: [
      'Trial of vaginal birth, if clinically appropriate',
      'Assisted vaginal delivery (forceps or ventouse), where applicable',
    ],
    patientRights: [
      'The right to ask questions and receive honest, understandable answers',
      'The right to withdraw consent before the procedure begins',
      'The right to have a support person present where permitted',
      'The right to understand the indications and necessity of the procedure',
      'The right to detailed information about recovery and post-natal care',
    ],
  },
  cabg: {
    procedureOverview:
      'Coronary Artery Bypass Grafting (CABG) is open-heart surgery that creates new routes ("bypasses") around blocked coronary arteries to restore adequate blood flow to the heart muscle. Grafts are taken from veins in the leg or arteries in the chest or arm. The procedure is performed under general anaesthesia and typically takes 3–6 hours.',
    risks: [
      'Bleeding requiring re-operation',
      'Infection — wound, chest, or deep sternal wound infection',
      'Irregular heart rhythms (atrial fibrillation) post-operatively',
      'Stroke or cognitive changes (especially in older patients)',
      'Kidney impairment, particularly in patients with pre-existing kidney disease',
      'Prolonged need for mechanical ventilation',
      'Graft failure over time',
    ],
    benefits: [
      'Relief from chest pain (angina) in the vast majority of patients',
      'Improved survival in patients with severe multi-vessel disease',
      'Restoration of heart muscle function',
      'Potential to reduce or stop some cardiac medications',
      'Durable long-term results compared to stenting in complex disease',
    ],
    alternatives: [
      'Percutaneous Coronary Intervention (PCI / angioplasty with stents)',
      'Optimal medical therapy alone, in selected low-risk patients',
      'Watchful waiting — not appropriate for most CABG candidates',
    ],
    patientRights: [
      'The right to ask questions and receive honest, understandable answers',
      'The right to withdraw consent before the procedure begins',
      'The right to a second surgical opinion',
      'The right to understand the recovery timeline and rehabilitation plan',
      'The right to information about the cardiac surgical team\'s experience',
    ],
  },
}

function matchTemplate(procedureName: string): Omit<ConsentFormContent, 'declarationText'> {
  const lower = procedureName.toLowerCase()
  if (lower.includes('angioplasty') || lower.includes('pci') || lower.includes('stent') || lower.includes('coronary intervention')) {
    return PROCEDURE_TEMPLATES.angioplasty
  }
  if (lower.includes('appendect') || lower.includes('appendix')) {
    return PROCEDURE_TEMPLATES.appendectomy
  }
  if (lower.includes('caesarean') || lower.includes('cesarean') || lower.includes('c-section') || lower.includes('c section')) {
    return PROCEDURE_TEMPLATES['c-section']
  }
  if (lower.includes('bypass') || lower.includes('cabg') || lower.includes('grafting')) {
    return PROCEDURE_TEMPLATES.cabg
  }

  // Generic surgical consent fallback
  return {
    procedureOverview: `${procedureName} is a medical procedure recommended by your treating physician based on clinical assessment. The procedure will be carried out by qualified medical staff in a controlled hospital environment. You will receive appropriate anaesthesia as determined by the anaesthesiologist.`,
    risks: [
      'Bleeding or haematoma at the operative site',
      'Infection — superficial or deep',
      'Anaesthesia-related reactions (nausea, allergy, rare serious events)',
      'Injury to adjacent structures in rare cases',
      'Need for additional procedures or blood transfusion',
      'Slow wound healing, particularly in patients with diabetes or on steroids',
    ],
    benefits: [
      'Treatment of the underlying condition requiring the procedure',
      'Potential relief of symptoms and improvement in quality of life',
      'Prevention of complications from the untreated condition',
    ],
    alternatives: [
      'Medical (non-surgical) management where applicable',
      'Watchful waiting with regular monitoring — if clinically safe',
      'Transfer to a specialist centre for a second opinion',
    ],
    patientRights: [
      'The right to ask questions and receive honest, understandable answers',
      'The right to withdraw consent before the procedure begins',
      'The right to know the qualifications and experience of the performing team',
      'The right to a second medical opinion before proceeding',
      'The right to receive a copy of all medical records related to your care',
    ],
  }
}

export async function generateConsentForm(
  procedureName: string,
  patientName: string,
): Promise<AiEnvelope<ConsentFormContent>> {
  // Simulate async AI call (Phase-2: call real LLM with procedure context)
  await new Promise(r => setTimeout(r, 600))

  const template = matchTemplate(procedureName)

  const content: ConsentFormContent = {
    ...template,
    declarationText: `I, as the authorised next-of-kin / legal guardian of ${patientName}, hereby confirm that:\n\n1. I have read and fully understood the information provided above regarding the proposed procedure "${procedureName}".\n2. The procedure, its risks, benefits, and alternatives have been explained to me in a language I understand.\n3. I have had the opportunity to ask questions and am satisfied with the answers received.\n4. I give my free and informed consent for the above procedure to be performed on ${patientName}.\n5. I understand that I may withdraw this consent at any time before the procedure commences by notifying the attending physician.\n\nThis digital consent has been signed electronically and carries the same legal weight as a handwritten signature.`,
  }

  return wrapAiResponse<ConsentFormContent>(
    content,
    0.88,
    `Consent form generated for "${procedureName}" using procedure-specific clinical template. Patient: ${patientName}. Template matched based on procedure keyword analysis.`,
  )
}
