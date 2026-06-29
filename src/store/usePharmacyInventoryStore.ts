import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// Live pharmacy stock. Dispensing decrements quantities (by drug name); the page
// surfaces reorder alerts. Stock is owned by the Inventory Manager — the
// pharmacy can only view and raise requests against it. Purchase orders (both
// patient-specific procurement and low-stock restock asks) live here so both
// the pharmacy (status view) and the inventory manager (fulfilment) read the
// same source of truth.
export type DrugSchedule = 'X' | 'H1'
export type StockItem = {
  id: string
  name: string
  category: string
  qty: number
  unit: string
  reorderAt: number
  maxStock: number
  schedule?: DrugSchedule   // controlled substance schedule, if any
}

// 'patient' = procurement for an out-of-stock script on a specific patient.
// 'restock' = pharmacy low-stock restock request.
export type POKind = 'patient' | 'restock'
export type POStatus = 'pending' | 'ordered' | 'received'
export type PurchaseOrder = {
  id: string
  drug: string
  qty: number
  kind: POKind
  forPatient?: string
  raisedBy: string
  status: POStatus
  raisedAt: string
}

// Curated therapeutic alternatives. Used by the queue when a prescribed drug
// is out of stock — only alternatives that are currently in stock are offered.
const THERAPEUTIC_ALTERNATIVES: Record<string, string[]> = {
  'Amoxicillin 250mg':   ['Amoxicillin 500mg', 'Azithromycin 500mg', 'Cefixime 200mg'],
  'Amoxicillin 500mg':   ['Amoxicillin 250mg', 'Azithromycin 500mg', 'Cefixime 200mg'],
  'Heparin 5000U (IV)':  ['Enoxaparin 40mg (SC)'],
  'Aspirin 75mg':        ['Clopidogrel 75mg'],
  'Atorvastatin 10mg':   ['Rosuvastatin 10mg'],
  'Pantoprazole 40mg':   ['Omeprazole 20mg', 'Rabeprazole 20mg'],
  'Diclofenac 50mg':     ['Ibuprofen 400mg', 'Naproxen 250mg'],
  'Metoprolol 25mg':     ['Atenolol 50mg', 'Bisoprolol 5mg'],
}

const SEED: StockItem[] = [
  { id: 'D-001', name: 'Amoxicillin 500mg', category: 'Antibiotic',   qty: 240,  unit: 'Caps',  reorderAt: 200, maxStock: 1000 },
  { id: 'D-002', name: 'Metformin 500mg',   category: 'Antidiabetic', qty: 850,  unit: 'Tabs',  reorderAt: 300, maxStock: 2000 },
  { id: 'D-003', name: 'Paracetamol 500mg', category: 'Analgesic',    qty: 3200, unit: 'Tabs',  reorderAt: 500, maxStock: 5000 },
  { id: 'D-004', name: 'Atorvastatin 10mg', category: 'Statin',       qty: 180,  unit: 'Tabs',  reorderAt: 250, maxStock: 1500 },
  { id: 'D-005', name: 'Aspirin 75mg',      category: 'Antiplatelet', qty: 900,  unit: 'Tabs',  reorderAt: 300, maxStock: 2000 },
  { id: 'D-006', name: 'Pantoprazole 40mg', category: 'PPI',          qty: 640,  unit: 'Tabs',  reorderAt: 200, maxStock: 1500 },
  { id: 'D-007', name: 'Morphine 10mg/mL',  category: 'Opioid',       qty: 12,   unit: 'Vials', reorderAt: 20,  maxStock: 100, schedule: 'X' },
  { id: 'D-008', name: 'Diclofenac 50mg',   category: 'NSAID',        qty: 410,  unit: 'Tabs',  reorderAt: 200, maxStock: 1500 },
  { id: 'D-009', name: 'Metoprolol 25mg',   category: 'Beta-blocker', qty: 520,  unit: 'Tabs',  reorderAt: 200, maxStock: 1500 },
  { id: 'D-010', name: 'ORS Sachets',       category: 'Rehydration',  qty: 300,  unit: 'Sach.', reorderAt: 100, maxStock: 1000 },
  // Alternatives stocked so substitutions are actually available.
  { id: 'D-011', name: 'Azithromycin 500mg',   category: 'Antibiotic',    qty: 450, unit: 'Tabs',  reorderAt: 150, maxStock: 1500 },
  { id: 'D-012', name: 'Cefixime 200mg',       category: 'Antibiotic',    qty: 320, unit: 'Tabs',  reorderAt: 120, maxStock: 1000 },
  { id: 'D-013', name: 'Enoxaparin 40mg (SC)', category: 'Anticoagulant', qty: 60,  unit: 'Vials', reorderAt: 30,  maxStock: 200 },
]

