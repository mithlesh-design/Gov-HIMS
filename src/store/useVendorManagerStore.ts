import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// ─── Domain types ─────────────────────────────────────────────────────────────

export type VMCategory = 'Equipment' | 'Consumables' | 'Pharma' | 'Services' | 'Facility'
export type VMVendorStatus = 'active' | 'inactive' | 'suspended' | 'on_probation'
export type VMRiskLevel = 'low' | 'medium' | 'high'
export type VMPaymentTerms = 'prepaid' | 'net_7' | 'net_30' | 'net_60'
export type VMContractStatus = 'draft' | 'active' | 'expiring_soon' | 'expired' | 'terminated'
export type VMPOStatus = 'draft' | 'sent' | 'acknowledged' | 'delivered' | 'cancelled'
export type VMPaymentStatus = 'pending' | 'paid' | 'overdue' | 'disputed'

export interface VMVendor {
  id: string
  name: string
  category: VMCategory
  status: VMVendorStatus
  gstNumber: string
  email: string
  phone: string
  address: string
  paymentTerms: VMPaymentTerms
  riskLevel: VMRiskLevel
  qualityScore: number      // 0–100
  deliveryScore: number     // 0–100
  aiRiskScore: number       // 0–100, higher = more risky
  totalSpend: number        // INR
  activeContracts: number
  createdAt: string
}

export interface VMContract {
  id: string
  vendorId: string
  vendorName: string
  title: string
  value: number
  startDate: string
  endDate: string
  status: VMContractStatus
  autoRenew: boolean
  createdAt: string
}

export interface VMPOItem {
  name: string
  qty: number
  unitPrice: number
}

export interface VMPurchaseOrder {
  id: string
  vendorId: string
  vendorName: string
  items: VMPOItem[]
  totalAmount: number
  status: VMPOStatus
  expectedDelivery: string
  actualDelivery?: string
  createdAt: string
}

export interface VMPayment {
  id: string
  vendorId: string
  vendorName: string
  amount: number
  dueDate: string
  paidDate?: string
  status: VMPaymentStatus
  invoiceRef: string
  createdAt: string
}

// ─── State interface ──────────────────────────────────────────────────────────

interface VendorManagerState {
  vendors: VMVendor[]
  contracts: VMContract[]
  purchaseOrders: VMPurchaseOrder[]
  payments: VMPayment[]

  addVendor: (input: Omit<VMVendor, 'id' | 'createdAt' | 'totalSpend' | 'activeContracts'>) => string
  updateVendor: (id: string, patch: Partial<VMVendor>) => void
  suspendVendor: (id: string) => void

  addContract: (input: Omit<VMContract, 'id' | 'createdAt'>) => string
  updateContract: (id: string, patch: Partial<VMContract>) => void
  terminateContract: (id: string) => void

  createPO: (input: Omit<VMPurchaseOrder, 'id' | 'createdAt'>) => string
  updatePOStatus: (id: string, status: VMPOStatus, actualDelivery?: string) => void

  recordPayment: (input: Omit<VMPayment, 'id' | 'createdAt'>) => string
  markPaymentPaid: (id: string) => void

  getVendorById: (id: string) => VMVendor | undefined
  getActiveVendors: () => VMVendor[]
  getExpiringContracts: (withinDays: number) => VMContract[]
  getOverduePayments: () => VMPayment[]
  getHighRiskVendors: () => VMVendor[]
}

// ─── Seed helpers ─────────────────────────────────────────────────────────────

const REF_DATE = new Date('2026-06-08')
const d = (offset: number) =>
  new Date(REF_DATE.getTime() + offset * 86400000).toISOString().slice(0, 10)

// ─── Seed vendors ─────────────────────────────────────────────────────────────

