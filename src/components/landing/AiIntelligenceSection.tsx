"use client"

import { Brain, AlertTriangle, Sparkles, Activity, ScanLine, Siren, TrendingUp, MessageSquareText, ShieldCheck } from "lucide-react"
import { useLiveHospitalStats } from "./useLiveHospitalStats"
import { Reveal } from "./Reveal"
import { cn } from "@/lib/utils"

const CAPS = [
  { icon: ScanLine, title: "AI radiology triage", body: "Modality-aware detection surfaces critical studies first — pneumothorax, bleed, PE — with confidence and heatmap overlays.", stat: (s: ReturnType<typeof useLiveHospitalStats>) => `${s.aiFindings} live AI findings` },
  { icon: Siren, title: "Closed-loop critical results", body: "Critical values auto-detected, communicated, and tracked to acknowledgment on a 30-minute SLA with escalation.", stat: (s: ReturnType<typeof useLiveHospitalStats>) => `${s.criticalAlerts} active alerts` },
  { icon: TrendingUp, title: "Predictive operations", body: "Forecast scan volume, no-show risk, TAT breaches and bed pressure before they bite — staffing stays ahead of demand.", stat: (s: ReturnType<typeof useLiveHospitalStats>) => `${s.tatBreaches} TAT watch` },
  { icon: MessageSquareText, title: "Natural-language ops assistant", body: "Ask “which modality is causing the most TAT breaches?” and get an answer over live operational data.", stat: () => "Ask anything" },
]

export function AiIntelligenceSection() {
  const s = useLiveHospitalStats()
  const feed = s.aiFeed.length ? s.aiFeed : [{ id: "ph", tone: "info" as const, label: "Connecting", detail: "Awaiting live clinical streams…", meta: undefined }]

  return (
    <section id="intelligence" className="scroll-mt-20 py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-5 lg:px-10">
        <Reveal className="max-w-2xl">
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-primary)]">Intelligence, demonstrated</p>
          <h2 className="text-[30px] lg:text-[38px] font-bold text-[#101828] tracking-tight mt-2">See the intelligence — not just the claim</h2>
          <p className="text-[15.5px] text-[#475467] mt-3">Most platforms say “AI-powered.” This one shows it: every signal below is generated live from the system’s own clinical and operational data.</p>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-5 mt-10">
          {/* Live AI feed */}
          <Reveal>
            <div className="rounded-3xl border border-[#EAECF2] bg-white shadow-[var(--shadow-card)] h-full">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-[#EAECF2]">
                <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full rounded-full bg-[var(--color-primary)] opacity-60 animate-ping" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--color-primary)]" /></span>
                <Brain className="h-4 w-4 text-[var(--color-primary)]" />
                <h3 className="text-[14px] font-bold text-[#101828]">Live AI activity</h3>
              </div>
              <div className="divide-y divide-[#F2F4F8] max-h-[360px] overflow-y-auto">
                {feed.map(item => (
                  <div key={item.id} className="flex items-start gap-3 px-5 py-3.5">
                    <span className={cn("h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0",
                      item.tone === "critical" ? "bg-red-50 text-red-600" : item.tone === "ai" ? "bg-[var(--color-primary)]/[0.08] text-[var(--color-primary)]" : "bg-amber-50 text-amber-600")}>
                      {item.tone === "critical" ? <AlertTriangle className="h-4 w-4" /> : item.tone === "ai" ? <Sparkles className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-[#101828]">{item.detail}</p>
                      <p className="text-[11.5px] text-[#667085] mt-0.5">{item.label}{item.meta ? ` · ${item.meta}` : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-[#EAECF2] flex items-center gap-1.5 text-[11px] font-medium text-[#667085]">
                <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-primary)]" /> AI assists, never replaces — every suggestion is reviewable, audited, and human-confirmed.
              </div>
            </div>
          </Reveal>

          {/* Capability cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CAPS.map(({ icon: Icon, title, body, stat }, i) => (
              <Reveal key={title} delay={i * 0.06}>
                <div className="rounded-3xl border border-[#EAECF2] bg-white p-5 h-full hover:border-[#D0D5DD] hover:shadow-[var(--shadow-card-hover)] transition-all">
                  <span className="h-10 w-10 rounded-xl flex items-center justify-center bg-[var(--color-primary)]/[0.08] text-[var(--color-primary)]"><Icon className="h-5 w-5" /></span>
                  <h3 className="text-[15.5px] font-bold text-[#101828] mt-3">{title}</h3>
                  <p className="text-[13px] text-[#667085] mt-1.5 leading-relaxed">{body}</p>
                  <p className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-bold text-[var(--color-primary)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />{stat(s)}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
