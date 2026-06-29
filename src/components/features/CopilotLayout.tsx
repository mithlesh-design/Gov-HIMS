"use client"

import { FLAGS } from "@/config/feature-flags"
import { CopilotPane } from "@/components/features/CopilotPane"
import type { CopilotRole } from "@/ai-services/copilot-orchestrator"

interface CopilotLayoutProps {
  children: React.ReactNode
  role: CopilotRole
  patientId?: string
  patientName?: string
  wardId?: string
}

export function CopilotLayout({ children, role, patientId, patientName, wardId }: CopilotLayoutProps) {
  if (!FLAGS.copilotEnabled) {
    return <>{children}</>
  }

  return (
    <>
      {children}
      <CopilotPane role={role} patientId={patientId} patientName={patientName} wardId={wardId} />
    </>
  )
}
