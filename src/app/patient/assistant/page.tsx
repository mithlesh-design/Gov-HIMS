"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Mic, ArrowUp, ShieldCheck, FileText, Stethoscope, Pill, CalendarPlus } from "lucide-react"
import { cn } from "@/lib/utils"

type Msg = { role: 'ai' | 'me'; text: string }

const CANNED: { match: string[]; reply: string }[] = [
  { match: ['report', 'result', 'lab', 'cbc', 'blood'], reply: "Your latest CBC is mostly normal — haemoglobin 13.2 g/dL is healthy. Your white-cell count is slightly raised, which usually means your body is fighting a minor infection. Nothing alarming, and your doctor has already seen it." },
  { match: ['serious', 'worried', 'chest', 'breath'], reply: "Because you reported chest tightness with breathlessness, you've been marked high priority and fast-tracked. Please stay on the premises — if the tightness gets worse or spreads to your arm/jaw, tell any staff member immediately or press the Emergency button." },
  { match: ['medicine', 'medication', 'tablet', 'drug', 'pill'], reply: "You're on 2 medicines right now. One controls blood sugar (take with food), one is a short course for your current symptoms. I checked — there are no harmful interactions between them. I'll remind you when each dose is due." },
  { match: ['book', 'appointment', 'follow', 'visit'], reply: "Your earliest good slot is Thursday 4:00 PM with Dr. Priya Nair — that's the shortest wait that day. Want me to book it for you?" },
  { match: ['diet', 'food', 'eat'], reply: "Based on your diagnosis I've prepared a diabetic-friendly plan: ~1800 kcal/day, high fibre, low simple sugars. I can show it in Hindi too. Open 'Care & Follow-up' to see the full plan." },
]

const SUGGESTIONS = [
  { icon: FileText, label: "Explain my latest report" },
  { icon: Stethoscope, label: "Is my condition serious?" },
  { icon: Pill, label: "What are my medicines for?" },
  { icon: CalendarPlus, label: "Book a follow-up" },
]

function replyFor(q: string) {
  const lower = q.toLowerCase()
  return (CANNED.find(c => c.match.some(m => lower.includes(m)))?.reply)
    ?? "I can help with your reports, medicines, symptoms, appointments and bills. Try one of the suggestions below, or ask in your own words — English or हिंदी."
}

export default function AssistantPage() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'ai', text: "Hi Kiran 👋 I'm your AI health companion. I know your records, so I can explain your reports, your medicines, or help you book a visit — in plain language. What would you like to know?" },
  ])
  const [text, setText] = useState("")
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  const send = (q: string) => {
    if (!q.trim()) return
    setMsgs(m => [...m, { role: 'me', text: q }])
    setText("")
    setTimeout(() => setMsgs(m => [...m, { role: 'ai', text: replyFor(q) }]), 500)
  }

  return (
    <div className="max-w-3xl mx-auto h-full flex flex-col">
      <div className="mb-3">
        <h1 className="text-[24px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <span className="h-8 w-8 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-light)] flex items-center justify-center"><Sparkles className="h-4.5 w-4.5 text-white" /></span>
          AI Health Assistant
        </h1>
        <p className="text-[13px] text-slate-500 mt-1">Private to you · explains your records in plain language · English / हिंदी</p>
      </div>

      <div className="flex-1 rounded-3xl bg-white shadow-[0_1px_4px_rgba(15,23,42,0.06),0_8px_28px_rgba(15,23,42,0.05)] flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 280 }}>
          <AnimatePresence initial={false}>
            {msgs.map((m, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={cn("flex", m.role === 'me' ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[80%] px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed",
                  m.role === 'me' ? "bg-[var(--color-primary)] text-white rounded-br-md" : "bg-slate-100 text-slate-800 rounded-bl-md")}>
                  {m.text}
                  {m.role === 'ai' && i > 0 && (
                    <span className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-400"><ShieldCheck className="h-3.5 w-3.5 text-[var(--color-primary)]" /> AI guidance · verify with your doctor</span>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={endRef} />
        </div>

        <div className="px-4 pt-2 pb-4 border-t border-slate-100">
          <div className="flex flex-wrap gap-2 mb-3">
            {SUGGESTIONS.map(s => {
              const Icon = s.icon
              return (
                <button key={s.label} onClick={() => send(s.label)}
                  className="flex items-center gap-1.5 text-[12.5px] font-medium px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:border-[rgba(8,145,178,0.30)] hover:text-[var(--color-primary)] transition-colors active:scale-95">
                  <Icon className="h-3.5 w-3.5" /> {s.label}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-slate-50 border border-slate-200 px-3 h-12 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-400 transition-shadow">
            <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(text) }}
              placeholder="Ask about your health…" aria-label="Ask the AI health assistant"
              className="intake-input flex-1 bg-transparent border-none text-[15px] text-slate-900 placeholder:text-slate-400" />
            <button aria-label="Speak" className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-[var(--color-primary)] hover:bg-[rgba(8,145,178,0.10)] transition-colors"><Mic className="h-4.5 w-4.5" /></button>
            <button aria-label="Send" onClick={() => send(text)} className="h-8 w-8 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center active:scale-95 transition-transform"><ArrowUp className="h-4.5 w-4.5" /></button>
          </div>
        </div>
      </div>
    </div>
  )
}
