import { useEffect, useRef } from "react"

/**
 * Accessible modal focus management. Returns a ref to attach to the dialog
 * container. While `active`:
 *   - remembers the element that had focus and restores it on close
 *   - moves focus into the dialog on open (first focusable, or the container)
 *   - traps Tab / Shift+Tab inside the dialog
 *
 * Keeps keyboard users inside the modal (WCAG 2.4.3 / 2.1.2) without each
 * dialog re-implementing the logic.
 */
const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'

export function useFocusTrap<T extends HTMLElement>(active = true) {
  const ref = useRef<T>(null)

  useEffect(() => {
    if (!active) return
    const node = ref.current
    if (!node) return

    const previouslyFocused = document.activeElement as HTMLElement | null

    // Move focus inside the dialog after mount.
    const focusables = node.querySelectorAll<HTMLElement>(FOCUSABLE)
    const first = focusables[0]
    ;(first ?? node).focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return
      const items = node!.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const firstEl = items[0]
      const lastEl = items[items.length - 1]
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }

    node.addEventListener("keydown", onKeyDown)
    return () => {
      node.removeEventListener("keydown", onKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [active])

  return ref
}
