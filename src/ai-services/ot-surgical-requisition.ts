import { wrapAiResponse } from '@/lib/ai-helpers'
import type { AiEnvelope } from '@/types/ai'

export interface SurgicalRequisitionItem {
  category: 'medicine' | 'iv_fluid' | 'consumable' | 'instrument' | 'implant'
  name: string
  quantity: number
  unit: string
  notes?: string
  destination: 'pharmacy' | 'cssd' | 'inventory'
}

export interface SurgicalRequisition {
  procedureId: string
  procedureName: string
  surgeon: string
  scheduledTime: string
  requiredBy: string  // ISO string — 1 hour before surgery
  medicines: SurgicalRequisitionItem[]
  ivFluids: SurgicalRequisitionItem[]
  consumables: SurgicalRequisitionItem[]
  instruments: SurgicalRequisitionItem[]
  totalPharmacyItems: number
  totalCssdItems: number
  totalInventoryItems: number
}

const PROCEDURE_REQUISITIONS: Record<string, Partial<SurgicalRequisition>> = {
  'total knee replacement': {
    medicines: [
      { category: 'medicine', name: 'Cefazolin 1g (IV)', quantity: 3, unit: 'vial', notes: 'Pre-op prophylaxis + 2 intra-op doses', destination: 'pharmacy' },
      { category: 'medicine', name: 'Tranexamic Acid 1g (IV)', quantity: 2, unit: 'vial', notes: 'Intra-op blood conservation', destination: 'pharmacy' },
      { category: 'medicine', name: 'Morphine 10mg (IM)', quantity: 2, unit: 'ampoule', notes: 'Post-op analgesia PRN', destination: 'pharmacy' },
      { category: 'medicine', name: 'Ondansetron 4mg (IV)', quantity: 3, unit: 'ampoule', notes: 'Antiemetic', destination: 'pharmacy' },
    ],
    ivFluids: [
      { category: 'iv_fluid', name: 'Normal Saline 0.9% (500ml)', quantity: 4, unit: 'bag', destination: 'pharmacy' },
      { category: 'iv_fluid', name: 'Ringer Lactate (500ml)', quantity: 2, unit: 'bag', destination: 'pharmacy' },
    ],
    consumables: [
      { category: 'consumable', name: 'Surgical Gloves (Size 7)', quantity: 10, unit: 'pair', destination: 'inventory' },
      { category: 'consumable', name: 'Sterile Drapes (Full set)', quantity: 1, unit: 'set', destination: 'cssd' },
      { category: 'consumable', name: 'Cautery Electrode', quantity: 2, unit: 'piece', destination: 'inventory' },
      { category: 'consumable', name: 'Sutures — Vicryl 1-0', quantity: 4, unit: 'pack', destination: 'inventory' },
      { category: 'consumable', name: 'Sutures — Ethilon 2-0', quantity: 2, unit: 'pack', destination: 'inventory' },
      { category: 'consumable', name: 'Bone Cement (Simplex P)', quantity: 2, unit: 'kit', destination: 'inventory' },
      { category: 'consumable', name: 'Tourniquet Cuff', quantity: 1, unit: 'piece', destination: 'inventory' },
    ],
    instruments: [
      { category: 'instrument', name: 'TKR Instrument Set (Standard)', quantity: 1, unit: 'set', notes: 'Confirm sterilization', destination: 'cssd' },
      { category: 'instrument', name: 'Oscillating Saw', quantity: 1, unit: 'piece', destination: 'cssd' },
      { category: 'instrument', name: 'Pulse Lavage System', quantity: 1, unit: 'set', destination: 'cssd' },
    ],
  },
  'laparoscopic cholecystectomy': {
    medicines: [
      { category: 'medicine', name: 'Cefazolin 1g (IV)', quantity: 2, unit: 'vial', notes: 'Pre-op prophylaxis', destination: 'pharmacy' },
      { category: 'medicine', name: 'Propofol 200mg (IV)', quantity: 2, unit: 'vial', notes: 'Induction agent', destination: 'pharmacy' },
      { category: 'medicine', name: 'Fentanyl 100mcg (IV)', quantity: 3, unit: 'ampoule', notes: 'Intra-op analgesia', destination: 'pharmacy' },
      { category: 'medicine', name: 'Neostigmine 2.5mg (IV)', quantity: 1, unit: 'ampoule', notes: 'Reversal agent', destination: 'pharmacy' },
    ],
    ivFluids: [
      { category: 'iv_fluid', name: 'Normal Saline 0.9% (500ml)', quantity: 2, unit: 'bag', destination: 'pharmacy' },
      { category: 'iv_fluid', name: 'CO2 Gas for Insufflation', quantity: 1, unit: 'cylinder', notes: 'Laparoscopy insufflation', destination: 'inventory' },
    ],
    consumables: [
      { category: 'consumable', name: 'Trocar Set (5mm × 3, 10mm × 1)', quantity: 1, unit: 'set', destination: 'inventory' },
      { category: 'consumable', name: 'Clip Applier (Hem-o-lok)', quantity: 1, unit: 'unit', destination: 'inventory' },
      { category: 'consumable', name: 'Endo Bag', quantity: 2, unit: 'piece', destination: 'inventory' },
    ],
    instruments: [
      { category: 'instrument', name: 'Laparoscope (30°, 10mm)', quantity: 1, unit: 'piece', destination: 'cssd' },
      { category: 'instrument', name: 'Laparoscopic Grasper Set', quantity: 1, unit: 'set', destination: 'cssd' },
    ],
  },
  'turp': {
    medicines: [
      { category: 'medicine', name: 'Ciprofloxacin 400mg (IV)', quantity: 1, unit: 'vial', notes: 'Pre-op prophylaxis', destination: 'pharmacy' },
      { category: 'medicine', name: 'Spinal anaesthetic (Bupivacaine 0.5% heavy 3ml)', quantity: 1, unit: 'ampoule', destination: 'pharmacy' },
      { category: 'medicine', name: 'Oxytocin 10 IU (IM)', quantity: 2, unit: 'ampoule', notes: 'Haemostasis', destination: 'pharmacy' },
    ],
    ivFluids: [
      { category: 'iv_fluid', name: 'Glycine 1.5% Irrigation (3L)', quantity: 6, unit: 'bag', notes: 'TURP irrigation fluid', destination: 'pharmacy' },
      { category: 'iv_fluid', name: 'Normal Saline 0.9% (500ml)', quantity: 2, unit: 'bag', destination: 'pharmacy' },
    ],
    consumables: [
      { category: 'consumable', name: 'Resectoscope Sheath (26Fr)', quantity: 1, unit: 'set', destination: 'cssd' },
      { category: 'consumable', name: 'Diathermy Loop Electrode', quantity: 3, unit: 'piece', destination: 'inventory' },
      { category: 'consumable', name: 'Foley Catheter (22Fr 3-way)', quantity: 2, unit: 'piece', destination: 'inventory' },
    ],
    instruments: [
      { category: 'instrument', name: 'TURP Instrument Set', quantity: 1, unit: 'set', destination: 'cssd' },
      { category: 'instrument', name: 'Cystoscope (flexible)', quantity: 1, unit: 'piece', destination: 'cssd' },
    ],
  },
}