const SEED_VENDORS: VMVendor[] = [
  {
    id: 'VND-1001', name: 'MedEquip Solutions Pvt. Ltd.', category: 'Equipment',
    status: 'active', gstNumber: '27AABCM1234A1Z5', email: 'info@medequip.in',
    phone: '+91-9876543210', address: 'Plot 12, MIDC, Pune, Maharashtra',
    paymentTerms: 'net_30', riskLevel: 'low',
    qualityScore: 91, deliveryScore: 88, aiRiskScore: 14,
    totalSpend: 4200000, activeContracts: 2, createdAt: d(-180),
  },
  {
    id: 'VND-1002', name: 'LifeCare Diagnostics Ltd.', category: 'Equipment',
    status: 'active', gstNumber: '27AABCL5678B2Z7', email: 'procurement@lifecare.in',
    phone: '+91-9845001122', address: 'Sector 18, Noida, Uttar Pradesh',
    paymentTerms: 'net_60', riskLevel: 'medium',
    qualityScore: 74, deliveryScore: 70, aiRiskScore: 42,
    totalSpend: 1800000, activeContracts: 1, createdAt: d(-120),
  },
  {
    id: 'VND-1003', name: 'Sunrise Pharma Distributors', category: 'Pharma',
    status: 'active', gstNumber: '29AADCS9876C3Z1', email: 'orders@sunrisepharma.in',
    phone: '+91-9900112233', address: '7th Block, Koramangala, Bengaluru',
    paymentTerms: 'net_7', riskLevel: 'low',
    qualityScore: 95, deliveryScore: 92, aiRiskScore: 8,
    totalSpend: 9600000, activeContracts: 2, createdAt: d(-365),
  },
  {
    id: 'VND-1004', name: 'GlobalMed Pharma', category: 'Pharma',
    status: 'on_probation', gstNumber: '27AABCG2345D4Z9', email: 'supply@globalmed.in',
    phone: '+91-8800334455', address: 'Anna Salai, Chennai, Tamil Nadu',
    paymentTerms: 'prepaid', riskLevel: 'high',
    qualityScore: 52, deliveryScore: 48, aiRiskScore: 78,
    totalSpend: 650000, activeContracts: 1, createdAt: d(-90),
  },
  {
    id: 'VND-1005', name: 'CleanCare Consumables', category: 'Consumables',
    status: 'active', gstNumber: '24AABCC7890E5Z3', email: 'sales@cleancare.in',
    phone: '+91-9712345678', address: 'Ring Road, Surat, Gujarat',
    paymentTerms: 'net_30', riskLevel: 'low',
    qualityScore: 87, deliveryScore: 90, aiRiskScore: 18,
    totalSpend: 2300000, activeContracts: 1, createdAt: d(-220),
  },
  {
    id: 'VND-1006', name: 'MediSupply Co.', category: 'Consumables',
    status: 'active', gstNumber: '07AABCM3456F6Z7', email: 'ops@medisupply.in',
    phone: '+91-9311223344', address: 'Okhla Phase II, New Delhi',
    paymentTerms: 'net_30', riskLevel: 'medium',
    qualityScore: 68, deliveryScore: 65, aiRiskScore: 51,
    totalSpend: 870000, activeContracts: 1, createdAt: d(-75),
  },
  {
    id: 'VND-1007', name: 'ProTech Facility Services', category: 'Facility',
    status: 'active', gstNumber: '33AABCP4567G7Z2', email: 'helpdesk@protech.in',
    phone: '+91-9444556677', address: 'T.Nagar, Chennai, Tamil Nadu',
    paymentTerms: 'net_30', riskLevel: 'low',
    qualityScore: 82, deliveryScore: 85, aiRiskScore: 22,
    totalSpend: 1450000, activeContracts: 1, createdAt: d(-300),
  },
  {
    id: 'VND-1008', name: 'BioTech Maintenance Ltd.', category: 'Services',
    status: 'inactive', gstNumber: '06AABCB5678H8Z4', email: 'contact@biotech-maint.in',
    phone: '+91-9250001111', address: 'Cyber City, Gurugram, Haryana',
    paymentTerms: 'net_60', riskLevel: 'high',
    qualityScore: 45, deliveryScore: 40, aiRiskScore: 84,
    totalSpend: 320000, activeContracts: 0, createdAt: d(-60),
  },
]

