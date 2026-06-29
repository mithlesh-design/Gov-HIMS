// Health Secretary Cockpit — all TypeScript interfaces

export interface SecretarySession {
  userId: string
  name: string
  nameHindi: string
  designation: string
  designationHindi: string
  state: string
  stateHindi: string
  districtCount: number
  medicalCollegeCount: number
  facilitiesCount: number
  populationCr: number
  joinedDate: string
  avatarInitials: string
  permissionScope: 'state'
}

export type DistrictRegion = 'Chambal' | 'Malwa' | 'Mahakoshal' | 'Bundelkhand' | 'Vindhya' | 'Nimad' | 'Bhopal'

export interface DistrictScoreComponents {
  mmr:            { value: number; score: number }
  imr:            { value: number; score: number }
  nqasPct:        { value: number; score: number }
  stockHealth:    { value: number; score: number }
  attendance:     { value: number; score: number }
  schemeCoverage: { value: number; score: number }
}

export interface District {
  id: string
  name: string
  nameHindi: string
  cmoName: string
  population: number       // lakhs
  isTribal: boolean
  region: DistrictRegion
  facilitiesCount: number
  rank: number             // 1–52
  prevRank: number
  score: number            // 0–100 composite
  prevScore: number
  components: DistrictScoreComponents
  topAlerts: number
  gridRow: number          // for heatmap grid positioning
  gridCol: number
}

export type AlertSeveritySecretary = 'critical' | 'warning' | 'info'
export type AlertSourceSecretary  = 'inter-district' | 'surveillance' | 'finance' | 'dme' | 'centre' | 'quality' | 'ai' | 'press'

export interface StateAlertTimelineEntry {
  timestamp: string
  actor: string
  action: string
}

export interface StateAlert {
  id: string
  severity: AlertSeveritySecretary
  title: string
  detail: string
  district?: string
  source: AlertSourceSecretary
  ageMinutes: number
  acknowledged: boolean
  owner: { id: string; name: string } | null
  recommendedActions: string[]
  timeline: StateAlertTimelineEntry[]
}

export type StateApprovalType = 'tender' | 'mou' | 'cross-transfer' | 'scheme-launch' | 'policy-circular'
export type StateApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface StateApproval {
  id: string
  type: StateApprovalType
  title: string
  subtitle: string
  justification: string
  raisedBy: string
  raisedByRole: string
  amount?: number
  documents: Array<{ name: string; url: string }>
  ageHours: number
  status: StateApprovalStatus
  actionedAt?: string
  actionNote?: string
}

export type MobilizationResourceType = 'oxygen' | 'blood' | 'ventilator' | 'icu-bed' | 'specialist' | 'drug' | 'ambulance'
export type MobilizationStatus = 'pending' | 'approved' | 'in-transit' | 'delivered' | 'rejected'

export interface MobilizationRequest {
  id: string
  fromDistrict: string
  fromFacility?: string
  resourceType: MobilizationResourceType
  resourceDetail: string
  quantity: string
  urgencyHours: number
  severity: AlertSeveritySecretary
  reason: string
  aiSuggestion: {
    source: string
    sourceDistrict: string
    distanceKm: number
    etaMinutes: number
    rationale: string
  }
  alternatives: Array<{ source: string; etaMinutes: number; note: string }>
  status: MobilizationStatus
  createdAt: string
  approvedAt?: string
  deliveredAt?: string
  etaMinutes?: number
}

export type NitiDomain = 1 | 2 | 3

export interface NitiIndicator {
  id: string
  domain: NitiDomain
  name: string
  nameHindi: string
  currentValue: number
  unit: string
  bestStateValue: number
  bestState: string
  gap: number
  target: number
  trend: number[]           // 8 data points for mini sparkline
  status: 'achieving' | 'in-progress' | 'lagging'
}

export interface AbdmMilestone {
  id: string                // M1, M2, M3, M4
  name: string
  description: string
  status: 'not-started' | 'in-progress' | 'achieved'
  progressPct: number
  incentiveAmountCr: number
  earnedCr: number
  achievedAt?: string
}

export type CabinetNoteStatus = 'draft' | 'signed' | 'sent'

export interface CabinetNote {
  id: string
  prompt: string
  content: string
  status: CabinetNoteStatus
  createdAt: string
  signedAt?: string
  sentAt?: string
}

export interface AssemblyQuestion {
  id: string
  questionNumber: string
  mlaName: string
  constituency: string
  questionTextEn: string
  questionTextHi: string
  dueDate: string
  isStarred: boolean
  status: 'pending' | 'drafted' | 'lodged'
  draftAnswer?: string
}

export interface MedicalCollege {
  id: string
  name: string
  city: string
  beds: { used: number; total: number }
  pgSeats: number
  facultyTotal: number
  facultyVacant: number
  lastNmcInspection: string | null
  status: 'ok' | 'watch' | 'warning' | 'critical'
  specialties: string[]
}

export interface StateDashboardSummary {
  nitiRank: number
  nitiRankDelta: number
  redDistricts: number
  yellowDistricts: number
  stateAlertsCount: number
  pmJayTodayCr: number
  mmr: number
  mmrDelta: number
  immunizationPct: number
  abdmCompliancePct: number
  topDistricts: District[]
  bottomDistricts: District[]
}

export interface AiBriefSecretary {
  generatedAt: string
  bodyText: string
  chips: Array<{ label: string; action: string }>
}

export interface AuditLogEntrySecretary {
  id: string
  timestamp: string
  user: string
  userRole: string
  action: string
  target: string
  details: string
  ip: string
  district?: string
}
