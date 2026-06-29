/* Optimistic-UI helper — Phase-1 compact treatment.
 *
 * Most demo mutations write to a Zustand store synchronously and feel
 * instant already; this helper exists for the two cases that DON'T:
 *
 *   1. Mock-API writes (await Patients.create / await Bills.addLine / …)
 *      which we want to feel < 200 ms even if the IndexedDB-style
 *      localStorage write is on the next microtask.
 *
 *   2. AI service stubs that intentionally simulate a ~250 ms vendor
 *      round-trip — we want the UI to show the "thinking" state
 *      immediately and reconcile when the envelope arrives.
 *
 * Use:
 *   const undo = applyOptimistic(() => setStateNow(),
 *                                ()  => setStateBack())
 *   try { await mutate() }
 *   catch (err) { undo(); toast.error(...) }
 */
export function applyOptimistic(apply: () => void, revert: () => void): () => void {
  apply()
  let reverted = false
  return () => { if (!reverted) { revert(); reverted = true } }
}

/** Run a mock-API mutation while showing optimistic state.
 *  - On success: keep optimistic state, optionally reconcile with response.
 *  - On error  : auto-revert, surface error.
 */
export async function withOptimistic<T>(opts: {
  apply: () => void
  revert: () => void
  mutate: () => Promise<T>
  reconcile?: (result: T) => void
  onError?: (err: unknown) => void
}): Promise<T | null> {
  const undo = applyOptimistic(opts.apply, opts.revert)
  try {
    const result = await opts.mutate()
    opts.reconcile?.(result)
    return result
  } catch (err) {
    undo()
    opts.onError?.(err)
    return null
  }
}