function getRequisitionTemplate(procedureName: string): Partial<SurgicalRequisition> {
  const normalized = procedureName.toLowerCase()
  for (const [key, data] of Object.entries(PROCEDURE_REQUISITIONS)) {
    if (normalized.includes(key)) return data
  }
  // Generic fallback
  return {
    medicines: [
      { category: 'medicine', name: 'Cefazolin 1g (IV)', quantity: 2, unit: 'vial', notes: 'Pre-op prophylaxis', destination: 'pharmacy' },
      { category: 'medicine', name: 'Ondansetron 4mg (IV)', quantity: 2, unit: 'ampoule', destination: 'pharmacy' },
    ],
    ivFluids: [
      { category: 'iv_fluid', name: 'Normal Saline 0.9% (500ml)', quantity: 3, unit: 'bag', destination: 'pharmacy' },
    ],
    consumables: [
      { category: 'consumable', name: 'Surgical Gloves (appropriate size)', quantity: 6, unit: 'pair', destination: 'inventory' },
      { category: 'consumable', name: 'Sterile Drapes', quantity: 1, unit: 'set', destination: 'cssd' },
      { category: 'consumable', name: 'Sutures (assorted)', quantity: 4, unit: 'pack', destination: 'inventory' },
    ],
    instruments: [
      { category: 'instrument', name: 'General Surgery Set', quantity: 1, unit: 'set', destination: 'cssd' },
    ],
  }
}

export async function generateSurgicalRequisition(
  procedureId: string,
  procedureName: string,
  surgeon: string,
  scheduledTime: string
): Promise<AiEnvelope<SurgicalRequisition>> {
  await new Promise(r => setTimeout(r, 900))

  const template = getRequisitionTemplate(procedureName)
  const allItems = [
    ...(template.medicines ?? []),
    ...(template.ivFluids ?? []),
    ...(template.consumables ?? []),
    ...(template.instruments ?? []),
  ]

  const requiredByDate = new Date()
  requiredByDate.setHours(requiredByDate.getHours() + 1)

  const data: SurgicalRequisition = {
    procedureId,
    procedureName,
    surgeon,
    scheduledTime,
    requiredBy: requiredByDate.toISOString(),
    medicines: template.medicines ?? [],
    ivFluids: template.ivFluids ?? [],
    consumables: template.consumables ?? [],
    instruments: template.instruments ?? [],
    totalPharmacyItems: allItems.filter(i => i.destination === 'pharmacy').length,
    totalCssdItems: allItems.filter(i => i.destination === 'cssd').length,
    totalInventoryItems: allItems.filter(i => i.destination === 'inventory').length,
  }

  return wrapAiResponse<SurgicalRequisition>(
    data,
    0.91,
    `Requisition generated based on standard protocol for ${procedureName}. All quantities are evidence-based estimates — please review and adjust for patient-specific factors before dispatching.`
  )
}
