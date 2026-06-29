import { wrapAiResponse } from '@/lib/ai-helpers'
import type { AiEnvelope } from '@/types/ai'

export interface LabTrendItem {
  test: string
  onAdmission: string
  onDischarge: string
  trend: 'improving' | 'stable' | 'worsening'
}

export interface DischargeSummary {
  admissionId: string
  patientName: string
  admissionDate: string
  dischargeDate: string
  admittingDiagnosis: string
  dischargeDiagnosis: string
  treatmentSummary: string
  proceduresDone: string[]
  conditionAtDischarge: string
  dischargeMedications: Array<{ name: string; dose: string; duration: string }>
  followUpInstructions: string[]
  followUpDate: string
  warningSymptoms: string[]
  dietAdvice: string
  activityRestrictions: string
  // enriched ward/OT fields
  wardMedicationsAdministered: Array<{ name: string; route: string; daysGiven: number }>
  ivTherapyLog: Array<{ fluid: string; rate: string; totalVolume: string }>
  labTrends: LabTrendItem[]
  imagingFindings: string
  otNotes?: string
  bloodUnitsUsed?: number
  // patient communication
  patientFriendlySummary: string
  hindiSummary: string
}

export async function generateDischargeSummary(admissionId: string): Promise<AiEnvelope<DischargeSummary>> {
  await new Promise((r) => setTimeout(r, 700))
  return wrapAiResponse<DischargeSummary>(
    {
      admissionId,
      patientName: 'Kiran Patil',
      admissionDate: '2026-05-05',
      dischargeDate: '2026-05-09',
      admittingDiagnosis: 'Community Acquired Pneumonia (J18.9)',
      dischargeDiagnosis: 'Resolving Community Acquired Pneumonia with Diabetic Ketoacidosis',
      treatmentSummary: 'Patient admitted with productive cough, fever and SpO2 91%. Treated with IV antibiotics (Piperacillin-Tazobactam 4.5g Q8H × 3 days then step-down to oral Amoxiclav). DKA managed with IV insulin protocol and fluid resuscitation. Oxygen supplementation weaned over 36 hours.',
      proceduresDone: ['Chest X-ray (AP)', 'ABG × 3', 'IV line insertion', 'Nebulisation × 8 sessions'],
      conditionAtDischarge: 'Stable. Afebrile × 48hrs. SpO2 97% RA. Tolerating oral feed. Blood glucose controlled.',
      dischargeMedications: [
        { name: 'Amoxicillin-Clavulanate 625mg', dose: 'TID', duration: '5 days' },
        { name: 'Metformin 500mg', dose: 'BD', duration: 'Ongoing — HOLD if GFR falls' },
        { name: 'Amlodipine 5mg', dose: 'OD', duration: 'Ongoing' },
        { name: 'Salbutamol inhaler', dose: '2 puffs Q6H PRN', duration: '7 days then review' },
      ],
      followUpInstructions: ['Pulmonology OPD in 2 weeks', 'Endocrinology review for HbA1c in 3 months', 'Repeat X-ray chest at 6 weeks'],
      followUpDate: '2026-05-23',
      warningSymptoms: ['Return immediately if fever >38.5°C', 'Worsening breathlessness', 'Inability to take oral medications', 'Blood glucose <70 or >300 mg/dL'],
      dietAdvice: 'Diabetic diet. Limit carbohydrates. Small frequent meals. Avoid sugary drinks.',
      activityRestrictions: 'Avoid strenuous activity for 2 weeks. Bed rest as needed. Graded return to normal activity.',
      // enriched fields
      wardMedicationsAdministered: [
        { name: 'Piperacillin-Tazobactam 4.5g (IV)', route: 'IV', daysGiven: 3 },
        { name: 'Regular Insulin (IV infusion)', route: 'IV', daysGiven: 2 },
        { name: 'Salbutamol nebulisation', route: 'Inhaled', daysGiven: 4 },
        { name: 'Paracetamol 1g (IV)', route: 'IV', daysGiven: 2 },
        { name: 'Pantoprazole 40mg (IV)', route: 'IV', daysGiven: 4 },
        { name: 'Metformin 500mg (Oral)', route: 'Oral', daysGiven: 2 },
      ],
      ivTherapyLog: [
        { fluid: 'Normal Saline 0.9%', rate: '125 ml/hr', totalVolume: '3000 ml' },
        { fluid: 'Ringer Lactate', rate: '80 ml/hr', totalVolume: '1600 ml' },
        { fluid: 'Potassium Chloride 20 mEq additive', rate: 'In NS', totalVolume: '2 bags' },
      ],
      labTrends: [
        { test: 'Blood Glucose (mg/dL)', onAdmission: '388', onDischarge: '142', trend: 'improving' },
        { test: 'WBC count (×10³/µL)', onAdmission: '14.2', onDischarge: '8.1', trend: 'improving' },
        { test: 'HbA1c (%)', onAdmission: '9.8', onDischarge: '9.8', trend: 'stable' },
        { test: 'SpO2 (%)', onAdmission: '91', onDischarge: '97', trend: 'improving' },
        { test: 'Serum Creatinine (mg/dL)', onAdmission: '1.4', onDischarge: '1.1', trend: 'improving' },
      ],
      imagingFindings: 'CXR AP on admission: Right lower lobe consolidation consistent with pneumonia. CXR on day 4: Partial resolution of consolidation with residual haziness. Follow-up X-ray advised at 6 weeks.',
      otNotes: undefined,
      bloodUnitsUsed: 0,
      patientFriendlySummary: `Dear Kiran,

You came to Agentix HIMS on 5th May 2026 with fever, cough, and difficulty breathing. The doctors found an infection in your lungs (pneumonia) along with high blood sugar (sugar crisis/DKA).

WHAT WE DID:
• We gave you strong medicines through a drip to fight the lung infection.
• We controlled your blood sugar with insulin through a drip.
• We gave you breathing exercises and a nebuliser to open your airways.
• You are now stable, breathing normally, and your sugar is under control.

YOUR MEDICINES AT HOME:
• Amoxicillin-Clavulanate (antibiotic tablet) — 3 times a day for 5 days
• Metformin (diabetes tablet) — 2 times a day (do not take if you have vomiting or kidney problems)
• Amlodipine (blood pressure tablet) — 1 tablet every morning
• Salbutamol inhaler — 2 puffs every 6 hours when needed

PLEASE COME BACK TO THE DOCTOR IF:
• Fever goes above 38.5°C again
• Breathing becomes difficult again
• You cannot take your medicines due to vomiting
• Your blood sugar reading is below 70 or above 300

YOUR NEXT DOCTOR'S VISIT: 23rd May 2026

Stay well. Take your medicines on time. Eat small, healthy meals.`,
      hindiSummary: `प्रिय किरण,

आप 5 मई 2026 को कैलाश अस्पताल में बुखार, खांसी और सांस लेने में तकलीफ के साथ आए थे। डॉक्टरों को आपके फेफड़ों में संक्रमण (न्यूमोनिया) और अधिक रक्त शर्करा (DKA) मिली।

हमने क्या किया:
• ड्रिप के माध्यम से फेफड़ों के संक्रमण के लिए मजबूत दवाएं दीं।
• इंसुलिन ड्रिप से रक्त शर्करा नियंत्रित की।
• आपको सांस लेने के व्यायाम और नेब्युलाइजर दिया।
• आप अब स्थिर हैं और सामान्य रूप से सांस ले रहे हैं।

घर पर लेने वाली दवाएं:
• एमोक्सिसिलिन-क्लेवुलनेट (एंटीबायोटिक) — दिन में 3 बार, 5 दिन तक
• मेटफॉर्मिन (डायबिटीज की गोली) — दिन में 2 बार
• अम्लोडिपिन (बीपी की गोली) — सुबह 1 गोली
• साल्बुटामोल इनहेलर — जरूरत पर हर 6 घंटे में 2 पफ

तुरंत वापस आएं यदि:
• बुखार 38.5°C से ऊपर जाए
• सांस लेने में फिर से परेशानी हो
• उल्टी के कारण दवा न ले पाएं
• ब्लड शुगर 70 से नीचे या 300 से ऊपर हो

अगला डॉक्टर दर्शन: 23 मई 2026`,
    },
    0.87,
    'Summary compiled from admission notes, nursing documentation, medication administration records, IV therapy log, lab result trends, and imaging reports.'
  )
}
