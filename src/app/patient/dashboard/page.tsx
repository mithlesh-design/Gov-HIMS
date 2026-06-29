"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { useAuthStore } from "@/store/useAuthStore"
import { usePatientLiveStore, stagesFor } from "@/store/usePatientLiveStore"
import { usePatientOrdersStore } from "@/store/usePatientOrdersStore"
import { AiCompanionBar } from "@/components/patient/dashboard/AiCompanionBar"
import { AiHealthSummaryCard } from "@/components/patient/dashboard/AiHealthSummaryCard"
import { LiveJourneyCard } from "@/components/patient/dashboard/LiveJourneyCard"
import { LiveFeed } from "@/components/patient/dashboard/LiveFeed"
import { ForYouCard } from "@/components/patient/dashboard/ForYouCard"
import { QuickActions } from "@/components/patient/dashboard/QuickActions"
import { HealthTrendsCard } from "@/components/patient/dashboard/HealthTrendsCard"
import { DoctorOrdersCard } from "@/components/patient/dashboard/DoctorOrdersCard"
import { FamilyTrackingCard } from "@/components/patient/dashboard/FamilyTrackingCard"
import { FamilyInviteCard } from "@/components/patient/dashboard/FamilyInviteCard"
import { ProactiveNudgesFeed } from "@/components/patient/dashboard/ProactiveNudgesFeed"
import { DemoControls } from "@/components/patient/dashboard/DemoControls"
import { StatusPill } from "@/components/ui/StatusPill"
import { ArrowRight } from "lucide-react"

export default function PatientDashboard() {
  const currentUser = useAuthStore(s => s.currentUser)
  const stage = usePatientLiveStore(s => s.stage)
  const mode = usePatientLiveStore(s => s.mode)
  const prevStage = useRef(stage)

  // Journey advancement is driven by the DemoControls presenter panel
  // (auto-plays by default; pause to narrate and step through stages).

  // Notify when called to a station — and when the doctor's orders arrive.
  useEffect(() => {
    if (stage !== prevStage.current) {
      const meta = stagesFor(mode).find(s => s.key === stage)
      if (meta?.isCall) toast.success(`It's your turn — ${meta.label}`, { description: meta.action })
      else if (stage === 'done') toast.success(mode === 'video' ? 'Consultation complete' : 'Visit complete', { description: 'Your summary is ready.' })

      // Doctor's orders land in real time the moment the prescription is issued.
      if (stage === 'pharmacy' || stage === 'prescription') {
        const orders = usePatientOrdersStore.getState()
        if (!orders.received) {
          orders.receiveOrders()
          const tests = orders.items.filter(i => i.kind === 'test').length
          const meds = orders.items.filter(i => i.kind === 'medicine').length
          toast.message(`New orders from ${orders.doctor}`, {
            description: `${tests} tests & ${meds} medicines to review and pay — tap Doctor's orders on your dashboard.`,
          })
        }
      }
      prevStage.current = stage
    }
  }, [stage, mode])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const first = (currentUser?.name ?? 'there').split(' ')[0]

  // Patient-centred: answer "what's happening to me / what's next" above the fold.
  const stageMeta = stagesFor(mode).find(s => s.key === stage)
  const isDone = stage === 'done'

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <div className="mb-5">
        <p className="t-overline text-foreground-lighter">{greeting}</p>
        <h2 className="t-h1 text-foreground mt-0.5">{first}, here&apos;s your health today</h2>

        {/* Reassurance strip — where you are now + the one thing to do next. */}
        {stageMeta && (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <StatusPill
              status={isDone ? 'done' : stageMeta.isCall ? 'urgent' : 'info'}
              label={isDone ? 'Visit complete' : `Now: ${stageMeta.label}`}
              size="md"
            />
            {!isDone && stageMeta.action && (
              <span className="inline-flex items-center gap-1.5 t-body text-foreground-muted">
                <ArrowRight className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                {stageMeta.action}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="space-y-5">
        {/* M4-W5 — S11: AI Health Summary at the top of the patient portal. */}
        <AiHealthSummaryCard />
        <AiCompanionBar />
        <div className="grid lg:grid-cols-3 gap-5 items-start">
          <div className="lg:col-span-2 space-y-5">
            <DoctorOrdersCard />
            <LiveJourneyCard />
            {/* M4-W5 — S13: Proactive Patient Nudges feed. */}
            <ProactiveNudgesFeed />
            <HealthTrendsCard />
            <ForYouCard />
            <QuickActions />
          </div>
          <div className="lg:col-span-1 space-y-5">
            <LiveFeed />
            <FamilyTrackingCard />
            {/* M4-W5 — S12: Family-Track v2 mock WhatsApp invite. */}
            <FamilyInviteCard />
          </div>
        </div>
      </div>
      <DemoControls />
    </div>
  )
}
