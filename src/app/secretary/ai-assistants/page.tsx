'use client'

import { useState } from 'react'
import { Sparkles, FileText, TrendingUp, MessageSquare, Users, RefreshCw, ArrowRight } from 'lucide-react'

const ASSISTANTS = [
  {
    id: 'brief', title: 'Minister Brief Generator', hi: 'मंत्री संक्षेप', icon: FileText, color: 'teal',
    description: 'Generate a concise health situation brief for the Minister — daily, weekly, or pre-cabinet.',
    prompts: ['Generate today\'s morning brief', 'Pre-cabinet session brief for July meeting', 'Crisis brief — dengue outbreak'],
  },
  {
    id: 'scenario', title: 'Scenario Modeler', hi: 'परिदृश्य मॉडल', icon: TrendingUp, color: 'blue',
    description: 'Model what-if scenarios for budget allocation, workforce deployment, or outbreak spread.',
    prompts: ['What if ICU capacity increases by 200 beds?', 'Model dengue spread to 5 more districts', 'Budget shift: Rs 50Cr from schemes to HR'],
  },
  {
    id: 'policy', title: 'Policy Recommender', hi: 'नीति अनुशंसा', icon: Sparkles, color: 'purple',
    description: 'Get evidence-based policy options based on NITI indicators, burden analysis, and best practices.',
    prompts: ['How to reduce MMR by 20% in 3 years', 'Fastest path to top-10 NITI Health Index', 'Resolve specialist shortage in tribal districts'],
  },
  {
    id: 'press', title: 'Press Responder', hi: 'प्रेस प्रतिक्रिया', icon: MessageSquare, color: 'orange',
    description: 'Draft official government responses to media queries on health topics.',
    prompts: ['Respond to dengue outbreak coverage', 'Address doctor strike story', 'NQAS certification delay explanation'],
  },
  {
    id: 'assembly', title: 'Assembly Answer Drafter', hi: 'विधानसभा उत्तर', icon: Users, color: 'rose',
    description: 'AI-powered drafts for assembly questions — starred and unstarred.',
    prompts: ['Draft for Q422 — doctor vacancies Dindori', 'Prepare supplementary on PM-JAY fraud', 'Draft for all unstarred health questions'],
  },
]

const COLOR_STYLES = {
  teal: { bg: 'bg-teal-50', border: 'border-teal-200', icon: 'text-[var(--color-primary)]', btn: 'bg-[var(--color-primary)]' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', btn: 'bg-blue-600' },
  purple: { bg: 'bg-cyan-50', border: 'border-cyan-200', icon: 'text-cyan-600', btn: 'bg-cyan-600' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-600', btn: 'bg-orange-600' },
  rose: { bg: 'bg-rose-50', border: 'border-rose-200', icon: 'text-rose-600', btn: 'bg-rose-600' },
}

export default function AiAssistantsPage() {
  const [active, setActive] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleGenerate(assistantId: string, prompt: string) {
    setActive(assistantId)
    setInput(prompt)
    setOutput('')
    setLoading(true)
    await new Promise(r => setTimeout(r, 1500))
    setLoading(false)
    setOutput(`AI response for "${prompt}" from ${ASSISTANTS.find(a => a.id === assistantId)?.title}:\n\nThis is a demo response. In the live system, this would generate a full government-grade document tailored to Madhya Pradesh health context.\n\nKey points:\n• Data from 52 districts integrated\n• NITI indicators benchmarked against national averages\n• Recommendations aligned with NHM PIP priorities`)
  }

  const activeAsst = ASSISTANTS.find(a => a.id === active)

  return (
    <div className="p-6 space-y-5 max-w-screen-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">AI Assistants</h1>
        <p className="text-sm text-[var(--color-foreground-muted)] mt-0.5">AI सहायक · 5 purpose-built government health AI assistants</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-4">
          {ASSISTANTS.map(a => {
            const cs = COLOR_STYLES[a.color as keyof typeof COLOR_STYLES]
            const Icon = a.icon
            return (
              <div key={a.id} className={`bg-white border rounded-2xl p-5 transition-all hover:shadow-md ${active === a.id ? `${cs.border} shadow-md` : 'border-[var(--color-border)]'}`}
                style={{ boxShadow: 'var(--shadow-card)' }}>
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-xl ${cs.bg} border ${cs.border} flex-shrink-0`}>
                    <Icon className={`h-5 w-5 ${cs.icon}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--color-foreground)]">{a.title}</p>
                    <p className="text-[10px] text-[var(--color-foreground-lighter)]" style={{ fontFamily: 'Noto Sans Devanagari' }}>{a.hi}</p>
                    <p className="text-xs text-[var(--color-foreground-muted)] mt-1">{a.description}</p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {a.prompts.map(p => (
                        <button key={p} onClick={() => handleGenerate(a.id, p)}
                          className={`text-[10px] px-2.5 py-1.5 border rounded-full transition-colors ${cs.border} ${cs.bg} ${cs.icon} hover:opacity-80 font-medium`}>
                          {p.length > 35 ? p.slice(0, 35) + '…' : p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Output panel */}
        <div className="sticky top-4">
          {!active && !loading && (
            <div className="h-full flex items-center justify-center text-center text-[var(--color-foreground-lighter)] bg-[var(--color-surface-raised)] rounded-2xl min-h-64 border border-[var(--color-border)] p-8">
              <div>
                <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select an AI assistant and click a prompt to see output here</p>
              </div>
            </div>
          )}
          {loading && (
            <div className="h-full flex items-center justify-center bg-[var(--color-surface-raised)] rounded-2xl min-h-64 border border-[var(--color-border)]">
              <div className="flex items-center gap-3 text-[var(--color-primary)]">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <p className="text-sm font-medium">{activeAsst?.title} is generating…</p>
              </div>
            </div>
          )}
          {output && !loading && activeAsst && (
            <div className="bg-white border border-[var(--color-border)] rounded-2xl overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="px-5 py-3.5 border-b border-[var(--color-border)] flex items-center gap-2 bg-teal-50">
                <Sparkles className="h-4 w-4 text-[var(--color-primary)]" />
                <span className="text-sm font-semibold text-[var(--color-foreground)]">{activeAsst.title}</span>
              </div>
              <div className="p-5">
                <p className="text-xs text-[var(--color-foreground-muted)] mb-2">Prompt: "{input}"</p>
                <pre className="text-sm text-[var(--color-foreground)] leading-relaxed whitespace-pre-wrap font-sans">{output}</pre>
                <div className="flex gap-2 mt-4">
                  <button className="px-4 py-2 bg-[var(--color-primary)] text-white text-xs font-medium rounded-lg">Use this draft</button>
                  <button onClick={() => handleGenerate(activeAsst.id, input)} className="flex items-center gap-1.5 px-4 py-2 border border-[var(--color-border)] text-xs rounded-lg">
                    <RefreshCw className="h-3 w-3" /> Regenerate
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
