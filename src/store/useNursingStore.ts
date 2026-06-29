import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// Persisted nursing tasks — the shift worklist. Tasks are patient-linked and can
// be added manually or auto-built by the AI from the live ward state (overdue
// vitals, due meds, pending orders, acuity-driven assessments). `key` makes AI
// task generation idempotent so re-building doesn't duplicate.

export type NurseTaskCategory = 'Vitals' | 'Medication' | 'Assessment' | 'Hygiene' | 'Mobility' | 'Documentation' | 'Procedure'
export type NurseTaskPriority = 'High' | 'Medium' | 'Low'

export type NurseTask = {
  id: string
  key?: string                 // stable identity for AI-derived tasks (dedupe)
  patientId?: string
  patientName: string
  title: string
  category: NurseTaskCategory
  priority: NurseTaskPriority
  source: 'ai' | 'manual'
  done: boolean
  createdAt: string
  doneAt?: string
}

let _seq = 0
const uid = () => `task-${Date.now()}-${++_seq}`

const SEED: NurseTask[] = [
  { id: uid(), patientName: 'Kiran Patil', patientId: 'PT-20394', title: 'Assist with morning hygiene', category: 'Hygiene', priority: 'Low', source: 'manual', done: true, createdAt: new Date(Date.now() - 5 * 3600000).toISOString(), doneAt: new Date(Date.now() - 4 * 3600000).toISOString() },
  { id: uid(), patientName: 'Raju Singh', patientId: 'IP-3002', title: 'Encourage mobilisation — short walk', category: 'Mobility', priority: 'Low', source: 'manual', done: false, createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
]

interface NursingState {
  tasks: NurseTask[]
  addTask: (t: Omit<NurseTask, 'id' | 'createdAt' | 'done'>) => void
  toggleTask: (id: string) => void
  removeTask: (id: string) => void
  // Add AI-suggested tasks, skipping any whose `key` already exists.
  addAiTasks: (suggested: Omit<NurseTask, 'id' | 'createdAt' | 'done'>[]) => number
}

export const useNursingStore = create<NursingState>()(
  persist(
    (set, get) => ({
      tasks: SEED,
      addTask: (t) => set(s => ({ tasks: [{ ...t, id: uid(), done: false, createdAt: new Date().toISOString() }, ...s.tasks] })),
      toggleTask: (id) => set(s => ({
        tasks: s.tasks.map(t => t.id === id ? { ...t, done: !t.done, doneAt: !t.done ? new Date().toISOString() : undefined } : t),
      })),
      removeTask: (id) => set(s => ({ tasks: s.tasks.filter(t => t.id !== id) })),
      addAiTasks: (suggested) => {
        const existing = new Set(get().tasks.map(t => t.key).filter(Boolean))
        const fresh = suggested.filter(t => t.key && !existing.has(t.key))
        if (fresh.length) set(s => ({ tasks: [...fresh.map(t => ({ ...t, id: uid(), done: false, createdAt: new Date().toISOString() })), ...s.tasks] }))
        return fresh.length
      },
    }),
    { name: 'agentix-nursing-tasks', version: 1, storage: createJSONStorage(() => localStorage), skipHydration: true },
  ),
)
