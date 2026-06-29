import { wrapAiResponse } from '@/lib/ai-helpers'
import type { AiEnvelope, AiAction } from '@/types/ai'
import { generatePreBrief } from './pre-brief'
import { suggestDiagnoses } from './diagnosis'
import { assessReadmissionRisk } from './readmission-risk'
import { detectLabAnomalies } from './lab-anomaly'
import { monitorSepsisMarkers } from './sepsis-alert'
import { generateHandoverBrief } from './handover-brief'
import { retrieveProtocol } from './clinical-protocol'
import { suggestBillingCodes } from './billing-suggest'
import { detectBillingAnomalies } from './fraud-detect'
import { useAuditStore } from '@/store/useAuditStore'

export type CopilotRole =
  | 'doctor'
  | 'nurse'
  | 'billing'
  | 'insurance'
  | 'admin'
  | 'hr'
  | 'quality'
  | 'discharge'
  | 'reception'

export interface CopilotContext {
  role: CopilotRole
  patientId?: string
  patientName?: string
  wardId?: string
  view: string
  userId: string
  userName: string
}

export interface CopilotInsight {
  id: string
  title: string
  body: string
  sourceService: string
  priority: 'urgent' | 'info' | 'suggestion'
  actions?: AiAction[]
}

export interface CopilotResponse {
  role: CopilotRole
  chips: string[]
  insights: AiEnvelope<CopilotInsight>[]
  sessionId: string
  generatedAt: string
}

