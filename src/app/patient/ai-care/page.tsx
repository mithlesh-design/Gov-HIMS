"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Mic, ArrowUp, ShieldCheck, FileText, Stethoscope, Pill, CalendarPlus, Bot, CheckCircle, Eye, Lock } from "lucide-react"
import { cn } from "@/lib/utils"

// ── Ask AI (assistant) ───────────────────────────────────────────────
type Msg = { role: 'ai' | 'me'; text: string }
const CANNED: { match: string[]; reply: string }[] = [
  { match: ['report', 'result', 'lab', 'cbc', 'blood'], reply: "Your latest CBC is mostly normal — haemoglobin 13.2 g/dL is healthy. Your white-cell count is slightly raised, which usually means your body is fighting a minor infection. Your doctor has already seen it." },
  { match: ['serious', 'worried', 'chest', 'breath'], reply: "Because you reported chest tightness with breathlessness, you've been marked high priority and fast-tracked. Please stay on the premises — if it worsens, tell any staff member immediately or use the Emergency button." },
  { match: ['medicine', 'medication', 'tablet', 'drug', 'pill'], reply: "You're on 2 medicines. One controls blood sugar (take with food), one is a short course for your current symptoms. I checked — no harmful interactions. I'll remind you when each dose is due." },
  { match: ['book', 'appointment', 'follow', 'visit'], reply: "Your earliest good slot is Thursday 4:00 PM with Dr. Priya Nair — the shortest wait that day. Want me to book it?" },
]
const SUGGESTIONS = [
  { icon: FileText, label: "Explain my latest report" },
  { icon: Stethoscope, label: "Is my condition serious?" },
  { icon: Pill, label: "What are my medicines for?" },
  { icon: CalendarPlus, label: "Book a follow-up" },
]
function replyFor(q: string) {
  const lower = q.toLowerCase()
  return CANNED.find(c => c.match.some(m => lower.includes(m)))?.reply
    ?? "I can help with your reports, medicines, symptoms, appointments and bills. Try a suggestion, or ask in your own words — English or हिंदी."
}

function AskAI() {
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'ai', text: "Hi Kiran 👋 I'm your AI health companion. I know your records, so I can explain your reports, your medicines, or help you book a visit — in plain language. What would you like to know?" }])
  const [text, setText] = useState("")
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])
  const send = (q: string) => {
    if (!q.trim()) return
    setMsgs(m => [...m, { role: 'me', text: q }]); setText("")
    setTimeout(() => setMsgs(m => [...m, { role: 'ai', text: replyFor(q) }]), 450)
  }
  return (
    <div className="rounded-3xl bg-white shadow-[0_1px_4px_rgba(15,23,42,0.06)] flex flex-col overflow-hidden" style={{ minHeight: 420 }}>
      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: 440 }}>
        <AnimatePresence initial={false}>
          {msgs.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("flex", m.role === 'me' ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[80%] px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed", m.role === 'me' ? "bg-[var(--color-primary)] text-white rounded-br-md" : "bg-slate-100 text-slate-800 rounded-bl-md")}>
                {m.text}
                {m.role === 'ai' && i > 0 && <span className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-400"><ShieldCheck className="h-3.5 w-3.5 text-[var(--color-primary)]" /> AI guidance · verify with your doctor</span>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={endRef} />
      </div>
      <div className="px-4 pt-2 pb-4 border-t border-slate-100">
        <div className="flex flex-wrap gap-2 mb-3">
          {SUGGESTIONS.map(s => { const Icon = s.icon; return (
            <button key={s.label} onClick={() => send(s.label)} className="flex items-center gap-1.5 text-[12.5px] font-medium px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:border-[rgba(8,145,178,0.30)] hover:text-[var(--color-primary)] transition-colors active:scale-95">
              <Icon className="h-3.5 w-3.5" /> {s.label}
            </button>
          ) })}
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-slate-50 border border-slate-200 px-3 h-12 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-400 transition-shadow">
          <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(text) }} placeholder="Ask about your health…" aria-label="Ask the AI health companion" className="intake-input flex-1 bg-transparent border-none text-[15px] text-slate-900 placeholder:text-slate-400" />
          <button aria-label="Speak" className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-[var(--color-primary)] hover:bg-[rgba(8,145,178,0.10)] transition-colors"><Mic className="h-4.5 w-4.5" /></button>
          <button aria-label="Send" onClick={() => send(text)} className="h-8 w-8 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center active:scale-95 transition-transform"><ArrowUp className="h-4.5 w-4.5" /></button>
        </div>
      </div>
    </div>
  )
}