const SEED_CONTRACTS: VMContract[] = [
  { id: 'CON-2001', vendorId: 'VND-1001', vendorName: 'MedEquip Solutions Pvt. Ltd.', title: 'Annual Equipment Maintenance Contract', value: 1200000, startDate: d(-300), endDate: d(65), status: 'active', autoRenew: true, createdAt: d(-300) },
  { id: 'CON-2002', vendorId: 'VND-1001', vendorName: 'MedEquip Solutions Pvt. Ltd.', title: 'ICU Equipment Supply Agreement', value: 3000000, startDate: d(-180), endDate: d(185), status: 'active', autoRenew: false, createdAt: d(-180) },
  { id: 'CON-2003', vendorId: 'VND-1003', vendorName: 'Sunrise Pharma Distributors', title: 'Essential Medicines Supply Contract', value: 4800000, startDate: d(-365), endDate: d(22), status: 'expiring_soon', autoRenew: true, createdAt: d(-365) },
  { id: 'CON-2004', vendorId: 'VND-1003', vendorName: 'Sunrise Pharma Distributors', title: 'Narcotics & Controlled Substances Agreement', value: 2400000, startDate: d(-90), endDate: d(275), status: 'active', autoRenew: false, createdAt: d(-90) },
  { id: 'CON-2005', vendorId: 'VND-1004', vendorName: 'GlobalMed Pharma', title: 'Generic Drug Supply Pilot', value: 650000, startDate: d(-88), endDate: d(18), status: 'expiring_soon', autoRenew: false, createdAt: d(-88) },
  { id: 'CON-2006', vendorId: 'VND-1005', vendorName: 'CleanCare Consumables', title: 'Surgical Consumables Annual Contract', value: 2300000, startDate: d(-220), endDate: d(145), status: 'active', autoRenew: true, createdAt: d(-220) },
  { id: 'CON-2007', vendorId: 'VND-1006', vendorName: 'MediSupply Co.', title: 'PPE & Disposables Supply', value: 870000, startDate: d(-75), endDate: d(290), status: 'active', autoRenew: false, createdAt: d(-75) },
  { id: 'CON-2008', vendorId: 'VND-1007', vendorName: 'ProTech Facility Services', title: 'HVAC & Facility Management Contract', value: 1450000, startDate: d(-300), endDate: d(65), status: 'active', autoRenew: true, createdAt: d(-300) },
  { id: 'CON-2009', vendorId: 'VND-1002', vendorName: 'LifeCare Diagnostics Ltd.', title: 'Lab Analyzer Service Contract', value: 1800000, startDate: d(-120), endDate: d(240), status: 'active', autoRenew: false, createdAt: d(-120) },
]

const SEED_POS: VMPurchaseOrder[] = [
  { id: 'PO-3001', vendorId: 'VND-1003', vendorName: 'Sunrise Pharma Distributors', items: [{ name: 'Amoxicillin 500mg (Strip)', qty: 500, unitPrice: 85 }, { name: 'Paracetamol 500mg (Strip)', qty: 1000, unitPrice: 42 }], totalAmount: 84500, status: 'delivered', expectedDelivery: d(-5), actualDelivery: d(-4), createdAt: d(-10) },
  { id: 'PO-3002', vendorId: 'VND-1001', vendorName: 'MedEquip Solutions Pvt. Ltd.', items: [{ name: 'BP Monitor Digital', qty: 10, unitPrice: 3500 }, { name: 'Pulse Oximeter', qty: 20, unitPrice: 1800 }], totalAmount: 71000, status: 'acknowledged', expectedDelivery: d(5), createdAt: d(-3) },
  { id: 'PO-3003', vendorId: 'VND-1005', vendorName: 'CleanCare Consumables', items: [{ name: 'Surgical Gloves (Box)', qty: 200, unitPrice: 450 }, { name: 'N95 Masks (Box)', qty: 50, unitPrice: 1200 }], totalAmount: 150000, status: 'sent', expectedDelivery: d(3), createdAt: d(-1) },
  { id: 'PO-3004', vendorId: 'VND-1004', vendorName: 'GlobalMed Pharma', items: [{ name: 'Metformin 500mg (Box)', qty: 300, unitPrice: 95 }], totalAmount: 28500, status: 'draft', expectedDelivery: d(10), createdAt: d(0) },
  { id: 'PO-3005', vendorId: 'VND-1002', vendorName: 'LifeCare Diagnostics Ltd.', items: [{ name: 'HbA1c Reagent Kit', qty: 20, unitPrice: 4500 }, { name: 'CBC Reagent', qty: 15, unitPrice: 3200 }], totalAmount: 138000, status: 'delivered', expectedDelivery: d(-15), actualDelivery: d(-12), createdAt: d(-20) },
  { id: 'PO-3006', vendorId: 'VND-1006', vendorName: 'MediSupply Co.', items: [{ name: 'IV Cannula 18G (Box)', qty: 100, unitPrice: 280 }, { name: 'Syringe 10ml (Box)', qty: 200, unitPrice: 150 }], totalAmount: 58000, status: 'sent', expectedDelivery: d(7), createdAt: d(-2) },
  { id: 'PO-3007', vendorId: 'VND-1007', vendorName: 'ProTech Facility Services', items: [{ name: 'HVAC Filter Replacement', qty: 8, unitPrice: 3500 }], totalAmount: 28000, status: 'acknowledged', expectedDelivery: d(2), createdAt: d(-4) },
  { id: 'PO-3008', vendorId: 'VND-1003', vendorName: 'Sunrise Pharma Distributors', items: [{ name: 'Insulin Glargine 100IU (Vial)', qty: 150, unitPrice: 620 }, { name: 'Atorvastatin 20mg (Strip)', qty: 400, unitPrice: 58 }], totalAmount: 116200, status: 'delivered', expectedDelivery: d(-30), actualDelivery: d(-28), createdAt: d(-35) },
  { id: 'PO-3009', vendorId: 'VND-1001', vendorName: 'MedEquip Solutions Pvt. Ltd.', items: [{ name: 'Ventilator Consumable Kit', qty: 5, unitPrice: 28000 }], totalAmount: 140000, status: 'delivered', expectedDelivery: d(-45), actualDelivery: d(-40), createdAt: d(-50) },
  { id: 'PO-3010', vendorId: 'VND-1005', vendorName: 'CleanCare Consumables', items: [{ name: 'Sterilisation Pouches (Reel)', qty: 30, unitPrice: 1800 }], totalAmount: 54000, status: 'cancelled', expectedDelivery: d(-10), createdAt: d(-15) },
]

