// CMO Cockpit — all TypeScript interfaces

export interface CmoSession {
  userId: string
  name: string
  nameHindi: string
  designation: string
  district: string
  districtHindi: string
  facilitiesCount: number
  populationLakhs: number
  joinedDate: string
  avatarInitials: string
  permissionScope: 'district'
}

export type AlertSeverity = 'critical' | 'warning' | 'info'
export type AlertSource = 'surveillance' | 'supply' | 'hr' | 'quality' | 'finance' | 'ai'

export interface AlertTimelineEntry {
  timestamp: string
  actor: string
  action: string
}

export interface Alert {
  id: string
  severity: AlertSeverity
  iconTabler: string
  title: string
  detail: string
  facility: string
  source: AlertSource
  ageMinutes: number
  acknowledged: boolean
  owner: { id: string; name: string; avatar: string } | null
  recommendedActions: string[]
  timeline: AlertTimelineEntry[]
}

export type ApprovalType = 'indent' | 'transfer' | 'leave' | 'pip-reallocation' | 'posting'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface Approval {
  id: string
  type: ApprovalType
  iconTabler: string
  title: string
  subtitle: string
  justification: string
  raisedBy: string
  raisedByRole: string
  amount?: number
  documents: Array<{ name: string; url: string }>
  ageHours: number
  status: ApprovalStatus
  actionedAt?: string
  actionNote?: string
}

export type FacilityType = 'DH' | 'CH' | 'CHC' | 'PHC' | 'SHC' | 'HWC'
export type FacilityStatus = 'ok' | 'watch' | 'warning' | 'critical'

export interface Facility {
  id: string
  name: string
  type: FacilityType
  block: string
  status: FacilityStatus
  beds: { used: number; total: number }
  opdToday: number
  ipdCensusToday: number
  nqasScore: number | null
  lastVisited: string | null
  alertsCount: number
  population: number
  staffCount: number
  lat?: number
  lng?: number
}

export type WardType = 'General' | 'ICU' | 'NICU' | 'Ventilator' | 'Isolation' | 'Pediatric' | 'Maternity'

export type BedStatus = 'free' | 'occupied' | 'cleaning' | 'reserved' | 'out-of-service'

export interface Bed {
  id: string
  number: string
  status: BedStatus
  patientId?: string
  patientName?: string
  admittedAt?: string
}

export interface FacilityBedData {
  facilityId: string
  facilityName: string
  wards: Record<WardType, { used: number; total: number; beds: Bed[] }>
}

export interface Transfer {
  id: string
  from: string
  to: string
  patientName: string
  transferredAt: string
  status: 'completed' | 'pending' | 'cancelled'
}

export interface BedNetworkSummary {
  totalBeds: number
  occupied: number
  byType: Record<WardType, { used: number; total: number }>
  perFacility: FacilityBedData[]
  aiSuggestion?: { from: string; to: string; reason: string; patients: number }
  recentTransfers: Transfer[]
}

export type AmbulanceStatus = 'idle' | 'dispatched' | 'at-incident' | 'en-route-facility' | 'returning'

export interface Ambulance {
  id: string
  vehicleNumber: string
  service: '108' | '102' | 'private'
  driver: { name: string; phone: string }
  emt: { name: string; certificationLevel: string }
  status: AmbulanceStatus
  currentLocation: { lat: number; lng: number; address: string }
  destinationFacility?: { id: string; name: string }
  etaMinutes?: number
  patient?: {
    name?: string
    age?: number
    gender?: 'M' | 'F' | 'O'
    abhaId?: string
    chiefComplaint: string
    vitals: { hr: number; bp: string; spo2: number; temp: number; lastUpdated: string }
    vitalHistory?: { hr: number; bp: string; spo2: number; temp: number; ts: string }[]
  }
  aiPrediction?: { diagnosis: string; confidence: number; specialty: string }
  receivingFacilityStatus?: {
    specialistPaged: boolean
    bedReserved: boolean
    bedId?: string
    otPrepStarted: boolean
  }
  dispatchedAt: string
}

export interface StaffMember {
  id: string
  name: string
  role: string
  facility: string
  block: string
  attendanceToday: 'present' | 'absent' | 'leave' | 'awol'
  opdCountMonth: number
  complaints: number
  hprId: string
  qualification: string
  phone: string
}

export interface BmoEscalation {
  id: string
  from: { name: string; facility: string; role: string }
  issue: string
  severity: 'low' | 'medium' | 'high'
  raisedAt: string
  ageHours: number
  slaBreached: boolean
  status: 'open' | 'in-progress' | 'resolved'
}

export interface OutbreakCase {
  id: string
  disease: string
  facility: string
  block: string
  casesThisWeek: number
  baselineWeekly: number
  daysActive: number
  severity: AlertSeverity
  containmentActions: Array<{ label: string; done: boolean }>
}

export interface DrugStock {
  drugName: string
  facilityId: string
  facilityName: string
  stockDays: number
  status: 'ok' | 'low' | 'critical' | 'stockout'
}

export interface Indent {
  id: string
  drug: string
  quantity: number
  unit: string
  facilityId: string
  facilityName: string
  raisedBy: string
  raisedAt: string
  status: 'draft' | 'raised' | 'dispatched' | 'delivered'
  amount: number
}

export interface AuditLogEntry {
  id: string
  timestamp: string
  user: string
  userRole: string
  action: string
  target: string
  details: string
  ip: string
  facility?: string
}

export interface DashboardSummary {
  districtHealthScore: number
  districtHealthScoreDelta: number
  criticalAlertsCount: number
  pendingApprovalsCount: number
  liveOps: {
    opd: number
    ipdCensus: number
    erArrivals: number
    deliveries: number
    ambulanceTrips: number
    deathsAll: number
  }
}

export interface AiBrief {
  generatedAt: string
  bodyText: string
  chips: Array<{ label: string; action: string }>
}

export interface FieldVisit {
  id: string
  facilityId: string
  facilityName: string
  visitedAt: string
  type: 'scheduled' | 'surprise'
  findings: string
  followUpActions: string[]
  status: 'planned' | 'completed' | 'cancelled'
}

export interface Grievance {
  id: string
  type: 'rti' | 'citizen' | 'internal'
  title: string
  raisedBy: string
  raisedAt: string
  ageHours: number
  status: 'open' | 'in-progress' | 'resolved'
  slaBreached: boolean
  response?: string
}