const PO_SEED: PurchaseOrder[] = [
  { id: 'PO-1001', drug: 'Heparin 5000U (IV)', qty: 50, kind: 'patient', forPatient: 'Vikram Nair', raisedBy: 'Anil Kumar', status: 'ordered', raisedAt: new Date(Date.now() - 26 * 3600_000).toISOString() },
  { id: 'PO-1002', drug: 'Atorvastatin 10mg',  qty: 800, kind: 'restock', raisedBy: 'Ritu Sharma', status: 'pending', raisedAt: new Date(Date.now() - 5 * 3600_000).toISOString() },
]

// Match a prescribed name to a stock line by its leading word (e.g. "Amoxicillin
// 250mg" → "Amoxicillin 500mg"). Forgiving enough for strength differences.
const baseWord = (name: string) => name.toLowerCase().trim().split(/[\s\d]/)[0]

interface InventoryState {
  items: StockItem[]
  purchaseOrders: PurchaseOrder[]
  // Decrement stock for a dispensed drug (exact name match); returns the item if found.
  decrementByName: (name: string, qty: number) => StockItem | undefined
  restock: (id: string, qty: number) => void
  // True if a drug matching this name is on hand (qty > 0).
  inStockByName: (name: string) => boolean
  // Therapeutic alternatives that are currently in stock.
  substitutesFor: (name: string) => string[]
  raisePurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'status' | 'raisedAt'>) => void
  requestRestock: (drug: string, qty: number, raisedBy: string) => void
  setPOStatus: (id: string, status: POStatus) => void
}

let _po = 0
export const usePharmacyInventoryStore = create<InventoryState>()(persist((set, get) => ({
  items: SEED,
  purchaseOrders: PO_SEED,
  decrementByName: (name, qty) => {
    const item = get().items.find(i => i.name === name) ?? get().items.find(i => baseWord(i.name) === baseWord(name))
    if (!item) return undefined
    set(s => ({ items: s.items.map(i => i.id === item.id ? { ...i, qty: Math.max(0, i.qty - qty) } : i) }))
    return item
  },
  restock: (id, qty) => set(s => ({ items: s.items.map(i => i.id === id ? { ...i, qty: Math.min(i.maxStock, i.qty + qty) } : i) })),
  inStockByName: (name) => {
    const exact = get().items.find(i => i.name === name)
    if (exact) return exact.qty > 0
    const fuzzy = get().items.find(i => baseWord(i.name) === baseWord(name))
    return fuzzy ? fuzzy.qty > 0 : false
  },
  substitutesFor: (name) => {
    const alts = THERAPEUTIC_ALTERNATIVES[name] ?? []
    return alts.filter(a => get().inStockByName(a))
  },
  raisePurchaseOrder: (po) =>
    set(s => ({ purchaseOrders: [{ ...po, id: `PO-${Date.now()}-${++_po}`, status: 'pending', raisedAt: new Date().toISOString() }, ...s.purchaseOrders] })),
  requestRestock: (drug, qty, raisedBy) => {
    get().raisePurchaseOrder({ drug, qty, kind: 'restock', raisedBy })
  },
  setPOStatus: (id, status) =>
    set(s => {
      const po = s.purchaseOrders.find(p => p.id === id)
      const purchaseOrders = s.purchaseOrders.map(p => p.id === id ? { ...p, status } : p)
      // On receipt, restock the matching stock line (or top it up to reorder level if new).
      if (status === 'received' && po) {
        const match = s.items.find(i => i.name === po.drug) ?? s.items.find(i => baseWord(i.name) === baseWord(po.drug))
        if (match) {
          return { purchaseOrders, items: s.items.map(i => i.id === match.id ? { ...i, qty: Math.min(i.maxStock, i.qty + po.qty) } : i) }
        }
      }
      return { purchaseOrders }
    }),
}),
  {
    name: 'agentix-pharmacyinventorystore', version: 1,
    storage: createJSONStorage(() => localStorage),
    skipHydration: true,
  },
))