const SEED_PAYMENTS: VMPayment[] = [
  { id: 'PAY-4001', vendorId: 'VND-1003', vendorName: 'Sunrise Pharma Distributors', amount: 84500, dueDate: d(3), status: 'pending', invoiceRef: 'INV-SP-8821', createdAt: d(-7) },
  { id: 'PAY-4002', vendorId: 'VND-1001', vendorName: 'MedEquip Solutions Pvt. Ltd.', amount: 71000, dueDate: d(27), status: 'pending', invoiceRef: 'INV-ME-4412', createdAt: d(-3) },
  { id: 'PAY-4003', vendorId: 'VND-1005', vendorName: 'CleanCare Consumables', amount: 150000, dueDate: d(23), status: 'pending', invoiceRef: 'INV-CC-3301', createdAt: d(-1) },
  { id: 'PAY-4004', vendorId: 'VND-1004', vendorName: 'GlobalMed Pharma', amount: 28500, dueDate: d(-12), status: 'overdue', invoiceRef: 'INV-GM-0099', createdAt: d(-20) },
  { id: 'PAY-4005', vendorId: 'VND-1006', vendorName: 'MediSupply Co.', amount: 58000, dueDate: d(-5), status: 'overdue', invoiceRef: 'INV-MS-7721', createdAt: d(-10) },
  { id: 'PAY-4006', vendorId: 'VND-1008', vendorName: 'BioTech Maintenance Ltd.', amount: 45000, dueDate: d(-18), status: 'overdue', invoiceRef: 'INV-BM-2244', createdAt: d(-25) },
  { id: 'PAY-4007', vendorId: 'VND-1002', vendorName: 'LifeCare Diagnostics Ltd.', amount: 138000, dueDate: d(-30), paidDate: d(-28), status: 'paid', invoiceRef: 'INV-LC-5502', createdAt: d(-40) },
  { id: 'PAY-4008', vendorId: 'VND-1003', vendorName: 'Sunrise Pharma Distributors', amount: 116200, dueDate: d(-10), paidDate: d(-9), status: 'paid', invoiceRef: 'INV-SP-8800', createdAt: d(-15) },
  { id: 'PAY-4009', vendorId: 'VND-1001', vendorName: 'MedEquip Solutions Pvt. Ltd.', amount: 140000, dueDate: d(-20), paidDate: d(-18), status: 'paid', invoiceRef: 'INV-ME-4390', createdAt: d(-30) },
  { id: 'PAY-4010', vendorId: 'VND-1007', vendorName: 'ProTech Facility Services', amount: 120000, dueDate: d(-60), paidDate: d(-55), status: 'paid', invoiceRef: 'INV-PT-1122', createdAt: d(-70) },
  { id: 'PAY-4011', vendorId: 'VND-1005', vendorName: 'CleanCare Consumables', amount: 59000, dueDate: d(-45), paidDate: d(-43), status: 'paid', invoiceRef: 'INV-CC-3288', createdAt: d(-55) },
  { id: 'PAY-4012', vendorId: 'VND-1004', vendorName: 'GlobalMed Pharma', amount: 18000, dueDate: d(-50), status: 'disputed', invoiceRef: 'INV-GM-0071', createdAt: d(-60) },
]