function makeSessionId() {
  return `COP-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function buildChips(ctx: CopilotContext): string[] {
  const chips: string[] = [`Role: ${ctx.role}`]
  if (ctx.patientName) chips.push(`Patient: ${ctx.patientName}`)
  if (ctx.wardId) chips.push(`Ward: ${ctx.wardId}`)
  chips.push(`View: ${ctx.view.split('/').filter(Boolean).join(' › ')}`)
  return chips
}

// ─── Doctor Copilot ───────────────────────────────────────────────────────────

async function doctorCopilot(ctx: CopilotContext): Promise<AiEnvelope<CopilotInsight>[]> {
  const patientId = ctx.patientId ?? 'demo-patient'
  const demoVitals = { bp: '120/80', temp: '98.6', spo2: '98', pulse: '78', weight: '70' }

  const results = await Promise.allSettled([
    generatePreBrief(patientId),
    suggestDiagnoses('Patient presenting with symptoms', demoVitals),
    assessReadmissionRisk(patientId),
    detectLabAnomalies(demoVitals),
  ])

  const insights: AiEnvelope<CopilotInsight>[] = []

  if (results[0].status === 'fulfilled') {
    const brief = results[0].value
    insights.push(wrapAiResponse<CopilotInsight>(
      {
        id: 'pre-brief',
        title: 'Patient Pre-Brief',
        body: `${brief.data.chiefComplaint}. Active: ${brief.data.activeConditions.slice(0, 2).join(', ')}. Alerts: ${brief.data.recentLabAlerts.join(', ') || 'None'}.`,
        sourceService: 'generatePreBrief',
        priority: 'info',
        actions: [{ id: 'open-records', label: 'View Full Records', type: 'navigate', payload: { path: '/doctor/records' }, requiresConfirmation: false }],
      },
      brief.confidence,
      brief.reasoning
    ))
  }

  if (results[1].status === 'fulfilled') {
    const diag = results[1].value
    const top = diag.data.slice(0, 2).map(d => d.description).join(', ')
    insights.push(wrapAiResponse<CopilotInsight>(
      {
        id: 'diagnoses',
        title: 'Differential Suggestions',
        body: `Top candidates: ${top}. Review supporting evidence and rule out differentials.`,
        sourceService: 'suggestDiagnoses',
        priority: 'suggestion',
      },
      diag.confidence,
      diag.reasoning
    ))
  }

  if (results[2].status === 'fulfilled') {
    const risk = results[2].value
    const level = risk.data.riskLevel
    const urgent = level === 'high'
    const riskPct = Math.round(risk.data.thirtyDayRisk * 100)
    insights.push(wrapAiResponse<CopilotInsight>(
      {
        id: 'readmission-risk',
        title: `Readmission Risk: ${level.toUpperCase()}`,
        body: `30-day risk: ${riskPct}%. Factors: ${risk.data.riskFactors.slice(0, 2).join(', ')}. ${risk.data.interventions[0] ?? ''}`,
        sourceService: 'assessReadmissionRisk',
        priority: urgent ? 'urgent' : 'info',
      },
      risk.confidence,
      risk.reasoning
    ))
  }

  if (results[3].status === 'fulfilled') {
    const labs = results[3].value
    const alerts = labs.data.filter(l => l.severity === 'critical')
    if (alerts.length > 0) {
      insights.push(wrapAiResponse<CopilotInsight>(
        {
          id: 'lab-anomaly',
          title: `${alerts.length} Critical Lab Value(s)`,
          body: alerts.map(a => `${a.testName}: ${a.value} ${a.unit}`).join(', '),
          sourceService: 'detectLabAnomalies',
          priority: 'urgent',
          actions: [{ id: 'view-labs', label: 'Go to Lab Results', type: 'navigate', payload: { path: '/lab/dashboard' }, requiresConfirmation: false }],
        },
        labs.confidence,
        labs.reasoning
      ))
    }
  }

  return insights
}

// ─── Nurse Copilot ────────────────────────────────────────────────────────────

async function nurseCopilot(ctx: CopilotContext): Promise<AiEnvelope<CopilotInsight>[]> {
  const wardId = ctx.wardId ?? 'WARD-01'
  const demoVitals = { bp: '120/80', temp: '98.6', spo2: '98', pulse: '78' }
  const results = await Promise.allSettled([
    monitorSepsisMarkers(demoVitals),
    generateHandoverBrief(wardId),
    retrieveProtocol('general nursing'),
  ])

  const insights: AiEnvelope<CopilotInsight>[] = []

  if (results[0].status === 'fulfilled') {
    const sepsis = results[0].value
    if (sepsis.data.isSepsisAlert) {
      insights.push(wrapAiResponse<CopilotInsight>(
        {
          id: 'sepsis-risk',
          title: 'Sepsis Alert',
          body: `SOFA: ${sepsis.data.sofahScore ?? 'N/A'}. Actions: ${sepsis.data.immediateActions.slice(0, 2).join('; ')}.`,
          sourceService: 'monitorSepsisMarkers',
          priority: 'urgent',
        },
        sepsis.confidence,
        sepsis.reasoning
      ))
    }
  }

  if (results[1].status === 'fulfilled') {
    const handover = results[1].value
    const pCount = handover.data.patients.length
    insights.push(wrapAiResponse<CopilotInsight>(
      {
        id: 'handover-brief',
        title: 'Shift Handover Summary',
        body: `${pCount} patient(s) in handover brief. Incoming: ${handover.data.incomingNurse}. Ward: ${handover.data.wardId}.`,
        sourceService: 'generateHandoverBrief',
        priority: 'info',
      },
      handover.confidence,
      handover.reasoning
    ))
  }

  if (results[2].status === 'fulfilled') {
    const protocol = results[2].value
    insights.push(wrapAiResponse<CopilotInsight>(
      {
        id: 'protocol',
        title: 'Nursing Protocol',
        body: protocol.data.steps?.slice(0, 2).join(' → ') ?? 'Protocol retrieved.',
        sourceService: 'retrieveProtocol',
        priority: 'suggestion',
      },
      protocol.confidence,
      protocol.reasoning
    ))
  }

  return insights
}

// ─── Billing Copilot ──────────────────────────────────────────────────────────

async function billingCopilot(ctx: CopilotContext): Promise<AiEnvelope<CopilotInsight>[]> {
  const encounter: Record<string, unknown> = { patientId: ctx.patientId ?? 'demo', hasProcedure: false }
  const results = await Promise.allSettled([
    suggestBillingCodes(encounter),
    detectBillingAnomalies(ctx.patientId ?? 'demo'),
  ])

  const insights: AiEnvelope<CopilotInsight>[] = []

  if (results[0].status === 'fulfilled') {
    const codes = results[0].value
    const topCodes = codes.data.codes.slice(0, 3).map(c => `${c.code} (${c.description})`).join(', ')
    insights.push(wrapAiResponse<CopilotInsight>(
      {
        id: 'billing-codes',
        title: 'Suggested Billing Codes',
        body: `${topCodes}. Review for completeness before freezing the bill.`,
        sourceService: 'suggestBillingCodes',
        priority: 'suggestion',
      },
      codes.confidence,
      codes.reasoning
    ))
  }

  if (results[1].status === 'fulfilled') {
    const anomalies = results[1].value
    const flagged = anomalies.data.filter((a: { severity?: string }) => a.severity === 'high').length
    if (flagged > 0) {
      insights.push(wrapAiResponse<CopilotInsight>(
        {
          id: 'billing-anomaly',
          title: `${flagged} Billing Anomaly(ies) Detected`,
          body: 'High-severity billing anomalies require review before submission.',
          sourceService: 'detectBillingAnomalies',
          priority: 'urgent',
        },
        anomalies.confidence,
        anomalies.reasoning
      ))
    }
  }

  return insights
}

// ─── Generic Copilots ─────────────────────────────────────────────────────────

async function genericCopilot(ctx: CopilotContext): Promise<AiEnvelope<CopilotInsight>[]> {
  return [
    wrapAiResponse<CopilotInsight>(
      {
        id: 'generic-tip',
        title: `${ctx.role.charAt(0).toUpperCase() + ctx.role.slice(1)} Copilot Active`,
        body: `AI assistance is available for your ${ctx.role} workflows. Ask a question or wait for proactive suggestions.`,
        sourceService: 'copilot-orchestrator',
        priority: 'info',
      },
      0.9,
      'Default copilot greeting for role without specific patient context.'
    ),
  ]
}

// ─── Main Orchestrator ────────────────────────────────────────────────────────

export async function invokeCopilot(ctx: CopilotContext): Promise<CopilotResponse> {
  let insights: AiEnvelope<CopilotInsight>[] = []

  switch (ctx.role) {
    case 'doctor':
      insights = await doctorCopilot(ctx)
      break
    case 'nurse':
      insights = await nurseCopilot(ctx)
      break
    case 'billing':
    case 'insurance':
      insights = await billingCopilot(ctx)
      break
    default:
      insights = await genericCopilot(ctx)
  }

  useAuditStore.getState().log({
    userId: ctx.userId,
    userName: ctx.userName,
    action: 'copilot_invoked',
    resource: 'ai_copilot',
    resourceId: ctx.patientId ?? 'none',
    detail: `Copilot invoked for role: ${ctx.role} on view: ${ctx.view}. ${insights.length} insights generated.`,
  })

  return {
    role: ctx.role,
    chips: buildChips(ctx),
    insights,
    sessionId: makeSessionId(),
    generatedAt: new Date().toISOString(),
  }
}
