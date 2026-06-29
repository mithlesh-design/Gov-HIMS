import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// Doctor's orders for the logged-in patient — the tests and medicines a
// doctor prescribes during/after the consultation. Front-end simulation
// today; in production these arrive as real-time events from the doctor's
// consultation screen. The patient has full agency: accept, reduce the
// quantity (for things they partly already have), or skip with a reason —
// and pays only for what they keep.

export type OrderKind = 'test' | 'medicine'
export type OrderStatus = 'accepted' | 'skipped'
export type SkipReason = 'have_it' | 'cant_afford' | 'ask_doctor' | 'other'

export const SKIP_REASONS: { id: SkipReason; label: string }[] = [
  { id: 'have_it',    label: 'I already have this' },
  { id: 'cant_afford', label: 'Cost concern' },
  { id: 'ask_doctor', label: 'Want to discuss with my doctor' },
  { id: 'other',      label: 'Other reason' },
]

export const SKIP_REASON_LABEL: Record<SkipReason, string> = Object.fromEntries(
  SKIP_REASONS.map(r => [r.id, r.label]),
) as Record<SkipReason, string>

export interface OrderItem {
  id: string
  kind: OrderKind
  name: string
  detail: string                       // dosage/frequency for meds; prep for tests
  dept?: 'Pathology' | 'Radiology'     // where a test's result will surface
  unitPrice: number                    // per test, or per tablet for medicines
  perDay?: number                      // medicines only — tablets/day (stepper step)
  defaultQty: number                   // quantity the doctor ordered
  qty: number                          // quantity the patient has chosen to keep
  status: OrderStatus
  skipReason?: SkipReason
  clinicalNote: string                 // plain-language reason the doctor ordered it
  important?: boolean                  // skipping notifies the doctor for sign-off
}

function seed(): OrderItem[] {
  return [
    { id: 't1', kind: 'test', name: 'Complete Blood Count (CBC)', detail: 'Blood sample · result same day', dept: 'Pathology', unitPrice: 350, defaultQty: 1, qty: 1, status: 'accepted', clinicalNote: 'Baseline check for your fever and fatigue' },
    { id: 't2', kind: 'test', name: 'HbA1c (3-month sugar)', detail: 'Blood sample · result next day', dept: 'Pathology', unitPrice: 450, defaultQty: 1, qty: 1, status: 'accepted', clinicalNote: 'Monitor your blood-sugar control', important: true },
    { id: 't3', kind: 'test', name: 'Chest X-ray (PA view)', detail: 'Imaging · about 10 min', dept: 'Radiology', unitPrice: 500, defaultQty: 1, qty: 1, status: 'accepted', clinicalNote: 'Rule out a chest infection' },
    { id: 'm1', kind: 'medicine', name: 'Metformin 500mg', detail: '1-0-1 after food · 15 days', unitPrice: 3, perDay: 2, defaultQty: 30, qty: 30, status: 'accepted', clinicalNote: 'Controls your blood sugar', important: true },
    { id: 'm2', kind: 'medicine', name: 'Amlodipine 5mg', detail: '1-0-0 before breakfast · 30 days', unitPrice: 6, perDay: 1, defaultQty: 30, qty: 30, status: 'accepted', clinicalNote: 'Controls your blood pressure' },
    { id: 'm3', kind: 'medicine', name: 'Cetirizine 10mg', detail: '0-0-1 at night · 10 days', unitPrice: 6, perDay: 1, defaultQty: 10, qty: 10, status: 'accepted', clinicalNote: 'Eases your allergy symptoms' },
  ]
}

// ---- Pure derivations (shared across the orders page, dashboard & bills) ----
export const acceptedItems = (items: OrderItem[]) => items.filter(i => i.status === 'accepted')
export const skippedItems = (items: OrderItem[]) => items.filter(i => i.status === 'skipped')
export const lineTotal = (i: OrderItem) => i.unitPrice * i.qty
export const orderTotal = (items: OrderItem[]) => acceptedItems(items).reduce((s, i) => s + lineTotal(i), 0)
export const wasReduced = (i: OrderItem) => i.status === 'accepted' && i.qty < i.defaultQty

interface OrdersState {
  received: boolean
  receivedAt: number | null
  doctor: string
  paid: boolean
  paidAt: number | null
  items: OrderItem[]
  receiveOrders: () => void
  accept: (id: string) => void
  setQty: (id: string, qty: number) => void
  skip: (id: string, reason: SkipReason) => void
  payNow: () => void
  reset: () => void
}

export const usePatientOrdersStore = create<OrdersState>()(persist((set, get) => ({
  received: false,
  receivedAt: null,
  doctor: 'Dr. Priya Nair',
  paid: false,
  paidAt: null,
  items: seed(),

  // Idempotent — marks the orders as arrived without discarding patient edits.
  receiveOrders: () => set(s => (s.received ? s : { received: true, receivedAt: Date.now() })),

  accept: (id) => set(s => ({
    items: s.items.map(i => i.id === id ? { ...i, status: 'accepted', skipReason: undefined } : i),
  })),

  setQty: (id, qty) => set(s => ({
    items: s.items.map(i => {
      if (i.id !== id) return i
      const step = i.perDay ?? 1
      const clamped = Math.max(step, Math.min(i.defaultQty, Math.round(qty / step) * step))
      return { ...i, qty: clamped, status: 'accepted', skipReason: undefined }
    }),
  })),

  skip: (id, reason) => set(s => ({
    items: s.items.map(i => i.id === id ? { ...i, status: 'skipped', skipReason: reason } : i),
  })),

  payNow: () => set({ paid: true, paidAt: Date.now() }),

  reset: () => set({ received: false, receivedAt: null, paid: false, paidAt: null, items: seed() }),
}),
  {
    name: 'agentix-patientordersstore', version: 1,
    storage: createJSONStorage(() => localStorage),
    skipHydration: true,
  },
))
