import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useAuditStore } from './useAuditStore'

// ─────────────────────────────────────────────────────────────────────────
// Admin v2 / Phase 5 / M5.5 — Vendor Master + Invoices + Payments
//
// Tracks every supplier the hospital pays:
//   • BMW disposal vendors
//   • Medical gas (O2, N2O) suppliers
//   • Equipment AMC contracts (CT, MRI, ventilators)
//   • Food / catering vendor
//   • Security agency
//   • IT / SaaS subscriptions
//   • Pharmaceutical distributors
//   • Linen / laundry
//
// Each vendor carries contract value + MoU expiry. Each invoice carries
// due-date + payment status. Every mutation audits to the IMS chapter.
// ─────────────────────────────────────────────────────────────────────────

export type VendorCategory =
  | 'bmw' | 'medical_gas' | 'amc' | 'food' | 'security'
  | 'it' | 'pharma' | 'linen' | 'consumables' | 'utilities' | 'other'

export type InvoiceStatus = 'open' | 'approved' | 'paid' | 'disputed' | 'overdue'

export const CATEGORY_LABEL: Record<VendorCategory, string> = {
  bmw:          'Biomedical Waste',
  medical_gas:  'Medical Gas',
  amc:          'Equipment AMC',
  food:         'Food & Catering',
  security:     'Security',
  it:           'IT / SaaS',
  pharma:       'Pharma Distributor',
  linen:        'Linen / Laundry',
  consumables:  'Consumables',
  utilities:    'Utilities',
  other:        'Other',
}

export interface Vendor {
  id: string
  name: string
  category: VendorCategory
  contactName: string
  contactPhone: string
  contactEmail: string
  contractValue: number          // annual contract value in ₹
  contractStart: string          // YYYY-MM-DD
  mouExpiry: string              // YYYY-MM-DD
  gstNumber: string
  bankAccount?: string
  notes?: string
}

export interface VendorInvoice {
  id: string
  vendorId: string
  vendorName: string
  invoiceNumber: string
  amount: number
  gstAmount: number
  issuedDate: string             // YYYY-MM-DD
  dueDate: string                // YYYY-MM-DD
  paidDate?: string
  status: InvoiceStatus
  description: string
  category: VendorCategory
  paymentRef?: string
  notes?: string
}

interface VendorState {
  vendors: Vendor[]
  invoices: VendorInvoice[]

  // CRUD
  addVendor: (input: Omit<Vendor, 'id'>, actorName: string) => string
  updateVendor: (id: string, patch: Partial<Vendor>, actorName: string) => void
  removeVendor: (id: string, actorName: string) => void

  // Invoices
  addInvoice: (input: Omit<VendorInvoice, 'id' | 'status'>, actorName: string) => string
  approveInvoice: (id: string, actorName: string) => void
  markPaid: (id: string, paymentRef: string, actorName: string) => void
  disputeInvoice: (id: string, reason: string, actorName: string) => void

  // Selectors
  getOpenInvoices: () => VendorInvoice[]
  getOverdueInvoices: () => VendorInvoice[]
  getExpiringMoUs: (withinDays: number) => Vendor[]
  getTotalPayable: () => number
  getMonthlySpend: (month: string) => number  // YYYY-MM
}

// ─── Helpers ─────────────────────────────────────────────────────────────
const isoDay = (d: Date) => d.toISOString().split('T')[0]!
const dayOffset = (offsetDays: number): string => {
  const d = new Date(); d.setDate(d.getDate() + offsetDays); return isoDay(d)
}
const today = (): string => isoDay(new Date())

