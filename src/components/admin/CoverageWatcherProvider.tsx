"use client"

import { useCoverageWatcher } from "@/lib/useCoverageWatcher"

/**
 * Client component wrapper that activates the coverage watcher hook.
 * Mounted in the admin layout so the watcher runs whenever an admin is
 * logged in, regardless of which sub-page they're on.
 */
export function CoverageWatcherProvider({ children }: { children: React.ReactNode }) {
  useCoverageWatcher()
  return <>{children}</>
}
