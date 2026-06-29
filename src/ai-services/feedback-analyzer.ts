import { wrapAiResponse } from '@/lib/ai-helpers'
import type { AiEnvelope } from '@/types/ai'
import type { FeedbackRecord, FeedbackSentiment } from '@/types/feedback'

export interface FeedbackInsightReport {
  overallSentiment:  FeedbackSentiment
  satisfactionScore: number
  npsCategory:       'promoter' | 'passive' | 'detractor'
  keyStrengths:      string[]
  improvementAreas:  string[]
  priorityAlert?:    string
  recommendations:   string[]
  processedCount:    number
}

const STRENGTH_KEYWORDS: Record<string, string[]> = {
  'Exceptional doctor care':       ['excellent doctor', 'wonderful doctor', 'great doctor', 'best doctor', 'doctor explained', 'very professional', 'attentive physician'],
  'Outstanding nursing staff':     ['nurse', 'nursing staff', 'caring nurses', 'nursing team', 'exceptional nursing', 'attentive nurse'],
  'Clean and hygienic facility':   ['clean', 'hygienic', 'neat', 'sanitary', 'spotless', 'well-maintained'],
  'Effective communication':       ['explained clearly', 'good communication', 'informed well', 'clearly explained', 'understood everything'],
  'Quick response':                ['quick', 'fast response', 'immediate', 'prompt', 'responsive'],
  'Advanced medical expertise':    ['expertise', 'knowledgeable', 'experienced', 'specialist', 'clinical excellence'],
  'Smooth discharge process':      ['smooth discharge', 'good discharge', 'quick discharge'],
  'Transparent billing':           ['clear bill', 'billing was clear', 'transparent billing', 'easy payment'],
}

const ISSUE_KEYWORDS: Record<string, string[]> = {
  'Long wait times':               ['long wait', 'waiting time', 'waited hours', 'delayed', 'slow queue', '2 hours', '3 hours'],
  'Billing complexity':            ['billing confusing', 'confusing bill', 'unclear charges', 'expensive', 'overcharged', 'billing issues'],
  'Staff communication gaps':      ['not informed', 'no information', 'not explained', 'rude staff', 'unhelpful', 'not helpful'],
  'Facility cleanliness':          ['dirty', 'unclean', 'unhygienic', 'not clean', 'dirty washroom', 'not hygienic'],
  'Food quality':                  ['bad food', 'food quality', 'tasteless food', 'poor food', 'food not good'],
  'Parking and access':            ['parking', 'difficult access', 'no parking', 'parking problem'],
  'Nursing responsiveness':        ['nurse slow', 'nurses not responsive', 'nursing delayed', 'attendant not available'],
  'OPD consultation time':         ['short consultation', '10 minutes', 'quick visit', 'rushed consultation'],
}

function analyzeText(records: FeedbackRecord[], keywordMap: Record<string, string[]>): string[] {
  const allComments = records.map(r => (r.comment ?? '').toLowerCase()).join(' ')
  return Object.entries(keywordMap)
    .map(([label, kws]) => ({ label, hits: kws.filter(k => allComments.includes(k)).length }))
    .filter(x => x.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 3)
    .map(x => x.label)
}

function npsCategory(score: number): 'promoter' | 'passive' | 'detractor' {
  if (score >= 30) return 'promoter'
  if (score >= 0)  return 'passive'
  return 'detractor'
}

export async function analyzeHospitalFeedback(
  records: FeedbackRecord[],
): Promise<AiEnvelope<FeedbackInsightReport>> {
  await new Promise(r => setTimeout(r, 700))

  if (records.length === 0) {
    return wrapAiResponse<FeedbackInsightReport>(
      {
        overallSentiment: 'neutral', satisfactionScore: 0,
        npsCategory: 'passive', keyStrengths: [],
        improvementAreas: [], recommendations: ['Collect feedback to enable AI analysis.'],
        processedCount: 0,
      },
      0.5, 'Insufficient data for analysis.',
    )
  }

  const avgRating   = records.reduce((s, r) => s + r.overallRating, 0) / records.length
  const avgNps      = records.reduce((s, r) => s + r.nps, 0)          / records.length
  const promoters   = records.filter(r => r.nps >= 9).length
  const detractors  = records.filter(r => r.nps <= 6).length
  const npsScore    = Math.round(((promoters - detractors) / records.length) * 100)
  const satScore    = Math.round((avgRating / 5) * 0.6 * 100 + (avgNps / 10) * 0.4 * 100)

  const positiveCount = records.filter(r => r.sentiment === 'positive').length
  const negativeCount = records.filter(r => r.sentiment === 'negative').length
  let overallSentiment: FeedbackSentiment = 'neutral'
  if (positiveCount > negativeCount * 2)      overallSentiment = 'positive'
  else if (negativeCount > positiveCount * 1.5) overallSentiment = 'negative'

  const keyStrengths   = analyzeText(records, STRENGTH_KEYWORDS)
  const improvementAreas = analyzeText(records, ISSUE_KEYWORDS)

  const lowRatingCount = records.filter(r => r.overallRating <= 2).length
  const lowRatingPct   = (lowRatingCount / records.length) * 100
  let priorityAlert: string | undefined
  if (lowRatingPct >= 25) {
    priorityAlert = `${lowRatingCount} patients (${Math.round(lowRatingPct)}%) gave a rating of 2★ or below. Immediate quality review recommended.`
  } else if (negativeCount >= 3 && improvementAreas.includes('Long wait times')) {
    priorityAlert = 'Multiple patients flagged wait times as a critical issue. OPD workflow review advised.'
  }

  const recommendations: string[] = []
  if (improvementAreas.includes('Long wait times')) recommendations.push('Review OPD scheduling and appointment slot management to reduce wait times.')
  if (improvementAreas.includes('Billing complexity')) recommendations.push('Introduce billing counsellors at discharge to walk patients through their bills.')
  if (improvementAreas.includes('Staff communication gaps')) recommendations.push('Conduct communication and empathy training for front-desk and nursing staff.')
  if (improvementAreas.includes('Facility cleanliness')) recommendations.push('Increase housekeeping round frequency in patient-facing areas.')
  if (improvementAreas.includes('Food quality')) recommendations.push('Review dietary menu and involve patients in meal preference surveys.')
  if (recommendations.length === 0) {
    recommendations.push('Continue current service quality standards — satisfaction scores are strong.')
    recommendations.push('Consider launching a patient loyalty programme to convert passive NPS respondents to promoters.')
  }
  recommendations.push('Share positive feedback highlights with clinical teams as recognition.')

  return wrapAiResponse<FeedbackInsightReport>(
    {
      overallSentiment, satisfactionScore: satScore,
      npsCategory: npsCategory(npsScore),
      keyStrengths,
      improvementAreas,
      priorityAlert,
      recommendations,
      processedCount: records.length,
    },
    0.84,
    `AI analysis of ${records.length} feedback records. Sentiment: ${overallSentiment}. Avg rating: ${avgRating.toFixed(1)}/5. NPS: ${npsScore}. Keyword analysis on ${records.filter(r => r.comment).length} comments.`,
  )
}
