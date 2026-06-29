import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type Asset = {
  id: string
  name: string
  category: 'Equipment' | 'Consumable'
  status: 'Active' | 'Low Stock' | 'Maintenance Required'
  quantity?: number
  reorderPoint?: number
  uom?: string
  vendor?: string
  unitCost?: number
  aiMaintenanceAlert?: string
}

export type RequisitionStatus = 'draft' | 'submitted' | 'received' | 'cancelled'
export interface Requisition {
  id: string
  assetId: string
  assetName: string
  qty: number
  vendor?: string
  status: RequisitionStatus
  raisedBy: string
  raisedAt: string
  receivedQty?: number
  receivedAt?: string
  receivedBy?: string
  notes?: string
}

export type RepairStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
export interface Repair {
  id: string
  assetId: string
  assetName: string
  vendor?: string
  description: string
  status: RepairStatus
  scheduledAt: string
  assignedTo?: string
  completedAt?: string
  notes?: string
}

interface InventoryState {
  totalAssetsValue: number
  lowStockItems: number
  assets: Asset[]
  requisitions: Requisition[]
  repairs: Repair[]
  // Mutations
  requestReorder: (input: { assetId: string; qty: number; vendor?: string; raisedBy: string; notes?: string }) => string
  receiveDelivery: (input: { requisitionId: string; receivedQty: number; receivedBy: string; notes?: string }) => void
  cancelRequisition: (requisitionId: string) => void
  scheduleRepair: (input: { assetId: string; vendor?: string; description: string; scheduledAt: string; assignedTo?: string }) => string
  updateRepairStatus: (repairId: string, status: RepairStatus, notes?: string) => void
}

const SEED_REQUISITIONS: Requisition[] = []
const SEED_REPAIRS: Repair[] = []

export const useInventoryStore = create<InventoryState>()(persist((set, get) => ({
  totalAssetsValue: 55000000,
  lowStockItems: 12,
  assets: [
    { id: 'EQ-001', name: 'MRI Scanner (Siemens)', category: 'Equipment', status: 'Maintenance Required', vendor: 'Siemens Healthineers', unitCost: 12500000, aiMaintenanceAlert: 'Cooling system anomaly detected. Predict failure in 5 days.' },
    { id: 'CS-105', name: 'N95 Masks',             category: 'Consumable', status: 'Low Stock', quantity: 150, reorderPoint: 500, uom: 'pcs',     vendor: '3M India',  unitCost: 35 },
    { id: 'CS-106', name: 'Surgical Gloves (M)',   category: 'Consumable', status: 'Low Stock', quantity: 90,  reorderPoint: 300, uom: 'pairs',   vendor: 'Medline',    unitCost: 12 },
    { id: 'CS-107', name: 'IV Cannula 18G',         category: 'Consumable', status: 'Low Stock', quantity: 40,  reorderPoint: 150, uom: 'pcs',     vendor: 'BD India',    unitCost: 28 },
    { id: 'EQ-002', name: 'Portable Ventilator',    category: 'Equipment', status: 'Active', vendor: 'Hamilton Medical', unitCost: 850000 },
    { id: 'EQ-003', name: 'Defibrillator (LP15)',   category: 'Equipment', status: 'Active', vendor: 'Stryker',   unitCost: 720000 },
  ],
  requisitions: SEED_REQUISITIONS,
  repairs: SEED_REPAIRS,

  requestReorder: ({ assetId, qty, vendor, raisedBy, notes }) => {
    const asset = get().assets.find((a) => a.id === assetId)
    const id = `REQ-${Date.now()}`
    const req: Requisition = {
      id, assetId, assetName: asset?.name ?? assetId, qty,
      vendor: vendor ?? asset?.vendor,
      status: 'submitted', raisedBy,
      raisedAt: new Date().toISOString(),
      notes,
    }
    set((s) => ({ requisitions: [req, ...s.requisitions] }))
    return id
  },

  receiveDelivery: ({ requisitionId, receivedQty, receivedBy, notes }) =>
    set((s) => {
      const req = s.requisitions.find((r) => r.id === requisitionId)
      if (!req) return s
      const nextReqs = s.requisitions.map((r) => r.id === requisitionId
        ? { ...r, status: 'received' as RequisitionStatus, receivedQty, receivedBy, receivedAt: new Date().toISOString(), notes: notes ?? r.notes }
        : r)
      const nextAssets = s.assets.map((a) => a.id === req.assetId
        ? { ...a, quantity: (a.quantity ?? 0) + receivedQty, status: ((a.quantity ?? 0) + receivedQty) > (a.reorderPoint ?? 0) ? 'Active' as const : a.status }
        : a)
      return { requisitions: nextReqs, assets: nextAssets }
    }),

  cancelRequisition: (requisitionId) =>
    set((s) => ({ requisitions: s.requisitions.map((r) => r.id === requisitionId ? { ...r, status: 'cancelled' } : r) })),

  scheduleRepair: ({ assetId, vendor, description, scheduledAt, assignedTo }) => {
    const asset = get().assets.find((a) => a.id === assetId)
    const id = `REP-${Date.now()}`
    const rep: Repair = {
      id, assetId, assetName: asset?.name ?? assetId,
      vendor: vendor ?? asset?.vendor,
      description, status: 'scheduled',
      scheduledAt, assignedTo,
    }
    set((s) => ({
      repairs: [rep, ...s.repairs],
      assets: s.assets.map((a) => a.id === assetId ? { ...a, status: 'Maintenance Required' as const } : a),
    }))
    return id
  },

  updateRepairStatus: (repairId, status, notes) =>
    set((s) => {
      const rep = s.repairs.find((r) => r.id === repairId)
      if (!rep) return s
      const nextRepairs = s.repairs.map((r) => r.id === repairId
        ? { ...r, status, completedAt: status === 'completed' ? new Date().toISOString() : r.completedAt, notes: notes ?? r.notes }
        : r)
      // When repair completes, asset returns to Active.
      const nextAssets = status === 'completed'
        ? s.assets.map((a) => a.id === rep.assetId ? { ...a, status: 'Active' as const } : a)
        : s.assets
      return { repairs: nextRepairs, assets: nextAssets }
    }),
}),
  {
    name: 'agentix-inventorystore', version: 2,
    storage: createJSONStorage(() => localStorage),
    skipHydration: true,
  },
))
