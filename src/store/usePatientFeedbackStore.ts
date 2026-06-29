import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  FeedbackRecord, FeedbackRequest, FeedbackCategoryRatings,
  FeedbackAnalyticsSummary, FeedbackStatus, FeedbackSentiment, FeedbackVisitType,
} from '@/types/feedback'

let _seq = 100
const uid = (p: string) => `${p}-${++_seq}`
const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString()
const monthName = (offset: number) => {
  const m = new Date(); m.setMonth(m.getMonth() - offset)
  return m.toLocaleString('en-IN', { month: 'short', year: '2-digit' })
}

const THEME_KEYWORDS: Record<string, string[]> = {
  'wait time':       ['wait', 'waiting', 'long time', 'delayed', 'slow', 'queue'],
  'doctor care':     ['doctor', 'physician', 'specialist', 'consultant', 'caring', 'attentive', 'diagnosis'],
  'nursing staff':   ['nurse', 'nursing', 'staff', 'ward', 'attendant', 'sister'],
  'cleanliness':     ['clean', 'hygiene', 'neat', 'dirty', 'sanitary', 'fresh'],
  'communication':   ['explain', 'information', 'communication', 'told', 'inform', 'clear', 'understood'],
  'billing':         ['bill', 'payment', 'charge', 'cost', 'price', 'fee', 'expensive'],
  'food quality':    ['food', 'meal', 'diet', 'taste', 'lunch', 'dinner', 'breakfast'],
  'facilities':      ['room', 'facility', 'amenity', 'bed', 'comfort', 'washroom', 'parking'],
  'discharge':       ['discharge', 'sent home', 'released', 'go home', 'checkout'],
  'response time':   ['response', 'emergency', 'quick', 'immediate', 'fast', 'slow response'],
}

function extractThemes(comment: string): string[] {
  if (!comment) return []
  const lower = comment.toLowerCase()
  return Object.entries(THEME_KEYWORDS)
    .filter(([, kws]) => kws.some(k => lower.includes(k)))
    .map(([theme]) => theme)
    .slice(0, 4)
}

function inferSentiment(rating: number, nps: number, comment: string): FeedbackSentiment {
  const score = (rating / 5) * 0.6 + (nps / 10) * 0.4
  const negWords = ['bad', 'poor', 'terrible', 'worst', 'awful', 'disappointed', 'unhappy', 'rude', 'negligent', 'dirty']
  const posWords = ['excellent', 'great', 'wonderful', 'best', 'amazing', 'fantastic', 'happy', 'satisfied', 'professional', 'clean']
  const lower = comment.toLowerCase()
  const negHits = negWords.filter(w => lower.includes(w)).length
  const posHits = posWords.filter(w => lower.includes(w)).length
  const adjusted = score + (posHits - negHits) * 0.05
  if (adjusted >= 0.70) return 'positive'
  if (adjusted >= 0.45) return 'neutral'
  return 'negative'
}

export interface SubmitFeedbackInput {
  overallRating: 1 | 2 | 3 | 4 | 5
  categories: FeedbackCategoryRatings
  nps: number
  comment?: string
  wouldRecommend: boolean
}

function mkRecord(
  id: string, requestId: string,
  patientId: string, patientName: string,
  visitId: string, visitType: FeedbackVisitType,
  attendingDoctor: string, department: string,
  diagnosis: string | undefined,
  visitDate: string,
  rating: 1|2|3|4|5,
  cats: FeedbackCategoryRatings,
  nps: number,
  comment: string | undefined,
  recommend: boolean,
  submittedAt: string,
): FeedbackRecord {
  const themes = extractThemes(comment ?? '')
  const sentiment = inferSentiment(rating, nps, comment ?? '')
  return {
    id, requestId, patientId, patientName,
    visitId, visitType, attendingDoctor, department,
    diagnosis, visitDate, overallRating: rating,
    categories: cats, nps, comment, wouldRecommend: recommend,
    sentiment, themes, submittedAt,
  }
}

