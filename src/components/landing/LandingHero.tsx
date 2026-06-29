"use client"

import { motion } from "framer-motion"
import { Sparkles, ArrowRight, Activity, ScanLine, Users, ShieldCheck, ChevronDown, Brain, AlertTriangle } from "lucide-react"
import { useLiveHospitalStats } from "./useLiveHospitalStats"
import { useCountUp } from "./useCountUp"
import { cn } from "@/lib/utils"

const scrollTo = (id: string) => document.querySelector(id)?.scrollIntoView({ behavior: "smooth" })

export function LandingHero() {
  const s = useLiveHospitalStats()
  const queue = useCountUp(s.opdQueue, s.mounted)
  const staff = useCountUp(s.activeStaff, s.mounted)
  const imaging = useCountUp(s.imagingStudies, s.mounted)

  return (
    <section id="home" className="relative overflow-hidden scroll-mt-16">
      {/* soft light glow / grid backdrop */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full" style={{ background: "radial-gradient(closest-side, rgba(8,145,178,0.10), transparent)" }} />
        <div className="absolute top-40 -right-24 w-[420px] h-[420px] rounded-full" style={{ background: "radial-gradient(closest-side, rgba(8,145,178,0.06), transparent)" }} />
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: "linear-gradient(var(--color-primary) 1px, transparent 1px), linear-gradient(90deg, var(--color-primary) 1px, transparent 1px)", backgroundSize: "44px 44px", maskImage: "radial-gradient(closest-side at 50% 30%, black, transparent)" }} />
      </div>

      <div className="max-w-7xl mx-auto px-5 lg:px-10 pt-14 lg:pt-20 pb-16 grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-12 items-center">
        {/* Copy */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-primary)] bg-[var(--color-primary)]/[0.07] border border-[var(--color-primary)]/15">
            <Sparkles className="h-3.5 w-3.5" /> AI-native hospital operating system
          </span>
          <h1 className="text-[40px] sm:text-[52px] lg:text-[58px] font-bold leading-[1.05] tracking-tight text-[#0B1220] mt-5">
            The intelligent OS<br />
            for the <span className="relative whitespace-nowrap">modern hospital
              <span className="absolute left-0 -bottom-1 h-[6px] w-full rounded-full" style={{ background: "linear-gradient(90deg,#F59E0B,#D97706)" }} /></span>
          </h1>
          <p className="text-[16px] lg:text-[17.5px] leading-relaxed text-[#475467] mt-5 max-w-xl">
            One platform unifying every department — clinical, operations, finance and support — with AI woven through the workflow: triage, decision support, predictive operations and closed-loop safety.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-7">
            <button onClick={() => scrollTo("#launcher")}
              className="inline-flex items-center gap-2 h-12 px-6 rounded-xl text-[15px] font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] transition-colors cursor-pointer shadow-[0_8px_24px_rgba(8,145,178,0.18)]">
              Launch console <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={() => scrollTo("#intelligence")}
              className="inline-flex items-center gap-2 h-12 px-5 rounded-xl text-[15px] font-semibold text-[#344054] bg-white border border-[#EAECF2] hover:border-[#D0D5DD] transition-colors cursor-pointer">
              See the intelligence <ChevronDown className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-7 text-[12.5px] font-semibold text-[#667085]">
            {["NABH-ready", "ABDM / DISHA", "ISO 27001", "HL7 / FHIR"].map(t => (
              <span key={t} className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-[var(--color-primary)]" />{t}</span>
            ))}
          </div>
        </motion.div>

        {/* Live control-tower preview */}
        <motion.div initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-3xl bg-white border border-[#EAECF2] shadow-[0_24px_60px_rgba(16,24,40,0.10)] p-5 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full rounded-full bg-[var(--color-primary)] opacity-60 animate-ping" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--color-primary)]" /></span>
              <span className="text-[12px] font-bold uppercase tracking-wide text-[var(--color-primary)]">Live</span>
              <span className="text-[13px] font-bold text-[#101828]">Operations control tower</span>
            </div>
            <span className="text-[11px] font-semibold text-[#98A2B3]">real-time</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Users, label: "OPD queue", value: Math.round(queue), accent: "var(--color-primary)" },
              { icon: Activity, label: "Active staff", value: Math.round(staff), accent: "var(--color-primary)" },
              { icon: ScanLine, label: "Imaging live", value: Math.round(imaging), accent: "var(--color-primary-light)" },
            ].map(({ icon: Icon, label, value, accent }) => (
              <div key={label} className="rounded-2xl border border-[#EAECF2] bg-[#FBFCFE] p-3.5">
                <span className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: `${accent}14`, color: accent }}><Icon className="h-4 w-4" /></span>
                <p className="text-[26px] font-bold text-[#101828] mt-2 leading-none tabular-nums">{value}</p>
                <p className="text-[11px] font-medium text-[#667085] mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* live AI feed (top items) */}
          <div className="mt-4 rounded-2xl border border-[#EAECF2] overflow-hidden">
            <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-[#EAECF2] bg-[#F8FAFC]">
              <Brain className="h-3.5 w-3.5 text-[var(--color-primary)]" />
              <span className="text-[12px] font-bold text-[#101828]">AI activity</span>
              <span className="ml-auto text-[10.5px] font-semibold text-[#98A2B3]">{s.aiFindings} findings · {s.criticalAlerts} alerts</span>
            </div>
            <div className="divide-y divide-[#F2F4F8]">
              {(s.aiFeed.length ? s.aiFeed : [{ id: "ph", tone: "info" as const, label: "Awaiting live feed", detail: "Connecting to clinical streams…", meta: undefined }]).slice(0, 3).map(item => (
                <div key={item.id} className="flex items-center gap-2.5 px-3.5 py-2.5">
                  <span className={cn("h-6 w-6 rounded-lg flex items-center justify-center flex-shrink-0",
                    item.tone === "critical" ? "bg-red-50 text-red-600" : item.tone === "ai" ? "bg-[var(--color-primary)]/[0.08] text-[var(--color-primary)]" : "bg-amber-50 text-amber-600")}>
                    {item.tone === "critical" ? <AlertTriangle className="h-3.5 w-3.5" /> : item.tone === "ai" ? <Sparkles className="h-3.5 w-3.5" /> : <Activity className="h-3.5 w-3.5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-bold text-[#101828] truncate">{item.detail}</p>
                    <p className="text-[10.5px] text-[#667085] truncate">{item.label}{item.meta ? ` · ${item.meta}` : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
