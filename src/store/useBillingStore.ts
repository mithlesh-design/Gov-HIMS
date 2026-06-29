import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useAuditStore } from './useAuditStore'

export type ChargeType = 'consultation' | 'lab' | 'radiology' | 'pharmacy' | 'ward' | 'procedure' | 'consumable' | 'nursing' | 'ot'

export type ChargeLineItem = {
  id: string
  patientId: string
  type: ChargeType
  description: string
  amount: number
  quantity: number
  date: string
  source: string
  isNonPayable?: boolean
}

export type BillStatus = 'draft' | 'frozen' | 'settled' | 'dispute'

export type Bill = {
  id: string
  patientId: string
  patientName: string
  visitType: 'OPD' | 'IPD' | 'Emergency' | 'Day Care'
  admissionDate?: string
  dischargeDate?: string
  subtotal: number
  discounts: number
  nonPayables: number
  insuranceCovered: number
  patientDue: number
  status: BillStatus
  payerType: string
  paymentMode?: 'Cash' | 'UPI' | 'Card' | 'Insurance'
  paidAmount: number
  receiptNumber?: string
}

// AI duplicate-charge alert returned from detectDuplicates().
export type DuplicateAlert = {
  groupKey: string
  description: string
  ids: string[]
  totalAmount: number
  reason: string
}

interface BillingState {
  bills: Bill[]
  lineItems: ChargeLineItem[]
  addCharge: (charge: Omit<ChargeLineItem, 'id'>, actorName?: string) => void
  freezeBill: (billId: string, actorName?: string) => void
  applyInsuranceCoverage: (billId: string, amount: number, actorName?: string) => void
  recordPayment: (billId: string, amount: number, mode: Bill['paymentMode'], actorName?: string) => void
  getBillForPatient: (patientId: string) => Bill | undefined
  getItemsForPatient: (patientId: string) => ChargeLineItem[]
  // AI: same description + same date for a patient = potential duplicate.
  detectDuplicates: (patientId: string) => DuplicateAlert[]
}

const MOCK_BILLS: Bill[] = [
  {
    id: 'BILL-2024-001',
    patientId: 'PT-10203',
    patientName: 'Mohan Lal',
    visitType: 'IPD',
    admissionDate: new Date(Date.now() - 4 * 24 * 3600000).toISOString(),
    subtotal: 42500,
    discounts: 0,
    nonPayables: 1200,
    insuranceCovered: 38000,
    patientDue: 4500,
    status: 'draft',
    payerType: 'Cashless (Star Health)',
    paidAmount: 0,
  },
  {
    id: 'BILL-2024-002',
    patientId: 'PT-10202',
    patientName: 'Priya Sharma',
    visitType: 'IPD',
    admissionDate: new Date(Date.now() - 3 * 24 * 3600000).toISOString(),
    subtotal: 28000,
    discounts: 2000,
    nonPayables: 500,
    insuranceCovered: 0,
    patientDue: 25500,
    status: 'draft',
    payerType: 'General (Cash)',
    paidAmount: 10000,
  },
  {
    id: 'BILL-2024-003',
    patientId: 'PT-10234',
    patientName: 'Aarav Sharma',
    visitType: 'OPD',
    subtotal: 1800,
    discounts: 0,
    nonPayables: 0,
    insuranceCovered: 0,
    patientDue: 1800,
    status: 'draft',
    payerType: 'General',
    paidAmount: 0,
  },
]

