import { wrapAiResponse } from '@/lib/ai-helpers'
import type { AiEnvelope, AiAction } from '@/types/ai'
import { assessVendorRisk } from './vendor-risk-assessor'
import type { VMVendor, VMContract, VMPayment, VMPurchaseOrder } from '@/store/useVendorManagerStore'

export interface VendorCopilotInsight {
  id: string
  title: string
  body: string
  sourceService: string
  priority: 'urgent' | 'warning' | 'info' | 'positive'
  actions?: AiAction[]
}

export interface VendorCopilotResponse {
  insights: AiEnvelope<VendorCopilotInsight>[]
  chips: string[]
  sessionId: string
  generatedAt: string
}

function makeSessionId() {
  return `VCP-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// ─── Individual insight generators ────────────────────────────────────────────

async function highRiskInsights(vendors: VMVendor[]): Promise<AiEnvelope<VendorCopilotInsight>[]> {
  const highRisk = vendors.filter(v => v.riskLevel === 'high' || v.aiRiskScore >= 65)
  if (highRisk.length === 0) return []

  const reports = await Promise.allSettled(highRisk.slice(0, 3).map(v => assessVendorRisk(v)))
  return reports
    .filter((r): r is PromiseFulfilledResult<typeof reports[0] extends PromiseFulfilledResult<infer T> ? T : never> => r.status === 'fulfilled')
    .map(r => {
      const rpt = (r as PromiseFulfilledResult<Awaited<ReturnType<typeof assessVendorRisk>>>).value
      return wrapAiResponse<VendorCopilotInsight>(
        {
          id: `risk-${rpt.data.vendorId}`,
          title: `High-Risk Vendor: ${rpt.data.vendorName}`,
          body: `Risk score ${rpt.data.overallScore}/100. ${rpt.data.flags.slice(0, 2).join('. ')}. ${rpt.data.recommendation}`,
          sourceService: 'vendor-risk-assessor',
          priority: 'urgent',
          actions: [{ id: 'view-vendor', label: 'View Vendor Profile', type: 'navigate', payload: { path: '/vendor-manager/vendors' }, requiresConfirmation: false }],
        },
        rpt.confidence,
        rpt.reasoning
      )
    })
}

async function expiringContractInsights(contracts: VMContract[]): Promise<AiEnvelope<VendorCopilotInsight>[]> {
  const refDate = new Date('2026-06-08')
  const cutoff30 = new Date(refDate.getTime() + 30 * 86400000).toISOString().slice(0, 10)
  const expiring = contracts.filter(
    c => (c.status === 'active' || c.status === 'expiring_soon') && c.endDate <= cutoff30
  )
  if (expiring.length === 0) return []

  await new Promise(r => setTimeout(r, 150))
  const names = expiring.slice(0, 3).map(c => `${c.vendorName} (${c.title.slice(0, 30)}, ends ${c.endDate})`).join('; ')
  return [
    wrapAiResponse<VendorCopilotInsight>(
      {
        id: 'expiring-contracts',
        title: `${expiring.length} Contract${expiring.length > 1 ? 's' : ''} Expiring Within 30 Days`,
        body: `Immediate action required: ${names}. Initiate renewal negotiations or issue PO extensions to avoid supply disruption.`,
        sourceService: 'vendor-copilot',
        priority: 'warning',
        actions: [{ id: 'view-contracts', label: 'Manage Contracts', type: 'navigate', payload: { path: '/vendor-manager/contracts' }, requiresConfirmation: false }],
      },
      0.91,
      `${expiring.length} contracts have end dates on or before ${cutoff30}.`
    ),
  ]
}

async function overduePaymentInsights(payments: VMPayment[]): Promise<AiEnvelope<VendorCopilotInsight>[]> {
  const overdue = payments.filter(p => p.status === 'overdue')
  if (overdue.length === 0) return []

  const totalOverdue = overdue.reduce((s, p) => s + p.amount, 0)
  const names = overdue.slice(0, 3).map(p => p.vendorName).filter((v, i, a) => a.indexOf(v) === i).join(', ')
  await new Promise(r => setTimeout(r, 100))
  return [
    wrapAiResponse<VendorCopilotInsight>(
      {
        id: 'overdue-payments',
        title: `₹${(totalOverdue / 100000).toFixed(1)}L in Overdue Payments`,
        body: `${overdue.length} payment${overdue.length > 1 ? 's' : ''} past due totalling ₹${totalOverdue.toLocaleString('en-IN')}. Affected vendors: ${names}. Delayed payments risk supply interruption and late-payment penalties.`,
        sourceService: 'vendor-copilot',
        priority: 'urgent',
        actions: [{ id: 'view-payments', label: 'Review Payments', type: 'navigate', payload: { path: '/vendor-manager/payments' }, requiresConfirmation: false }],
      },
      0.95,
      `${overdue.length} payments with status=overdue found in payment ledger.`
    ),
  ]
}

async function spendOptimizationInsights(vendors: VMVendor[]): Promise<AiEnvelope<VendorCopilotInsight>[]> {
  const byCategory: Record<string, VMVendor[]> = {}
  vendors.forEach(v => {
    if (!byCategory[v.category]) byCategory[v.category] = []
    byCategory[v.category].push(v)
  })

  const opportunities: string[] = []
  for (const [cat, vList] of Object.entries(byCategory)) {
    const medium = vList.filter(v => v.riskLevel === 'medium')
    const low = vList.filter(v => v.riskLevel === 'low' && v.status === 'active')
    if (medium.length > 0 && low.length > 0) {
      opportunities.push(`In ${cat}, consider consolidating medium-risk vendors into ${low[0].name} (risk score ${low[0].aiRiskScore}/100)`)
    }
  }

  if (opportunities.length === 0) return []
  await new Promise(r => setTimeout(r, 200))
  return [
    wrapAiResponse<VendorCopilotInsight>(
      {
        id: 'spend-optimization',
        title: 'Vendor Consolidation Opportunity Detected',
        body: `${opportunities[0]}. Consolidating spend with lower-risk vendors can reduce procurement overhead by an estimated 8–12%.`,
        sourceService: 'vendor-copilot',
        priority: 'info',
        actions: [{ id: 'view-performance', label: 'Compare Vendors', type: 'navigate', payload: { path: '/vendor-manager/performance' }, requiresConfirmation: false }],
      },
      0.74,
      'Opportunity identified by comparing vendor risk scores within the same category.'
    ),
  ]
}

async function topPerformerInsights(vendors: VMVendor[]): Promise<AiEnvelope<VendorCopilotInsight>[]> {
  const active = vendors.filter(v => v.status === 'active')
  if (active.length === 0) return []

  const top = [...active].sort((a, b) => (b.qualityScore + b.deliveryScore) - (a.qualityScore + a.deliveryScore))[0]
  await new Promise(r => setTimeout(r, 80))
  return [
    wrapAiResponse<VendorCopilotInsight>(
      {
        id: 'top-performer',
        title: `Top Performer: ${top.name}`,
        body: `Quality ${top.qualityScore}/100 · Delivery ${top.deliveryScore}/100 · AI Risk ${top.aiRiskScore}/100. This vendor consistently exceeds SLA targets. Recommend prioritising for upcoming high-value contracts.`,
        sourceService: 'vendor-copilot',
        priority: 'positive',
      },
      0.86,
      `Ranked highest composite score (quality + delivery) among ${active.length} active vendors.`
    ),
  ]
}

async function poorDeliveryPOInsights(
  vendors: VMVendor[],
  pos: VMPurchaseOrder[]
): Promise<AiEnvelope<VendorCopilotInsight>[]> {
  const activePOs = pos.filter(p => p.status === 'sent' || p.status === 'acknowledged')
  const atRisk = activePOs.filter(po => {
    const vendor = vendors.find(v => v.id === po.vendorId)
    return vendor && vendor.deliveryScore < 70
  })

  if (atRisk.length === 0) return []
  await new Promise(r => setTimeout(r, 120))
  const names = atRisk.slice(0, 2).map(p => `PO ${p.id} (${p.vendorName})`).join(', ')
  return [
    wrapAiResponse<VendorCopilotInsight>(
      {
        id: 'po-at-risk',
        title: `${atRisk.length} Active PO${atRisk.length > 1 ? 's' : ''} With Low-Delivery-Rate Vendor`,
        body: `${names} — these vendors have delivery scores below 70%. Consider escalating to expedited status or identifying backup suppliers to avoid stock-outs.`,
        sourceService: 'vendor-copilot',
        priority: 'warning',
        actions: [{ id: 'view-pos', label: 'Track Purchase Orders', type: 'navigate', payload: { path: '/vendor-manager/purchase-orders' }, requiresConfirmation: false }],
      },
      0.81,
      `${atRisk.length} open POs linked to vendors with deliveryScore < 70.`
    ),
  ]
}

// ─── Main orchestrator ────────────────────────────────────────────────────────

export async function invokeVendorCopilot(
  vendors: VMVendor[],
  contracts: VMContract[],
  payments: VMPayment[],
  purchaseOrders: VMPurchaseOrder[]
): Promise<VendorCopilotResponse> {
  const sessionId = makeSessionId()

  const [riskResults, contractResults, paymentResults, spendResults, perfResults, poResults] =
    await Promise.allSettled([
      highRiskInsights(vendors),
      expiringContractInsights(contracts),
      overduePaymentInsights(payments),
      spendOptimizationInsights(vendors),
      topPerformerInsights(vendors),
      poorDeliveryPOInsights(vendors, purchaseOrders),
    ])

  const insights: AiEnvelope<VendorCopilotInsight>[] = []
  for (const r of [riskResults, contractResults, paymentResults, spendResults, perfResults, poResults]) {
    if (r.status === 'fulfilled') insights.push(...r.value)
  }

  // Sort: urgent > warning > info > positive
  const ORDER: Record<string, number> = { urgent: 0, warning: 1, info: 2, positive: 3 }
  insights.sort((a, b) => (ORDER[a.data.priority] ?? 4) - (ORDER[b.data.priority] ?? 4))

  const chips = [
    `${vendors.filter(v => v.status === 'active').length} Active Vendors`,
    `${contracts.filter(c => c.status === 'active' || c.status === 'expiring_soon').length} Contracts`,
    `₹${(payments.filter(p => p.status === 'overdue').reduce((s, p) => s + p.amount, 0) / 100000).toFixed(1)}L Overdue`,
  ]

  return { insights, chips, sessionId, generatedAt: new Date().toISOString() }
}