const SEED_RECORDS: FeedbackRecord[] = [
  mkRecord('FB-001','REQ-001','IP-3001','Sunita Devi','IP-3001','ipd','Dr. Priya Nair','ICU',
    'Sepsis', daysAgo(2), 5, { doctorProfessionalism:5, clinicalExpertise:5, communication:4, nursingCare:5, facilityCleanliness:4, waitTime:4, billingClarity:4 },
    9,'The ICU team was exceptional. Dr. Nair explained everything clearly and the nursing staff was very attentive and caring. Very happy with the treatment.',
    true, daysAgo(2)),
  mkRecord('FB-002','REQ-002','IP-3002','Raju Singh','IP-3002','ipd','Dr. Priya Nair','General Ward',
    'Pneumonia', daysAgo(4), 4, { doctorProfessionalism:4, clinicalExpertise:5, communication:4, nursingCare:4, facilityCleanliness:3, waitTime:3, billingClarity:4 },
    8,'Good treatment, recovered well. The wait time for ward rounds was a bit long. Room cleanliness could be improved, but the doctor was excellent.',
    true, daysAgo(4)),
  mkRecord('FB-003','REQ-003','PT-5001','Anita Sharma','OPD-5001','opd','Dr. Rohan Mehta','Cardiology',
    undefined, daysAgo(5), 2, { doctorProfessionalism:3, clinicalExpertise:3, communication:2, nursingCare:3, facilityCleanliness:3, waitTime:1, billingClarity:2 },
    3,'Waited 2 hours for a 10-minute consultation. The billing was very confusing and the receptionist was not helpful. Very disappointed.',
    false, daysAgo(5)),
  mkRecord('FB-004','REQ-004','PT-5002','Meena Patel','OPD-5002','opd','Dr. Priya Nair','General Medicine',
    undefined, daysAgo(7), 5, { doctorProfessionalism:5, clinicalExpertise:5, communication:5, nursingCare:5, facilityCleanliness:5, waitTime:4, billingClarity:5 },
    10,'Absolutely excellent experience! Dr. Nair was very professional and took time to explain my condition. The facility is clean, staff is friendly. Highly recommend.',
    true, daysAgo(7)),
  mkRecord('FB-005','REQ-005','PT-5003','Suresh Kumar','OPD-5003','opd','Dr. Anjali Rao','Orthopaedics',
    undefined, daysAgo(10), 3, { doctorProfessionalism:4, clinicalExpertise:3, communication:3, nursingCare:3, facilityCleanliness:4, waitTime:2, billingClarity:3 },
    5,'Average experience. Doctor was okay but the waiting time was very long. Parking facility is terrible. Food in the cafeteria is not good.',
    false, daysAgo(10)),
  mkRecord('FB-006','REQ-006','IP-3004','Mohan Lal','IP-3004','ipd','Dr. Priya Nair','Semi-Private Ward',
    'Type 2 Diabetes', daysAgo(12), 4, { doctorProfessionalism:4, clinicalExpertise:5, communication:4, nursingCare:4, facilityCleanliness:4, waitTime:4, billingClarity:3 },
    7,'Good experience overall. My diabetes is under control thanks to the team. Billing was a bit confusing but the clinical care was top-notch.',
    true, daysAgo(12)),
  mkRecord('FB-007','REQ-007','PT-5004','Kavita Joshi','OPD-5004','opd','Dr. Rohan Mehta','Cardiology',
    undefined, daysAgo(15), 5, { doctorProfessionalism:5, clinicalExpertise:5, communication:5, nursingCare:4, facilityCleanliness:5, waitTime:4, billingClarity:4 },
    9,'Dr. Mehta is a wonderful doctor. Very knowledgeable and patient. The cardiology department is well equipped. I feel very safe here.',
    true, daysAgo(15)),
  mkRecord('FB-008','REQ-008','PT-5005','Ramesh Yadav','OPD-5005','opd','Dr. Anjali Rao','Orthopaedics',
    undefined, daysAgo(18), 1, { doctorProfessionalism:2, clinicalExpertise:2, communication:1, nursingCare:2, facilityCleanliness:2, waitTime:1, billingClarity:1 },
    0,'Terrible experience. Waited 3 hours, doctor barely examined me. The washroom was dirty. I had to ask three times to get my bill. Never coming back.',
    false, daysAgo(18)),
  mkRecord('FB-009','REQ-009','PT-5006','Lalita Gupta','IP-5006','ipd','Dr. Priya Nair','General Ward',
    'Post-op appendectomy', daysAgo(20), 4, { doctorProfessionalism:4, clinicalExpertise:4, communication:4, nursingCare:5, facilityCleanliness:4, waitTime:4, billingClarity:4 },
    8,'The nursing staff was exceptional after my surgery. Very caring and prompt. The food quality could be better but everything else was great.',
    true, daysAgo(20)),
  mkRecord('FB-010','REQ-010','PT-5007','Vikram Shah','OPD-5007','opd','Dr. Rohan Mehta','Cardiology',
    undefined, daysAgo(25), 4, { doctorProfessionalism:5, clinicalExpertise:4, communication:4, nursingCare:3, facilityCleanliness:4, waitTime:3, billingClarity:4 },
    7,'Dr. Mehta is very good. My only complaint is the long waiting time in the cardiology OPD. The reception staff could be more communicative.',
    true, daysAgo(25)),
  mkRecord('FB-011','REQ-011','PT-5008','Seema Rao','OPD-5008','opd','Dr. Anjali Rao','Orthopaedics',
    undefined, daysAgo(30), 3, { doctorProfessionalism:3, clinicalExpertise:3, communication:3, nursingCare:3, facilityCleanliness:3, waitTime:2, billingClarity:2 },
    4,'Average. The wait time was long and the billing process was confusing. The facility is clean but more staff are needed in orthopaedics.',
    false, daysAgo(30)),
  mkRecord('FB-012','REQ-012','PT-5009','Harish Bhatt','IP-5009','ipd','Dr. Priya Nair','ICU',
    'Cardiac arrest recovery', daysAgo(35), 5, { doctorProfessionalism:5, clinicalExpertise:5, communication:5, nursingCare:5, facilityCleanliness:5, waitTime:5, billingClarity:5 },
    10,'My father was given a second life by this team. ICU doctors and nurses worked tirelessly. The hospital gave him the best possible care. Eternally grateful.',
    true, daysAgo(35)),
]