// ─── Seed ────────────────────────────────────────────────────────────────
const SEED_VENDORS: Vendor[] = [
  { id: 'VEN-001', name: 'EcoBiomed Disposal Services', category: 'bmw',
    contactName: 'Vivek Sharma', contactPhone: '+91 98450 11001', contactEmail: 'vivek@ecobiomed.in',
    contractValue: 480000, contractStart: '2024-04-01', mouExpiry: '2026-03-31',
    gstNumber: '29AABCE1234F1Z5', notes: 'CPCB authorised vendor #BMW-VENDOR-01' },
  { id: 'VEN-002', name: 'Linde India — Medical Gases', category: 'medical_gas',
    contactName: 'Anand Kumar', contactPhone: '+91 98450 11002', contactEmail: 'anand.k@linde.in',
    contractValue: 1850000, contractStart: '2023-09-01', mouExpiry: '2026-08-31',
    gstNumber: '29AABCL5678G2Z9', notes: 'Bulk O2, N2O, medical air supply' },
  { id: 'VEN-003', name: 'Siemens Healthineers AMC', category: 'amc',
    contactName: 'Priya Iyer', contactPhone: '+91 98450 11003', contactEmail: 'priya.iyer@siemens-healthineers.com',
    contractValue: 4200000, contractStart: '2024-01-01', mouExpiry: '2026-06-30',
    gstNumber: '29AABCS9999H1Z3', notes: 'CT, MRI, USG AMC bundle' },
  { id: 'VEN-004', name: 'Sodexo Hospitality Services', category: 'food',
    contactName: 'Ramesh Nair', contactPhone: '+91 98450 11004', contactEmail: 'ramesh.nair@sodexo.in',
    contractValue: 3600000, contractStart: '2024-04-01', mouExpiry: '2027-03-31',
    gstNumber: '29AABCH7654I2Z1', notes: 'Patient meals + staff cafeteria' },
  { id: 'VEN-005', name: 'Bharat Security Services', category: 'security',
    contactName: 'Suresh Patil', contactPhone: '+91 98450 11005', contactEmail: 'sp@bharatsec.in',
    contractValue: 2400000, contractStart: '2024-04-01', mouExpiry: '2026-04-30',
    gstNumber: '29AABCB4521J1Z7', notes: '24×7 unarmed security 12 guards' },
  { id: 'VEN-006', name: 'Microsoft / Azure', category: 'it',
    contactName: 'Account Mgr', contactPhone: '—', contactEmail: 'enterprise@microsoft.com',
    contractValue: 1200000, contractStart: '2024-01-01', mouExpiry: '2027-12-31',
    gstNumber: '29AABCM1234K2Z5', notes: 'E5 + Azure compute' },
  { id: 'VEN-007', name: 'Apollo Pharmacy Distribution', category: 'pharma',
    contactName: 'Sanjay Reddy', contactPhone: '+91 98450 11007', contactEmail: 'sanjay@apollopharma.com',
    contractValue: 8500000, contractStart: '2024-04-01', mouExpiry: '2026-09-30',
    gstNumber: '29AABCA1111L2Z9', notes: 'Primary pharma distributor · 30-day credit' },
  { id: 'VEN-008', name: 'Clean Linen Co.', category: 'linen',
    contactName: 'Latha Devi', contactPhone: '+91 98450 11008', contactEmail: 'latha@cleanlinen.in',
    contractValue: 720000, contractStart: '2024-04-01', mouExpiry: '2026-03-31',
    gstNumber: '29AABCC6789M1Z3', notes: 'Per kg + scheduled pickup' },
]

