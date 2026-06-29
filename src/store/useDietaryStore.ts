import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useAuditStore } from './useAuditStore'

export type DietType = 'Regular' | 'Diabetic' | 'Low Salt' | 'Low Fat' | 'High Protein' | 'Liquid' | 'Soft' | 'NPO' | 'Custom'
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Mid-Morning' | 'Evening Snack'
export type MealStatus = 'scheduled' | 'prepared' | 'delivered' | 'skipped'
export type AllergyFlag = 'Gluten' | 'Dairy' | 'Nuts' | 'Egg' | 'Shellfish' | 'Soy'

export interface DietPlan {
  id: string
  patientId: string
  patientName: string
  ward: string
  bedNumber: string
  dietType: DietType
  allergyFlags: AllergyFlag[]
  calorieTarget?: number
  notes?: string
  prescribedBy: string
  startDate: string
  aiGenerated?: boolean
  aiConfidence?: number
}

export interface MealOrder {
  id: string
  dietPlanId: string
  patientId: string
  patientName: string
  ward: string
  bedNumber: string
  mealType: MealType
  scheduledAt: string
  status: MealStatus
  items: string[]
  deliveredAt?: string
}

interface DietaryState {
  dietPlans: DietPlan[]
  mealOrders: MealOrder[]
  addPlan: (p: Omit<DietPlan, 'id'>) => void
  updatePlan: (id: string, update: Partial<DietPlan>) => void
  updateMealOrder: (id: string, update: Partial<MealOrder>) => void
  getTodayOrders: () => MealOrder[]
  assignPlan: (p: Omit<DietPlan, 'id'>, actorName: string) => string
  serveMeal: (orderId: string, actorName: string) => void
  detectAllergyConflict: (planId: string) => { conflict: boolean; reasons: string[] }
}

const DIET_PLANS: DietPlan[] = [
  { id: 'DP-001', patientId: 'PT-20394', patientName: 'Kiran Patil', ward: 'General Ward', bedNumber: 'G-12', dietType: 'Diabetic', allergyFlags: [], calorieTarget: 1800, prescribedBy: 'Dr. Priya Menon', startDate: '2026-05-08', aiGenerated: true, aiConfidence: 0.87 },
  { id: 'DP-002', patientId: 'PT-20398', patientName: 'Mohan Lal', ward: 'ICU', bedNumber: 'ICU-3', dietType: 'Liquid', allergyFlags: ['Dairy'], calorieTarget: 1200, prescribedBy: 'Dr. Vikram Rathore', startDate: '2026-05-09' },
]

const MEAL_ORDERS: MealOrder[] = [
  { id: 'MO-001', dietPlanId: 'DP-001', patientId: 'PT-20394', patientName: 'Kiran Patil', ward: 'General Ward', bedNumber: 'G-12', mealType: 'Breakfast', scheduledAt: '2026-05-09T08:00:00Z', status: 'delivered', items: ['Oats porridge', 'Boiled egg white', 'Green tea'], deliveredAt: '2026-05-09T08:15:00Z' },
  { id: 'MO-002', dietPlanId: 'DP-001', patientId: 'PT-20394', patientName: 'Kiran Patil', ward: 'General Ward', bedNumber: 'G-12', mealType: 'Lunch', scheduledAt: '2026-05-09T12:30:00Z', status: 'scheduled', items: ['Brown rice', 'Dal', 'Steamed vegetables', 'Curd'] },
  { id: 'MO-003', dietPlanId: 'DP-002', patientId: 'PT-20398', patientName: 'Mohan Lal', ward: 'ICU', bedNumber: 'ICU-3', mealType: 'Breakfast', scheduledAt: '2026-05-09T08:00:00Z', status: 'delivered', items: ['Ensure via NGT'], deliveredAt: '2026-05-09T08:10:00Z' },
]

export const useDietaryStore = create<DietaryState>()(persist((set, get) => ({
  dietPlans: DIET_PLANS,
  mealOrders: MEAL_ORDERS,
  addPlan: (p) =>
    set((state) => ({ dietPlans: [{ ...p, id: `DP-${Date.now()}` }, ...state.dietPlans] })),
  updatePlan: (id, update) =>
    set((state) => ({ dietPlans: state.dietPlans.map((p) => p.id === id ? { ...p, ...update } : p) })),
  updateMealOrder: (id, update) =>
    set((state) => ({ mealOrders: state.mealOrders.map((o) => o.id === id ? { ...o, ...update } : o) })),
  getTodayOrders: () => {
    const today = new Date().toDateString()
    return get().mealOrders.filter((o) => new Date(o.scheduledAt).toDateString() === today)
  },

  assignPlan: (p, actorName) => {
    const id = `DP-${Date.now()}`
    set(state => ({ dietPlans: [{ ...p, id }, ...state.dietPlans] }))
    useAuditStore.getState().log({
      userId: 'DT-1701', userName: actorName,
      action: 'dietary_plan_assigned',
      resource: 'diet_plan', resourceId: id,
      detail: `${p.dietType} · ${p.calorieTarget ?? '—'} kcal · ${p.patientName} (${p.patientId})`,
    })
    return id
  },

  serveMeal: (orderId, actorName) => {
    const order = get().mealOrders.find(o => o.id === orderId)
    if (!order) return
    set(state => ({
      mealOrders: state.mealOrders.map(o => o.id !== orderId ? o : ({
        ...o, status: 'delivered' as const, deliveredAt: new Date().toISOString(),
      })),
    }))
    useAuditStore.getState().log({
      userId: 'DT-1701', userName: actorName,
      action: 'dietary_meal_served',
      resource: 'meal_order', resourceId: orderId,
      detail: `${order.mealType} delivered to ${order.patientName} (${order.bedNumber})`,
    })
  },

  // Map of allergy flag → keywords to scan in meal-order items.
  detectAllergyConflict: (planId) => {
    const plan = get().dietPlans.find(p => p.id === planId)
    if (!plan) return { conflict: false, reasons: [] }
    const KEYWORD: Record<string, string[]> = {
      Gluten:    ['wheat', 'bread', 'roti', 'pasta', 'noodle'],
      Dairy:     ['milk', 'cheese', 'curd', 'yogurt', 'paneer', 'butter', 'ghee'],
      Nuts:      ['nut', 'almond', 'cashew', 'peanut', 'pista'],
      Egg:       ['egg', 'omelet', 'omelette'],
      Shellfish: ['prawn', 'shrimp', 'crab', 'lobster'],
      Soy:       ['soy', 'tofu', 'edamame'],
    }
    const reasons: string[] = []
    const orders = get().mealOrders.filter(o => o.dietPlanId === planId)
    for (const o of orders) {
      for (const flag of plan.allergyFlags) {
        for (const kw of (KEYWORD[flag] ?? [])) {
          if (o.items.some(i => i.toLowerCase().includes(kw))) {
            reasons.push(`${o.mealType}: contains ${kw} (${flag} allergen)`)
            break
          }
        }
      }
    }
    return { conflict: reasons.length > 0, reasons }
  },
}),
  {
    name: 'agentix-dietarystore', version: 1,
    storage: createJSONStorage(() => localStorage),
    skipHydration: true,
  },
))