const SEED_REQUESTS: FeedbackRequest[] = [
  {
    id: 'REQ-PENDING-001',
    patientId: 'PT-20394',
    patientName: 'Kiran Patil',
    visitId: 'IP-20394',
    visitType: 'ipd',
    attendingDoctor: 'Dr. Priya Nair',
    department: 'Cardiac Care',
    diagnosis: 'Chest pain — cardiac observation',
    visitDate: daysAgo(1),
    status: 'pending',
    expiresAt: new Date(Date.now() + 71 * 3600000).toISOString(),
  },
]

function computeAnalytics(records: FeedbackRecord[], requests: FeedbackRequest[]): FeedbackAnalyticsSummary {
  const total = records.length
  if (total === 0) return {
    totalFeedback: 0, avgRating: 0, npsScore: 0, responseRate: 0,
    sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
    ratingDistribution: [1,2,3,4,5].map(r => ({ rating: r, count: 0 })),
    topThemes: [], categoryAverages: { doctorProfessionalism:0, clinicalExpertise:0, communication:0, nursingCare:0, facilityCleanliness:0, waitTime:0, billingClarity:0 },
    monthlyTrend: [], byDoctor: [], byDepartment: [],
  }

  const avgRating = Math.round((records.reduce((s, r) => s + r.overallRating, 0) / total) * 10) / 10

  const promoters  = records.filter(r => r.nps >= 9).length
  const detractors = records.filter(r => r.nps <= 6).length
  const npsScore   = Math.round(((promoters - detractors) / total) * 100)

  const totalReqs = requests.length + total
  const responseRate = totalReqs > 0 ? Math.round((total / totalReqs) * 100) : 0

  const sentimentBreakdown = {
    positive: records.filter(r => r.sentiment === 'positive').length,
    neutral:  records.filter(r => r.sentiment === 'neutral').length,
    negative: records.filter(r => r.sentiment === 'negative').length,
  }

  const ratingDistribution = [1,2,3,4,5].map(rating => ({
    rating, count: records.filter(r => r.overallRating === rating).length,
  }))

  const themeCount: Record<string, number> = {}
  records.forEach(r => r.themes.forEach(t => { themeCount[t] = (themeCount[t] ?? 0) + 1 }))
  const topThemes = Object.entries(themeCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t)

  const cats: (keyof FeedbackCategoryRatings)[] = ['doctorProfessionalism','clinicalExpertise','communication','nursingCare','facilityCleanliness','waitTime','billingClarity']
  const categoryAverages = Object.fromEntries(
    cats.map(c => [c, Math.round((records.reduce((s, r) => s + r.categories[c], 0) / total) * 10) / 10])
  ) as unknown as FeedbackCategoryRatings

  const last6: { month: string; items: FeedbackRecord[] }[] = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i))
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const items = records.filter(r => r.submittedAt.startsWith(ym.slice(0, 7)))
    return { month: monthName(5 - i), items }
  })
  const monthlyTrend = last6.map(({ month, items }) => ({
    month,
    count: items.length,
    avg: items.length ? Math.round((items.reduce((s, r) => s + r.overallRating, 0) / items.length) * 10) / 10 : 0,
  }))

  const docMap: Record<string, number[]> = {}
  records.forEach(r => { if (!docMap[r.attendingDoctor]) docMap[r.attendingDoctor] = []; docMap[r.attendingDoctor].push(r.overallRating) })
  const byDoctor = Object.entries(docMap).map(([doctor, ratings]) => ({
    doctor, count: ratings.length,
    avg: Math.round((ratings.reduce((s, v) => s + v, 0) / ratings.length) * 10) / 10,
  })).sort((a, b) => b.avg - a.avg)

  const deptMap: Record<string, number[]> = {}
  records.forEach(r => { if (!deptMap[r.department]) deptMap[r.department] = []; deptMap[r.department].push(r.overallRating) })
  const byDepartment = Object.entries(deptMap).map(([dept, ratings]) => ({
    dept, count: ratings.length,
    avg: Math.round((ratings.reduce((s, v) => s + v, 0) / ratings.length) * 10) / 10,
  })).sort((a, b) => b.avg - a.avg)

  return { totalFeedback: total, avgRating, npsScore, responseRate, sentimentBreakdown, ratingDistribution, topThemes, categoryAverages, monthlyTrend, byDoctor, byDepartment }
}

