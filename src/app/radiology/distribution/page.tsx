"use client"

import { useMemo, useState } from "react"
import {
  Send, MessageCircle, Mail, Smartphone, UserCircle, Sparkles, CheckCircle2, FileText,
} from "lucide-react"
import { useRadiologyStudiesStore, type RadiologyStudy } from "@/store/useRadiologyStudiesStore"
import { useAuthStore } from "@/store/useAuthStore"
import { patientFriendlySummary } from "@/lib/radiologyAI"
import { notifyAndAudit } from "@/lib/notifyAndAudit"
import { type NotificationChannel } from "@/store/useNotificationStore"
import { StatCard } from "@/components/ui/stat-card"
import { AiDisclaimer } from "@/components/ui/AiDisclaimer"
import { EmptyState } from "@/components/ui/EmptyState"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const CHANNELS: { key: NotificationChannel; label: string; icon: typeof Mail; to: "patient" | "doctor" }[] = [
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle, to: "patient" },
  { key: "sms", label: "SMS", icon: Smartphone, to: "patient" },
  { key: "email", label: "Email", icon: Mail, to: "doctor" },
  { key: "in_app", label: "Portal", icon: UserCircle, to: "patient" },
]

export default function ResultDistribution() {
  const studies = useRadiologyStudiesStore(s => s.studies)
  const recordDistribution = useRadiologyStudiesStore(s => s.recordDistribution)
  const me = useAuthStore(s => s.currentUser)
  const meName = me?.name ?? "Radiology"
  const [openSummary, setOpenSummary] = useState<string | null>(null)

  const released = useMemo(() => studies.filter(s => s.status === "released" || s.status === "verified")
    .sort((a, b) => new Date(b.releasedAt ?? b.orderedAt).getTime() - new Date(a.releasedAt ?? a.orderedAt).getTime()), [studies])

  const delivered = released.filter(s => (s.distribution?.length ?? 0) > 0)

  const send = (s: RadiologyStudy, ch: typeof CHANNELS[number]) => {
    const to = ch.to === "patient" ? s.patientName : s.doctorName
    recordDistribution(s.id, { channel: ch.key, to, sentAt: new Date().toISOString(), label: ch.label })
    notifyAndAudit({
      to: ch.to, type: "lab_result", priority: "medium",
      title: `Radiology report delivered · ${s.name}`,
      body: `${s.name} for ${s.patientName} sent via ${ch.label}.`,
      patientName: s.patientName,
      channels: [ch.key],
      audit: { action: "radiology_report_verified", resource: "radiology_study", resourceId: s.id, detail: `Distributed via ${ch.label} to ${to}`, userName: meName },
    })
    toast.success(`Sent via ${ch.label} to ${to}`)
  }

  return (
    <div className="space-y-6">
      <p className="t-body text-foreground-lighter">
        Deliver released reports to patients &amp; referrers · AI patient-friendly summaries
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Released" value={released.length} sub="ready to distribute" icon={FileText} color="blue" />
        <StatCard label="Delivered" value={delivered.length} sub="at least one channel" icon={CheckCircle2} color="green" />
        <StatCard label="Pending" value={released.length - delivered.length} sub="not yet sent" icon={Send} color="amber" />
        <StatCard label="Channels" value={4} sub="WhatsApp · SMS · Email · Portal" icon={MessageCircle} color="blue" />
      </div>

      <AiDisclaimer compact />

      <div className="space-y-3">
        {released.length === 0 ? (
          <EmptyState icon={FileText} title="No released reports yet" size="sm" />
        ) : released.map(s => {
          const summary = patientFriendlySummary(s.reportSections, s.patientName).data.summary
          const sentChannels = new Set((s.distribution ?? []).map(d => d.channel))
          return (
            <div key={s.id} className="hms-card p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-foreground">{s.patientName} <span className="text-[12px] font-medium text-foreground-placeholder">· {s.name}</span></p>
                  <p className="text-[12.5px] text-foreground-lighter mt-0.5 line-clamp-2">{s.reportSections.impression || "Report verified."}</p>
                </div>
                <button onClick={() => setOpenSummary(openSummary === s.id ? null : s.id)}
                  className="u-press inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-semibold bg-accent-soft text-primary-dark border border-primary/15 hover:border-primary/30 cursor-pointer flex-shrink-0 transition-colors">
                  <Sparkles className="h-3.5 w-3.5" /> {openSummary === s.id ? "Hide" : "Patient summary"}
                </button>
              </div>

              {openSummary === s.id && (
                <div className="mt-3 rounded-xl bg-accent-soft border border-primary/15 p-3.5">
                  <p className="t-overline text-primary-dark mb-1 flex items-center gap-1"><Sparkles className="h-3 w-3" /> AI plain-language summary</p>
                  <p className="text-[13px] text-foreground-muted leading-relaxed">{summary}</p>
                </div>
              )}

              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {CHANNELS.map(ch => {
                  const Icon = ch.icon
                  const sent = sentChannels.has(ch.key)
                  return (
                    <button key={ch.key} onClick={() => send(s, ch)}
                      className={cn("u-press inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold border transition-colors cursor-pointer",
                        sent ? "bg-success-bg text-success-strong border-success/25" : "bg-surface text-foreground-muted border-border hover:border-primary hover:text-primary-dark")}>
                      <Icon className="h-3.5 w-3.5" /> {ch.label}{sent && <CheckCircle2 className="h-3 w-3" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
