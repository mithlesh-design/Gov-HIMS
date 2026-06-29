"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { MoreVertical, Stethoscope, FileText, Pill, Ban, FlaskConical, GitBranch, Activity, Scissors, Utensils, LogOut } from "lucide-react"

export type IpdAction =
  | 'round' | 'chart' | 'add_med' | 'stop_med' | 'order_test' | 'refer' | 'icu' | 'ot' | 'diet' | 'discharge'

const ITEMS: { id: IpdAction; label: string; icon: React.ElementType; danger?: boolean }[] = [
  { id: 'round', label: 'Start round', icon: Stethoscope },
  { id: 'chart', label: 'Open full chart', icon: FileText },
  { id: 'add_med', label: 'Add medication', icon: Pill },
  { id: 'stop_med', label: 'Stop medication', icon: Ban },
  { id: 'order_test', label: 'Order test', icon: FlaskConical },
  { id: 'refer', label: 'Refer to specialist', icon: GitBranch },
  { id: 'icu', label: 'Shift to ICU', icon: Activity },
  { id: 'ot', label: 'Book OT / Plan surgery', icon: Scissors },
  { id: 'diet', label: 'Change diet', icon: Utensils },
  { id: 'discharge', label: 'Initiate discharge', icon: LogOut, danger: true },
]

const MENU_W = 208 // w-52
const GAP = 6
const EDGE = 8

export function ActionsMenu({ onAction }: { onAction: (a: IpdAction) => void }) {
  const [open, setOpen] = useState(false)
  // Fixed-position coordinates resolved from the trigger's viewport rect.
  const [coords, setCoords] = useState<{ left: number; top?: number; bottom?: number }>({ left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // The row table lives inside `overflow-hidden`/`overflow-x-auto` ancestors, so an
  // absolutely-positioned menu would be clipped. We render into a portal with
  // `position: fixed` and anchor to the button rect, flipping upward when a row sits
  // near the bottom of the viewport so the last items are never cut off.
  const place = useCallback(() => {
    const btn = btnRef.current
    if (!btn) return
    const r = btn.getBoundingClientRect()
    // Right-align the menu to the button, clamped within the viewport.
    const left = Math.max(EDGE, Math.min(r.right - MENU_W, window.innerWidth - MENU_W - EDGE))
    const dropUp = window.innerHeight - r.bottom < 380
    setCoords(dropUp
      ? { left, bottom: window.innerHeight - r.top + GAP }
      : { left, top: r.bottom + GAP })
  }, [])

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!open) place()
    setOpen(o => !o)
  }

  useEffect(() => {
    if (!open) return
    place()
    const reposition = () => place()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return
      setOpen(false)
    }
    // Capture-phase scroll catches the inner table scroller too, so the menu
    // tracks the button instead of detaching.
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open, place])

  return (
    <div className="inline-block">
      <button ref={btnRef} aria-label="Actions" aria-haspopup="menu" aria-expanded={open} onClick={toggle} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
        <MoreVertical className="h-4.5 w-4.5 text-slate-500" />
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{ position: 'fixed', left: coords.left, top: coords.top, bottom: coords.bottom }}
          className="z-50 w-52 rounded-xl bg-white shadow-xl border border-slate-100 py-1.5 max-h-[min(380px,70vh)] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          {ITEMS.map(it => (
            <button key={it.id} role="menuitem" onClick={() => { setOpen(false); onAction(it.id) }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium hover:bg-slate-50 cursor-pointer ${it.danger ? 'text-rose-600' : 'text-slate-700'}`}>
              <it.icon className={`h-4 w-4 ${it.danger ? 'text-rose-400' : 'text-slate-400'}`} /> {it.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}