// ── AI in my Care (transparency) ─────────────────────────────────────
type Decision = { title: string; detail: string; confidence: number; reviewedBy?: string }
const DECISIONS: Decision[] = [
  { title: 'Triage priority', detail: 'AI assessed your symptoms as High priority and fast-tracked you.', confidence: 0.91, reviewedBy: 'Triage Nurse' },
  { title: 'Pre-consultation brief', detail: 'AI summarised your history & symptoms for your doctor before the visit.', confidence: 0.88, reviewedBy: 'Dr. Priya Nair' },
  { title: 'Lab result interpretation', detail: 'AI flagged a slightly raised WBC and explained it in plain language.', confidence: 0.93, reviewedBy: 'Dr. Priya Nair' },
  { title: 'Suggested diet plan', detail: 'AI drafted a diabetic-friendly diet plan for your review.', confidence: 0.84 },
]
function tier(c: number) { return c >= 0.85 ? { label: 'High confidence', cls: 'bg-green-50 text-green-700' } : c >= 0.6 ? { label: 'Review suggested', cls: 'bg-amber-50 text-amber-700' } : { label: 'Low confidence', cls: 'bg-red-50 text-red-700' } }

function Transparency() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-[rgba(8,145,178,0.06)] border border-slate-200 p-4 grid grid-cols-3 gap-3 text-center">
        <div><Sparkles className="h-5 w-5 text-[var(--color-primary)] mx-auto mb-1" /><p className="text-[12px] text-slate-500">AI is</p><p className="text-[13px] font-bold text-slate-900">Advisory only</p></div>
        <div><CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-1" /><p className="text-[12px] text-slate-500">Decisions by</p><p className="text-[13px] font-bold text-slate-900">Your doctor</p></div>
        <div><ShieldCheck className="h-5 w-5 text-[var(--color-primary)] mx-auto mb-1" /><p className="text-[12px] text-slate-500">Every action</p><p className="text-[13px] font-bold text-slate-900">Logged</p></div>
      </div>
      <div className="space-y-3">
        {DECISIONS.map(d => { const t = tier(d.confidence); return (
          <div key={d.title} className="rounded-2xl bg-white shadow-[0_1px_4px_rgba(15,23,42,0.06)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-[15px] font-bold text-slate-900">{d.title}</p><p className="text-[13px] text-slate-500 mt-0.5">{d.detail}</p></div>
              <span className={cn("text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0", t.cls)}>{Math.round(d.confidence * 100)}% · {t.label}</span>
            </div>
            <div className="mt-3 flex items-center gap-3 text-[12.5px]">
              {d.reviewedBy ? <span className="flex items-center gap-1.5 text-green-700 font-semibold"><CheckCircle className="h-4 w-4" /> Reviewed &amp; approved by {d.reviewedBy}</span>
                : <span className="flex items-center gap-1.5 text-amber-700 font-semibold"><Eye className="h-4 w-4" /> Awaiting clinician review</span>}
            </div>
          </div>
        ) })}
      </div>
      <div className="rounded-2xl bg-slate-50 p-4 flex items-start gap-2.5 text-[12.5px] text-slate-500">
        <Lock className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
        Model: agentix-ai-v1 · Processed under DISHA. AI never makes a final clinical decision — it assists your care team. Manage access in Profile &amp; Privacy.
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────
export default function AiCarePage() {
  const [tab, setTab] = useState<'ask' | 'transparency'>('ask')
  return (
    <div className="max-w-3xl mx-auto pb-10">
      <h1 className="text-[24px] font-bold text-slate-900 tracking-tight flex items-center gap-2 mb-3">
        <span className="h-8 w-8 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-light)] flex items-center justify-center"><Sparkles className="h-4.5 w-4.5 text-white" /></span>
        AI Care
      </h1>
      <div className="inline-flex p-1 rounded-xl bg-slate-100 mb-4">
        {([['ask', 'Ask AI', Sparkles], ['transparency', 'AI in my Care', Bot]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn("flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13.5px] font-semibold transition-all", tab === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>
      {tab === 'ask' ? <AskAI /> : <Transparency />}
    </div>
  )
}
