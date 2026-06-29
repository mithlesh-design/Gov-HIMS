import { useMemo } from 'react'
import {
  useLabOrdersStore,
  flatTests,
  TECH_RAVI,
  DR_PATHO,
  type FlatSample,
  type LabOrder,
} from '@/store/useLabOrdersStore'
import { LAB_CATALOG } from '@/lib/labCatalog'

// Back-compat surface for legacy consumers of the old flat-sample lab store.
// New code should read `useLabOrdersStore` directly — this shim exists so
// reception/diagnostics, admin/dashboard, doctor/inbox, ResultsTicker, etc.
// keep working without edits while the lab module is rebuilt around the
// richer LabOrder model.
export type LabSample = FlatSample

interface LegacyLabStore {
  pendingTests: number
  samples: LabSample[]
  addOrderFromDoctor: (order: {
    patientName: string
    patientId?: string
    testName: string
    priority?: 'Routine' | 'Urgent'
    orderedBy?: string
  }) => void
  advanceStatus: (id: string) => void
  acknowledgeCritical: (id: string, doctorName: string) => void
  acknowledgeResult: (id: string) => void
}

const codeByName = (name: string): string | undefined =>
  Object.values(LAB_CATALOG).find(e => e.name === name || e.code === name)?.code

// ─── Stable action refs ───────────────────────────────────────────────────
// All actions delegate to useLabOrdersStore.getState() — they don't depend on
// reactive state, so they can be defined once at module load and reused across
// every render. This avoids breaking reference equality for downstream
// useEffect/useMemo consumers.

const addOrderFromDoctor: LegacyLabStore['addOrderFromDoctor'] = (o) => {
  const code = codeByName(o.testName)
  if (!code) {
    // Reject unknown test names rather than silently rewriting them as CBC.
    // Callers should pick from the catalog or extend it.
    if (typeof window !== 'undefined') {
      console.warn(`[useLabStore shim] Unknown testName "${o.testName}" — order skipped. Add it to LAB_CATALOG or use a typed picker.`)
    }
    return
  }
  useLabOrdersStore.getState().addOrder({
    patientId: o.patientId ?? `PT-${Date.now()}`,
    patientName: o.patientName,
    source: 'OPD',
    doctorName: o.orderedBy ?? '—',
    paymentMode: 'Cash',
    testCodes: [code],
  })
}

const advanceStatus: LegacyLabStore['advanceStatus'] = (id) => {
  const orders = useLabOrdersStore.getState().orders
  const test = orders.flatMap(o => o.tests).find(t => t.id === id)
  if (!test) return
  const s = useLabOrdersStore.getState()
  if (test.status === 'awaiting_collection') s.collectOrder(test.orderId, 'Auto')
  else if (test.status === 'on_bench' || test.status === 'collected') s.claim(test.id, TECH_RAVI)
  else if (test.status === 'in_progress') s.finishEntry(test.id, TECH_RAVI)
  else if (test.status === 'entered') s.verifyTest(test.id, DR_PATHO)
  else if (test.status === 'verified') s.releaseTest(test.id)
}

const acknowledgeCritical: LegacyLabStore['acknowledgeCritical'] = (id, doctorName) =>
  useLabOrdersStore.getState().logCallback(id, 'Lab', doctorName)

const acknowledgeResult: LegacyLabStore['acknowledgeResult'] = (id) =>
  useLabOrdersStore.getState().ackResult(id)

function legacyFor(orders: LabOrder[]): LegacyLabStore {
  const samples = flatTests(orders)
  return {
    pendingTests: samples.filter(s => s.status !== 'Completed').length,
    samples,
    addOrderFromDoctor,
    advanceStatus,
    acknowledgeCritical,
    acknowledgeResult,
  }
}

export function useLabStore(): LegacyLabStore
export function useLabStore<T>(selector: (s: LegacyLabStore) => T): T
export function useLabStore<T>(selector?: (s: LegacyLabStore) => T): T | LegacyLabStore {
  const orders = useLabOrdersStore(s => s.orders)
  // Memoize: only rebuild legacy state when orders change. Action refs are
  // module-level, so reference equality is stable across renders.
  const legacy = useMemo(() => legacyFor(orders), [orders])
  return selector ? selector(legacy) : legacy
}

useLabStore.getState = (): LegacyLabStore => legacyFor(useLabOrdersStore.getState().orders)
