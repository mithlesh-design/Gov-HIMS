"use client"

/* KbdHint — a small monospace keyboard chip, like "⌘K" or "Ctrl+K".
 *
 * Used by the command palette trigger and any surface that documents a
 * keyboard shortcut inline. Adapts the modifier glyph to platform.
 */
import { cn } from "@/lib/utils"
import { kbd } from "@/lib/design-tokens"

interface KbdHintProps {
  /** Either an array of keys (["⌘", "K"]) or a string like "K" (Mod prepended). */
  keys: string | string[]
  className?: string
}

export function KbdHint({ keys, className }: KbdHintProps) {
  const parts = Array.isArray(keys) ? keys : [kbd.modKey, keys]
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-hidden="true">
      {parts.map((k, i) => (
        <kbd
          key={i}
          className="inline-flex items-center justify-center min-w-[20px] h-[18px] px-1 rounded text-[10px] font-semibold text-slate-600 bg-slate-50 ring-1 ring-slate-200/80 font-mono leading-none"
        >
          {k}
        </kbd>
      ))}
    </span>
  )
}
