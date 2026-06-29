// M13.0 — Demo data reset.
//
// Wipes every persisted Zustand store (agentix-* keys in localStorage) so the
// next page load triggers in-code seeds. Use when the demo dataset gets stale
// or you want to start a clean walkthrough.
//
// IMPORTANT: All in-progress work the user did this session is lost. Confirm
// before calling.

const DEMO_KEY_PREFIX = 'agentix-'
/** Keys we deliberately keep across resets (no patient data in them). */
const KEEP_KEYS = new Set<string>([
  'agentix-authstore',           // keep the user logged in
  'agentix-doctor-profile',      // keep the doctor's settings
])

export function listDemoKeys(): string[] {
  if (typeof window === 'undefined') return []
  const out: string[] = []
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i)
    if (k && k.startsWith(DEMO_KEY_PREFIX) && !KEEP_KEYS.has(k)) out.push(k)
  }
  return out
}

export function resetDemoData(): { cleared: number } {
  if (typeof window === 'undefined') return { cleared: 0 }
  const keys = listDemoKeys()
  for (const k of keys) window.localStorage.removeItem(k)
  return { cleared: keys.length }
}