const MOCK_LINE_ITEMS: ChargeLineItem[] = [
  { id: 'CI-001', patientId: 'PT-10203', type: 'ward', description: 'Semi-Private Room (4 days)', amount: 12000, quantity: 4, date: new Date(Date.now() - 3 * 24 * 3600000).toISOString(), source: 'Ward' },
  { id: 'CI-002', patientId: 'PT-10203', type: 'nursing', description: 'Nursing Charges (4 days)', amount: 4000, quantity: 4, date: new Date(Date.now() - 3 * 24 * 3600000).toISOString(), source: 'Nursing' },
  { id: 'CI-003', patientId: 'PT-10203', type: 'consultation', description: 'Physician Consultation', amount: 1500, quantity: 1, date: new Date(Date.now() - 4 * 24 * 3600000).toISOString(), source: 'OPD' },
  { id: 'CI-004', patientId: 'PT-10203', type: 'lab', description: 'HbA1c', amount: 800, quantity: 1, date: new Date(Date.now() - 3 * 24 * 3600000).toISOString(), source: 'Lab' },
  { id: 'CI-005', patientId: 'PT-10203', type: 'lab', description: 'Renal Function Test (RFT)', amount: 600, quantity: 1, date: new Date(Date.now() - 3 * 24 * 3600000).toISOString(), source: 'Lab' },
  { id: 'CI-006', patientId: 'PT-10203', type: 'pharmacy', description: 'Insulin (Lantus 10mL)', amount: 2200, quantity: 2, date: new Date(Date.now() - 2 * 24 * 3600000).toISOString(), source: 'Pharmacy' },
  { id: 'CI-007', patientId: 'PT-10203', type: 'pharmacy', description: 'IV Fluids & Consumables', amount: 1800, quantity: 1, date: new Date(Date.now() - 2 * 24 * 3600000).toISOString(), source: 'Pharmacy', isNonPayable: false },
  { id: 'CI-008', patientId: 'PT-10203', type: 'consumable', description: 'Gloves, syringes (non-payable)', amount: 1200, quantity: 1, date: new Date(Date.now() - 1 * 24 * 3600000).toISOString(), source: 'Nursing', isNonPayable: true },

  { id: 'CI-010', patientId: 'PT-10202', type: 'ward', description: 'General Ward (3 days)', amount: 6000, quantity: 3, date: new Date(Date.now() - 2 * 24 * 3600000).toISOString(), source: 'Ward' },
  { id: 'CI-011', patientId: 'PT-10202', type: 'procedure', description: 'Laparoscopic Appendectomy', amount: 18000, quantity: 1, date: new Date(Date.now() - 3 * 24 * 3600000).toISOString(), source: 'OT' },
  { id: 'CI-012', patientId: 'PT-10202', type: 'lab', description: 'Pre-op CBC & LFT Panel', amount: 1400, quantity: 1, date: new Date(Date.now() - 3 * 24 * 3600000).toISOString(), source: 'Lab' },
  { id: 'CI-013', patientId: 'PT-10202', type: 'pharmacy', description: 'Antibiotics (3 days)', amount: 900, quantity: 3, date: new Date(Date.now() - 2 * 24 * 3600000).toISOString(), source: 'Pharmacy' },

  { id: 'CI-020', patientId: 'PT-10234', type: 'consultation', description: 'OPD Consultation', amount: 500, quantity: 1, date: new Date().toISOString(), source: 'OPD' },
  { id: 'CI-021', patientId: 'PT-10234', type: 'lab', description: 'Complete Blood Count (CBC)', amount: 400, quantity: 1, date: new Date().toISOString(), source: 'Lab' },
  { id: 'CI-022', patientId: 'PT-10234', type: 'pharmacy', description: 'Prescription Medicines', amount: 900, quantity: 1, date: new Date().toISOString(), source: 'Pharmacy' },

  // Kiran Patil — NSTEMI post-PCI, 3-day IPD stay
  { id: 'CI-030', patientId: 'PT-20394', type: 'ward',         description: 'ICU bed (2 days)',                          amount: 18000, quantity: 2, date: new Date(Date.now() - 3 * 86400000).toISOString(), source: 'ICU' },
  { id: 'CI-031', patientId: 'PT-20394', type: 'ward',         description: 'Cardiac ward (1 day)',                      amount: 4500,  quantity: 1, date: new Date(Date.now() - 1 * 86400000).toISOString(), source: 'Ward' },
  { id: 'CI-032', patientId: 'PT-20394', type: 'procedure',    description: 'PCI with drug-eluting stent (LAD)',          amount: 145000, quantity: 1, date: new Date(Date.now() - 3 * 86400000).toISOString(), source: 'Cath Lab' },
  { id: 'CI-033', patientId: 'PT-20394', type: 'consumable',   description: 'Drug-eluting stent (BIS-approved batch)',    amount: 60000, quantity: 1, date: new Date(Date.now() - 3 * 86400000).toISOString(), source: 'Cath Lab' },
  { id: 'CI-034', patientId: 'PT-20394', type: 'lab',          description: 'Troponin I (serial)',                        amount: 1200,  quantity: 3, date: new Date(Date.now() - 3 * 86400000).toISOString(), source: 'Lab' },
  { id: 'CI-035', patientId: 'PT-20394', type: 'radiology',    description: 'X-Ray Chest PA/Lateral',                    amount: 600,   quantity: 1, date: new Date(Date.now() - 3 * 86400000).toISOString(), source: 'Radiology' },
  { id: 'CI-036', patientId: 'PT-20394', type: 'pharmacy',     description: 'Aspirin + Clopidogrel + Atorvastatin (TTO)', amount: 3200,  quantity: 1, date: new Date(Date.now() - 1 * 86400000).toISOString(), source: 'Pharmacy' },
  { id: 'CI-037', patientId: 'PT-20394', type: 'consultation', description: 'Cardiology rounds (3 days)',                amount: 1500,  quantity: 3, date: new Date(Date.now() - 2 * 86400000).toISOString(), source: 'Cardiology' },
  { id: 'CI-038', patientId: 'PT-20394', type: 'nursing',      description: 'ICU nursing (2 days)',                       amount: 3500,  quantity: 2, date: new Date(Date.now() - 3 * 86400000).toISOString(), source: 'Nursing' },
]