// ─── Store ────────────────────────────────────────────────────────────────────

export const useVendorManagerStore = create<VendorManagerState>()(
  persist(
    (set, get) => ({
      vendors: SEED_VENDORS,
      contracts: SEED_CONTRACTS,
      purchaseOrders: SEED_POS,
      payments: SEED_PAYMENTS,

      addVendor: (input) => {
        const id = `VND-${Date.now().toString(36).toUpperCase()}`
        set(s => ({
          vendors: [{ ...input, id, totalSpend: 0, activeContracts: 0, createdAt: new Date().toISOString() }, ...s.vendors],
        }))
        return id
      },

      updateVendor: (id, patch) => {
        set(s => ({ vendors: s.vendors.map(v => v.id === id ? { ...v, ...patch } : v) }))
      },

      suspendVendor: (id) => {
        set(s => ({ vendors: s.vendors.map(v => v.id === id ? { ...v, status: 'suspended' as const } : v) }))
      },

      addContract: (input) => {
        const id = `CON-${Date.now().toString(36).toUpperCase()}`
        set(s => ({
          contracts: [{ ...input, id, createdAt: new Date().toISOString() }, ...s.contracts],
          vendors: s.vendors.map(v =>
            v.id === input.vendorId ? { ...v, activeContracts: v.activeContracts + 1 } : v
          ),
        }))
        return id
      },

      updateContract: (id, patch) => {
        set(s => ({ contracts: s.contracts.map(c => c.id === id ? { ...c, ...patch } : c) }))
      },

      terminateContract: (id) => {
        const contract = get().contracts.find(c => c.id === id)
        set(s => ({
          contracts: s.contracts.map(c => c.id === id ? { ...c, status: 'terminated' as const } : c),
          vendors: contract
            ? s.vendors.map(v =>
                v.id === contract.vendorId
                  ? { ...v, activeContracts: Math.max(0, v.activeContracts - 1) }
                  : v
              )
            : s.vendors,
        }))
      },

      createPO: (input) => {
        const id = `PO-${Date.now().toString(36).toUpperCase()}`
        set(s => ({
          purchaseOrders: [{ ...input, id, createdAt: new Date().toISOString() }, ...s.purchaseOrders],
        }))
        return id
      },

      updatePOStatus: (id, status, actualDelivery) => {
        set(s => ({
          purchaseOrders: s.purchaseOrders.map(p =>
            p.id === id ? { ...p, status, ...(actualDelivery ? { actualDelivery } : {}) } : p
          ),
        }))
      },

      recordPayment: (input) => {
        const id = `PAY-${Date.now().toString(36).toUpperCase()}`
        set(s => ({
          payments: [{ ...input, id, createdAt: new Date().toISOString() }, ...s.payments],
        }))
        return id
      },

      markPaymentPaid: (id) => {
        set(s => ({
          payments: s.payments.map(p =>
            p.id === id
              ? { ...p, status: 'paid' as const, paidDate: new Date().toISOString().slice(0, 10) }
              : p
          ),
        }))
      },

      getVendorById: (id) => get().vendors.find(v => v.id === id),
      getActiveVendors: () => get().vendors.filter(v => v.status === 'active'),
      getHighRiskVendors: () => get().vendors.filter(v => v.riskLevel === 'high'),

      getExpiringContracts: (withinDays) => {
        const refDate = new Date('2026-06-08')
        const cutoff = new Date(refDate.getTime() + withinDays * 86400000).toISOString().slice(0, 10)
        return get().contracts.filter(
          c => (c.status === 'active' || c.status === 'expiring_soon') && c.endDate <= cutoff
        )
      },

      getOverduePayments: () => get().payments.filter(p => p.status === 'overdue'),
    }),
    {
      name: 'agentix-vendor-manager-store',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
)