const SEED_INVOICES: VendorInvoice[] = [
  // Overdue
  { id: 'INV-001', vendorId: 'VEN-001', vendorName: 'EcoBiomed Disposal Services',
    invoiceNumber: 'EB-2026-0421', amount: 38000, gstAmount: 6840,
    issuedDate: dayOffset(-45), dueDate: dayOffset(-15),
    status: 'overdue', description: 'BMW disposal · April 2026', category: 'bmw' },
  // Due this week
  { id: 'INV-002', vendorId: 'VEN-002', vendorName: 'Linde India — Medical Gases',
    invoiceNumber: 'LD-2026-1812', amount: 165000, gstAmount: 29700,
    issuedDate: dayOffset(-22), dueDate: dayOffset(3),
    status: 'open', description: 'Bulk O2 refills · May 2026', category: 'medical_gas' },
  { id: 'INV-003', vendorId: 'VEN-003', vendorName: 'Siemens Healthineers AMC',
    invoiceNumber: 'SH-2026-4521', amount: 350000, gstAmount: 63000,
    issuedDate: dayOffset(-15), dueDate: dayOffset(5),
    status: 'approved', description: 'CT AMC Q1 + service visit', category: 'amc' },
  // Recently paid
  { id: 'INV-004', vendorId: 'VEN-004', vendorName: 'Sodexo Hospitality Services',
    invoiceNumber: 'SOD-2026-0512', amount: 285000, gstAmount: 14250,
    issuedDate: dayOffset(-40), dueDate: dayOffset(-10),
    paidDate: dayOffset(-8), paymentRef: 'NEFT-2026-A8821',
    status: 'paid', description: 'Catering · April 2026', category: 'food' },
  // Disputed
  { id: 'INV-005', vendorId: 'VEN-008', vendorName: 'Clean Linen Co.',
    invoiceNumber: 'CL-2026-0998', amount: 64000, gstAmount: 11520,
    issuedDate: dayOffset(-12), dueDate: dayOffset(18),
    status: 'disputed', description: 'Linen May Wk1-2 · weight discrepancy', category: 'linen',
    notes: 'Vendor billed 1180kg, our log shows 940kg. Under review.' },
  // Pharma — regular
  { id: 'INV-006', vendorId: 'VEN-007', vendorName: 'Apollo Pharmacy Distribution',
    invoiceNumber: 'AP-2026-9912', amount: 720000, gstAmount: 86400,
    issuedDate: dayOffset(-18), dueDate: dayOffset(12),
    status: 'approved', description: 'Pharma stock replenish · 30-day credit', category: 'pharma' },
  // Security — paid
  { id: 'INV-007', vendorId: 'VEN-005', vendorName: 'Bharat Security Services',
    invoiceNumber: 'BS-2026-2208', amount: 200000, gstAmount: 36000,
    issuedDate: dayOffset(-32), dueDate: dayOffset(-2),
    paidDate: dayOffset(-1), paymentRef: 'NEFT-2026-B1199',
    status: 'paid', description: 'Security manpower · April 2026', category: 'security' },
  // IT
  { id: 'INV-008', vendorId: 'VEN-006', vendorName: 'Microsoft / Azure',
    invoiceNumber: 'MS-2026-Q2', amount: 300000, gstAmount: 54000,
    issuedDate: dayOffset(-5), dueDate: dayOffset(25),
    status: 'open', description: 'Q2 Azure + Office E5', category: 'it' },
]

