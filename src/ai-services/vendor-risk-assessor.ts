import { wrapAiResponse } from '@/lib/ai-helpers'
import type { AiEnvelope } from '@/types/ai'
import type { VMVendor } from '@/store/useVendorManagerStore'

export interface VendorRiskReport {
  vendorId: string
  vendorName: string
  overallScore: number          // 0–100, higher = more risky
  tier: 'low' | 'medium' | 'high'
  flags: string[]
  recommendation: string
  actionRequired: boolean
}

function computeRiskScore(vendor: VMVendor): number {
  // Weighted model: delivery 40%, quality 35%, payment history 25%
  const deliveryRisk = (100 - vendor.deliveryScore) * 0.4
  const qualityRisk = (100 - vendor.qualityScore) * 0.35
  const statusPenalty =
    vendor.status === 'on_probation' ? 15
    : vendor.status === 'suspended' ? 25
    : vendor.status === 'inactive'  ? 20
    : 0
  return Math.min(100, Math.round(deliveryRisk + qualityRisk + statusPenalty))
}

function buildFlags(vendor: VMVendor): string[] {
  const flags: string[] = []
  if (vendor.deliveryScore < 60) flags.push(`Low delivery rate (${vendor.deliveryScore}%)`)
  if (vendor.qualityScore   < 60) flags.push(`Below-par quality score (${vendor.qualityScore}/100)`)
  if (vendor.status === 'on_probation') flags.push('Vendor on probation — requires close monitoring')
  if (vendor.status === 'inactive')     flags.push('Vendor is currently inactive')
  if (vendor.activeContracts === 0 && vendor.totalSpend > 0)
    flags.push('Active spend with no current contract')
  if (vendor.paymentTerms === 'prepaid' && vendor.riskLevel !== 'low')
    flags.push('Prepaid terms with elevated risk profile')
  return flags
}

export async function assessVendorRisk(vendor: VMVendor): Promise<AiEnvelope<VendorRiskReport>> {
  await new Promise(r => setTimeout(r, 300 + Math.random() * 200))

  const score = computeRiskScore(vendor)
  const tier  = score >= 60 ? 'high' : score >= 35 ? 'medium' : 'low'
  const flags = buildFlags(vendor)

  const recommendation =
    tier === 'high'
      ? `Escalate to procurement committee. Consider transitioning to an alternate ${vendor.category} supplier while this vendor improves performance metrics.`
      : tier === 'medium'
      ? `Schedule a quarterly vendor review. Require corrective-action plan for delivery and quality shortfalls.`
      : `Vendor is performing within acceptable thresholds. Continue standard monitoring at contract-renewal review.`

  const confidence = tier === 'low' ? 0.88 : tier === 'medium' ? 0.82 : 0.79

  return wrapAiResponse<VendorRiskReport>(
    { vendorId: vendor.id, vendorName: vendor.name, overallScore: score, tier, flags, recommendation, actionRequired: tier === 'high' },
    confidence,
    `Risk computed from delivery score (${vendor.deliveryScore}), quality score (${vendor.qualityScore}), status (${vendor.status}), and contract coverage.`
  )
}

export async function batchAssessRisk(vendors: VMVendor[]): Promise<AiEnvelope<VendorRiskReport>[]> {
  const results = await Promise.allSettled(vendors.map(v => assessVendorRisk(v)))
  return results
    .filter((r): r is PromiseFulfilledResult<AiEnvelope<VendorRiskReport>> => r.status === 'fulfilled')
    .map(r => r.value)
}