interface PatientFeedbackState {
  requests: FeedbackRequest[]
  records: FeedbackRecord[]

  createFeedbackRequest: (
    patientId: string, patientName: string,
    visitType: 'ipd' | 'opd', visitId: string,
    attendingDoctor: string, department: string,
    diagnosis: string | undefined, visitDate: string,
  ) => FeedbackRequest

  submitFeedback: (requestId: string, input: SubmitFeedbackInput) => FeedbackRecord | null

  getPendingForPatient:  (patientId: string) => FeedbackRequest[]
  getRecordsByPatient:   (patientId: string) => FeedbackRecord[]
  getRecordsByDoctor:    (doctor: string)    => FeedbackRecord[]
  getAnalytics:          () => FeedbackAnalyticsSummary

  expireStale: () => void
}

export const usePatientFeedbackStore = create<PatientFeedbackState>()(
  persist(
    (set, get) => ({
      requests: SEED_REQUESTS,
      records:  SEED_RECORDS,

      createFeedbackRequest: (patientId, patientName, visitType, visitId, attendingDoctor, department, diagnosis, visitDate) => {
        const req: FeedbackRequest = {
          id: uid('REQ'),
          patientId, patientName, visitId, visitType,
          attendingDoctor, department, diagnosis, visitDate,
          status: 'pending',
          expiresAt: new Date(Date.now() + 72 * 3600000).toISOString(),
        }
        set(s => ({ requests: [req, ...s.requests] }))
        return req
      },

      submitFeedback: (requestId, input) => {
        const req = get().requests.find(r => r.id === requestId)
        if (!req || req.status !== 'pending') return null
        const now = new Date().toISOString()
        const themes = extractThemes(input.comment ?? '')
        const sentiment = inferSentiment(input.overallRating, input.nps, input.comment ?? '')
        const record: FeedbackRecord = {
          id: uid('FB'),
          requestId,
          patientId: req.patientId,
          patientName: req.patientName,
          visitId: req.visitId,
          visitType: req.visitType,
          attendingDoctor: req.attendingDoctor,
          department: req.department,
          diagnosis: req.diagnosis,
          visitDate: req.visitDate,
          overallRating: input.overallRating,
          categories: input.categories,
          nps: input.nps,
          comment: input.comment,
          wouldRecommend: input.wouldRecommend,
          sentiment,
          themes,
          submittedAt: now,
        }
        set(s => ({
          records: [record, ...s.records],
          requests: s.requests.map(r => r.id === requestId ? { ...r, status: 'submitted' as FeedbackStatus } : r),
        }))
        return record
      },

      getPendingForPatient: (patientId) =>
        get().requests.filter(r => r.patientId === patientId && r.status === 'pending'),

      getRecordsByPatient: (patientId) =>
        get().records.filter(r => r.patientId === patientId),

      getRecordsByDoctor: (doctor) =>
        get().records.filter(r => r.attendingDoctor === doctor),

      getAnalytics: () => computeAnalytics(get().records, get().requests),

      expireStale: () => {
        const now = Date.now()
        set(s => ({
          requests: s.requests.map(r =>
            r.status === 'pending' && new Date(r.expiresAt).getTime() < now
              ? { ...r, status: 'expired' as FeedbackStatus }
              : r,
          ),
        }))
      },
    }),
    {
      name: 'agentix-patient-feedback',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
)