// ─── Store ──────────────────────────────────────────────────────────────
export const useVendorStore = create<VendorState>()(
  persist(
    (set, get) => ({
      vendors: SEED_VENDORS,
      invoices: SEED_INVOICES,

      addVendor: (input, actorName) => {
        const id = `VEN-${Date.now()}`
        const v: Vendor = { ...input, id }
        set(s => ({ vendors: [...s.vendors, v] }))
        useAuditStore.getState().log({
          userId: 'ADM-01', userName: actorName,
          action: 'finance_charge',
          resource: 'vendor', resourceId: id,
          detail: `${v.name} (${CATEGORY_LABEL[v.category]}) added · contract ₹${v.contractValue.toLocaleString('en-IN')}`,
        })
        return id
      },

      updateVendor: (id, patch, actorName) => {
        const before = get().vendors.find(v => v.id === id)
        if (!before) return
        set(s => ({ vendors: s.vendors.map(v => v.id === id ? { ...v, ...patch } : v) }))
        useAuditStore.getState().log({
          userId: 'ADM-01', userName: actorName,
          action: 'finance_charge',
          resource: 'vendor', resourceId: id,
          detail: `${before.name} updated · ${Object.keys(patch).join(', ')}`,
        })
      },

      removeVendor: (id, actorName) => {
        const v = get().vendors.find(x => x.id === id)
        if (!v) return
        set(s => ({ vendors: s.vendors.filter(x => x.id !== id) }))
        useAuditStore.getState().log({
          userId: 'ADM-01', userName: actorName,
          action: 'finance_charge',
          resource: 'vendor', resourceId: id,
          detail: `${v.name} removed`,
        })
      },

      addInvoice: (input, actorName) => {
        const id = `INV-${Date.now()}`
        const inv: VendorInvoice = { ...input, id, status: 'open' }
        set(s => ({ invoices: [...s.invoices, inv] }))
        useAuditStore.getState().log({
          userId: 'ADM-01', userName: actorName,
          action: 'finance_invoice_received',
          resource: 'vendor_invoice', resourceId: id,
          detail: `${input.vendorName} · ${input.invoiceNumber} · ₹${input.amount.toLocaleString('en-IN')} due ${input.dueDate}`,
        })
        return id
      },

      approveInvoice: (id, actorName) => {
        const inv = get().invoices.find(i => i.id === id)
        if (!inv) return
        set(s => ({ invoices: s.invoices.map(i => i.id === id ? { ...i, status: 'approved' as const } : i) }))
        useAuditStore.getState().log({
          userId: 'ADM-01', userName: actorName,
          action: 'finance_invoice_approved',
          resource: 'vendor_invoice', resourceId: id,
          detail: `${inv.vendorName} · ${inv.invoiceNumber} approved for payment · ₹${inv.amount.toLocaleString('en-IN')}`,
        })
      },

      markPaid: (id, paymentRef, actorName) => {
        const inv = get().invoices.find(i => i.id === id)
        if (!inv) return
        set(s => ({
          invoices: s.invoices.map(i => i.id === id ? {
            ...i, status: 'paid' as const, paidDate: today(), paymentRef,
          } : i),
        }))
        useAuditStore.getState().log({
          userId: 'ADM-01', userName: actorName,
          action: 'finance_vendor_paid',
          resource: 'vendor_invoice', resourceId: id,
          detail: `${inv.vendorName} · ${inv.invoiceNumber} paid via ${paymentRef} · ₹${inv.amount.toLocaleString('en-IN')}`,
        })
      },

      disputeInvoice: (id, reason, actorName) => {
        const inv = get().invoices.find(i => i.id === id)
        if (!inv) return
        set(s => ({
          invoices: s.invoices.map(i => i.id === id ? { ...i, status: 'disputed' as const, notes: reason } : i),
        }))
        useAuditStore.getState().log({
          userId: 'ADM-01', userName: actorName,
          action: 'finance_dispute_opened',
          resource: 'vendor_invoice', resourceId: id,
          detail: `${inv.vendorName} · ${inv.invoiceNumber} disputed · ${reason}`,
        })
      },

      // Selectors
      getOpenInvoices: () => get().invoices.filter(i => i.status === 'open' || i.status === 'approved' || i.status === 'overdue'),
      getOverdueInvoices: () => {
        const t = today()
        return get().invoices.filter(i =>
          (i.status === 'overdue') ||
          ((i.status === 'open' || i.status === 'approved') && i.dueDate < t),
        )
      },
      getExpiringMoUs: (withinDays) => {
        const t = today()
        const limit = dayOffset(withinDays)
        return get().vendors.filter(v => v.mouExpiry >= t && v.mouExpiry <= limit)
          .sort((a, b) => a.mouExpiry.localeCompare(b.mouExpiry))
      },
      getTotalPayable: () => {
        return get().invoices
          .filter(i => i.status !== 'paid')
          .reduce((sum, i) => sum + i.amount + i.gstAmount, 0)
      },
      getMonthlySpend: (month) => {
        return get().invoices
          .filter(i => i.paidDate?.startsWith(month))
          .reduce((sum, i) => sum + i.amount + i.gstAmount, 0)
      },
    }),
    {
      name: 'agentix-vendors', version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
)
