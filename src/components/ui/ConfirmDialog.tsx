"use client"

/* Confirm / Prompt dialogs — replace native window.confirm / window.prompt.
 *
 * Usage:
 *   const { confirm, prompt, view } = useDialogs()
 *   ...
 *   <button onClick={async () => {
 *     const ok = await confirm({ title: 'Lock payroll?', body: '...' })
 *     if (!ok) return
 *     ...
 *   }}>Lock</button>
 *   ...
 *   {view}   // mount once near the page root
 */
import { useCallback, useId, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { AlertTriangle, Check, X } from "lucide-react"
import { useFocusTrap } from "@/lib/useFocusTrap"

export type ConfirmOptions = {
  title: string
  body?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: "default" | "danger" | "warn"
}

export type PromptOptions = {
  title: string
  body?: string
  fields: Array<{
    id: string
    label: string
    placeholder?: string
    defaultValue?: string
    type?: "text" | "number" | "textarea"
    required?: boolean
  }>
  confirmLabel?: string
  cancelLabel?: string
  tone?: "default" | "danger" | "warn"
}

type State =
  | { kind: "idle" }
  | { kind: "confirm"; opts: ConfirmOptions; resolve: (ok: boolean) => void }
  | { kind: "prompt"; opts: PromptOptions; resolve: (values: Record<string, string> | null) => void }

const toneClasses: Record<NonNullable<ConfirmOptions["tone"]>, { btn: string; ring: string }> = {
  default: { btn: "bg-primary hover:bg-primary-dark", ring: "ring-accent-soft" },
  warn:    { btn: "bg-warning hover:bg-warning-light", ring: "ring-warning-bg" },
  danger:  { btn: "bg-danger hover:bg-danger-strong",  ring: "ring-danger-bg" },
}

export function useDialogs() {
  const [state, setState] = useState<State>({ kind: "idle" })

  const confirm = useCallback((opts: ConfirmOptions) =>
    new Promise<boolean>((resolve) => setState({ kind: "confirm", opts, resolve })), [])

  const prompt = useCallback((opts: PromptOptions) =>
    new Promise<Record<string, string> | null>((resolve) =>
      setState({ kind: "prompt", opts, resolve })), [])

  const view =
    state.kind !== "idle" && typeof document !== "undefined"
      ? createPortal(<DialogShell state={state} setState={setState} />, document.body)
      : null

  return { confirm, prompt, view }
}

function DialogShell({ state, setState }: { state: State; setState: (s: State) => void }) {
  if (state.kind === "idle") return null

  const isConfirm = state.kind === "confirm"
  const opts = state.kind === "confirm" ? state.opts : state.opts
  const tone = toneClasses[opts.tone ?? "default"]
  const titleId = useId()
  const trapRef = useFocusTrap<HTMLDivElement>(true)

  function close(result: boolean | Record<string, string> | null) {
    if (state.kind === "confirm") (state.resolve as (b: boolean) => void)(Boolean(result))
    else if (state.kind === "prompt") (state.resolve as (v: Record<string, string> | null) => void)(result as Record<string, string> | null)
    setState({ kind: "idle" })
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 px-4"
      onKeyDown={(e) => { if (e.key === "Escape") close(isConfirm ? false : null) }}
      onClick={() => close(isConfirm ? false : null)}
    >
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`w-[min(480px,100%)] rounded-2xl bg-surface shadow-modal ring-4 ${tone.ring}`}
      >
        <header className="flex items-start gap-3 border-b border-border px-5 py-4">
          {opts.tone === "danger" ? (
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-danger-bg text-danger">
              <AlertTriangle className="h-5 w-5" />
            </span>
          ) : opts.tone === "warn" ? (
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-warning-bg text-warning">
              <AlertTriangle className="h-5 w-5" />
            </span>
          ) : null}
          <div className="flex-1">
            <h2 id={titleId} className="t-title text-foreground">{opts.title}</h2>
            {opts.body ? <p className="mt-1 t-body text-foreground-lighter">{opts.body}</p> : null}
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-foreground-lighter hover:bg-surface-sunken hover:text-foreground"
            onClick={() => close(isConfirm ? false : null)}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {state.kind === "prompt" ? <PromptForm opts={state.opts} onSubmit={close} onCancel={() => close(null)} tone={tone} /> :
          <ConfirmFooter opts={state.opts} onConfirm={() => close(true)} onCancel={() => close(false)} tone={tone} />}
      </div>
    </div>
  )
}

function ConfirmFooter({ opts, onConfirm, onCancel, tone }: { opts: ConfirmOptions; onConfirm: () => void; onCancel: () => void; tone: { btn: string; ring: string } }) {
  return (
    <footer className="flex justify-end gap-2 px-5 py-3 bg-surface-sunken/60 rounded-b-2xl">
      <button
        type="button"
        className="rounded-xl px-3 py-1.5 text-[13px] font-medium text-foreground-muted hover:bg-surface-sunken"
        onClick={onCancel}
      >
        {opts.cancelLabel ?? "Cancel"}
      </button>
      <button
        type="button"
        autoFocus
        className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-[13px] font-semibold text-white ${tone.btn}`}
        onClick={onConfirm}
      >
        <Check className="h-3.5 w-3.5" />
        {opts.confirmLabel ?? "Confirm"}
      </button>
    </footer>
  )
}

function PromptForm({ opts, onSubmit, onCancel, tone }: { opts: PromptOptions; onSubmit: (values: Record<string, string>) => void; onCancel: () => void; tone: { btn: string; ring: string } }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState<string | null>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const form = formRef.current
    if (!form) return
    const fd = new FormData(form)
    const out: Record<string, string> = {}
    for (const field of opts.fields) {
      const v = String(fd.get(field.id) ?? "")
      if (field.required && !v.trim()) {
        setError(`${field.label} is required.`)
        return
      }
      out[field.id] = v
    }
    setError(null)
    onSubmit(out)
  }

  return (
    <form ref={formRef} onSubmit={submit}>
      <div className="space-y-3 px-5 py-4">
        {opts.fields.map((f) => (
          <label key={f.id} className="block">
            <span className="block text-[12px] font-medium text-foreground-muted mb-1">{f.label}{f.required ? " *" : ""}</span>
            {f.type === "textarea" ? (
              <textarea
                name={f.id}
                defaultValue={f.defaultValue}
                placeholder={f.placeholder}
                rows={3}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary focus:ring-2 focus:ring-accent-soft"
                required={f.required}
              />
            ) : (
              <input
                name={f.id}
                type={f.type === "number" ? "number" : "text"}
                defaultValue={f.defaultValue}
                placeholder={f.placeholder}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary focus:ring-2 focus:ring-accent-soft"
                required={f.required}
              />
            )}
          </label>
        ))}
        {error ? <p className="text-[12px] text-danger">{error}</p> : null}
      </div>
      <footer className="flex justify-end gap-2 px-5 py-3 bg-surface-sunken/60 rounded-b-2xl">
        <button type="button" onClick={onCancel} className="rounded-xl px-3 py-1.5 text-[13px] font-medium text-foreground-muted hover:bg-surface-sunken">
          {opts.cancelLabel ?? "Cancel"}
        </button>
        <button type="submit" className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-[13px] font-semibold text-white ${tone.btn}`}>
          <Check className="h-3.5 w-3.5" />
          {opts.confirmLabel ?? "Save"}
        </button>
      </footer>
    </form>
  )
}
