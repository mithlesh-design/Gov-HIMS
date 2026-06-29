export type FeedbackVisitType = 'ipd' | 'opd'
export type FeedbackSentiment = 'positive' | 'neutral' | 'negative'
export type FeedbackStatus   = 'pending' | 'submitted' | 'expired'

export interface FeedbackCategoryRatings {
  doctorProfessionalism: number
  clinicalExpertise:     number
  communication:         number
  nursingCare:           number
  facilityCleanliness:   number
  waitTime:              number
  billingClarity:        number
}

export interface FeedbackRequest {
  id: string
  patientId: string
  patientName: string
  visitId: string
  visitType: FeedbackVisitType
  attendingDoctor: string
  department: string
  diagnosis?: string
  visitDate: string
  status: FeedbackStatus
  expiresAt: string
}

export interface FeedbackRecord {
  id: string
  requestId: string
  patientId: string
  patientName: string
  visitId: string
  visitType: FeedbackVisitType
  attendingDoctor: string
  department: string
  diagnosis?: string
  visitDate: string
  overallRating: 1 | 2 | 3 | 4 | 5
  categories: FeedbackCategoryRatings
  nps: number
  comment?: string
  wouldRecommend: boolean
  sentiment: FeedbackSentiment
  themes: string[]
  submittedAt: string
}

export interface FeedbackAnalyticsSummary {
  totalFeedback: number
  avgRating: number
  npsScore: number
  responseRate: number
  sentimentBreakdown: { positive: number; neutral: number; negative: number }
  ratingDistribution: { rating: number; count: number }[]
  topThemes: string[]
  categoryAverages: FeedbackCategoryRatings
  monthlyTrend: { month: string; avg: number; count: number }[]
  byDoctor: { doctor: string; avg: number; count: number }[]
  byDepartment: { dept: string; avg: number; count: number }[]
}