const KIRAN_BILL: Bill = {
  id: 'BILL-2026-KP1',
  patientId: 'PT-20394',
  patientName: 'Kiran Patil',
  visitType: 'IPD',
  admissionDate: new Date(Date.now() - 3 * 86400000).toISOString(),
  dischargeDate: undefined,
  subtotal: 248500,
  discounts: 0,
  nonPayables: 0,
  insuranceCovered: 0,
  patientDue: 248500,
  status: 'draft',
  payerType: 'Cashless (HDFC ERGO)',
  paidAmount: 0,
}
MOCK_BILLS.push(KIRAN_BILL)

export const useBillingStore = create<BillingState>()(persist((set, get) => ({
  bills: MOCK_BILLS,
  lineItems: MOCK_LINE_ITEMS,

  addCharge: (charge, actorName) => {
    set((s) => ({
      lineItems: [...s.lineItems, { ...charge, id: `CI-${Date.now()}` }],
      bills: s.bills.map(b => {
        if (b.patientId !== charge.patientId) return b
        const addedAmt = charge.amount * charge.quantity
        return { ...b, subtotal: b.subtotal + addedAmt, patientDue: b.patientDue + addedAmt - (charge.isNonPayable ? addedAmt : 0) }
      }),
    }))
    useAuditStore.getState().log({
      userId: 'BL-2001', userName: actorName ?? 'Billing Officer',
      action: 'billing_charge',
      resource: 'charge_line_item', resourceId: charge.patientId,
      detail: `${charge.type} · ${charge.description} · ₹${(charge.amount * charge.quantity).toLocaleString('en-IN')}`,
    })
  },

  freezeBill: (billId, actorName) => {
    const bill = get().bills.find(b => b.id === billId)
    set((s) => ({
      bills: s.bills.map(b => b.id === billId ? { ...b, status: 'frozen' } : b),
    }))
    if (bill) {
      useAuditStore.getState().log({
        userId: 'BL-2001', userName: actorName ?? 'Billing Officer',
        action: 'billing_charge',
        resource: 'bill', resourceId: billId,
        detail: `Bill frozen for ${bill.patientName} (${bill.patientId}) · ₹${bill.subtotal.toLocaleString('en-IN')}`,
      })
    }
  },

  applyInsuranceCoverage: (billId, amount, actorName) => {
    const bill = get().bills.find(b => b.id === billId)
    set((s) => ({
      bills: s.bills.map(b =>
        b.id === billId ? { ...b, insuranceCovered: amount, patientDue: Math.max(0, b.subtotal - b.discounts - b.nonPayables - amount) } : b
      ),
    }))
    if (bill) {
      useAuditStore.getState().log({
        userId: 'BL-2001', userName: actorName ?? 'Billing Officer',
        action: 'billing_charge',
        resource: 'bill', resourceId: billId,
        detail: `Insurance coverage applied · ₹${amount.toLocaleString('en-IN')} · ${bill.payerType}`,
      })
    }
  },

  recordPayment: (billId, amount, mode, actorName) => {
    const bill = get().bills.find(b => b.id === billId)
    set((s) => ({
      bills: s.bills.map(b => {
        if (b.id !== billId) return b
        const newPaid = b.paidAmount + amount
        return { ...b, paidAmount: newPaid, paymentMode: mode, status: newPaid >= b.patientDue ? 'settled' : b.status, receiptNumber: `RCT-${Date.now()}` }
      }),
    }))
    if (bill) {
      useAuditStore.getState().log({
        userId: 'BL-2001', userName: actorName ?? 'Billing Officer',
        action: 'billing_charge',
        resource: 'bill', resourceId: billId,
        detail: `Payment received · ₹${amount.toLocaleString('en-IN')} via ${mode} · ${bill.patientName}`,
      })
    }
  },

  getBillForPatient: (patientId) => get().bills.find(b => b.patientId === patientId),
  getItemsForPatient: (patientId) => get().lineItems.filter(i => i.patientId === patientId),

  // Group line items by description + date prefix; flag any group with >1 entry
  // unless explicitly marked as a recurring charge (ward / nursing / consultation).
  detectDuplicates: (patientId) => {
    const items = get().lineItems.filter(i => i.patientId === patientId)
    const RECURRING: ChargeLineItem['type'][] = ['ward', 'nursing', 'consultation']
    const groups = new Map<string, ChargeLineItem[]>()
    for (const i of items) {
      if (RECURRING.includes(i.type)) continue
      const dayKey = i.date.slice(0, 10)
      const key = `${i.type}::${i.description.toLowerCase().trim()}::${dayKey}`
      const list = groups.get(key) ?? []
      list.push(i)
      groups.set(key, list)
    }
    const alerts: DuplicateAlert[] = []
    for (const [key, list] of groups) {
      if (list.length > 1) {
        const totalAmount = list.reduce((s, x) => s + x.amount * x.quantity, 0)
        alerts.push({
          groupKey: key,
          description: list[0]!.description,
          ids: list.map(x => x.id),
          totalAmount,
          reason: `${list.length} identical ${list[0]!.type} entries on same day`,
        })
      }
    }
    return alerts
  },
}),
  {
    name: 'agentix-billingstore', version: 1,
    storage: createJSONStorage(() => localStorage),
    skipHydration: true,
  },
))
