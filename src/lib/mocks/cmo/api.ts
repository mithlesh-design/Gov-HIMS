import type {
  Alert, Approval, Facility, BedNetworkSummary, Ambulance,
  AuditLogEntry, DashboardSummary, AiBrief, CmoSession,
} from '@/types/cmo'
import { seedAlerts } from './seed-alerts'
import { seedApprovals } from './seed-approvals'
import { seedFacilities } from './seed-facilities'
import { seedBeds } from './seed-beds'
import { seedAmbulances } from './seed-ambulances'
import { seedAuditLog } from './seed-audit-log'

const delay = (ms = 200 + Math.random() * 400) =>
  new Promise<void>(r => setTimeout(r, ms))

// In-memory mutable session state (resets on page reload)
let _alerts: Alert[] = [...seedAlerts]
let _approvals: Approval[] = [...seedApprovals]
let _facilities: Facility[] = [...seedFacilities]
let _ambulances: Ambulance[] = [...seedAmbulances]
let _auditLog: AuditLogEntry[] = [...seedAuditLog]
let _beds: BedNetworkSummary = JSON.parse(JSON.stringify(seedBeds))

const seedSession: CmoSession = {
  userId: 'usr_cmo_bhopal_01',
  name: 'Dr. Rajesh Sharma',
  nameHindi: 'डॉ. राजेश शर्मा',
  designation: 'CMHO',
  district: 'Bhopal',
  districtHindi: 'भोपाल',
  facilitiesCount: 142,
  populationLakhs: 38.4,
  joinedDate: '2023-01-15',
  avatarInitials: 'RS',
  permissionScope: 'district',
}

function appendAudit(action: string, target: string, details: string) {
  _auditLog = [{
    id: `au_live_${Date.now()}`,
    timestamp: new Date().toISOString(),
    user: 'Dr. Rajesh Sharma',
    userRole: 'CMO',
    action,
    target,
    details,
    ip: '192.168.1.10',
  }, ..._auditLog]
}

export const mockCmoApi = {
  // Session
  async getSession(): Promise<CmoSession> {
    await delay(150)
    return seedSession
  },

  // Dashboard
  async getDashboardSummary(): Promise<DashboardSummary> {
    await delay()
    return {
      districtHealthScore: 73,
      districtHealthScoreDelta: 2,
      criticalAlertsCount: _alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length,
      pendingApprovalsCount: _approvals.filter(a => a.status === 'pending').length,
      liveOps: { opd: 4127, ipdCensus: 412, erArrivals: 89, deliveries: 38, ambulanceTrips: 64, deathsAll: 7 },
    }
  },

  async getAiBrief(): Promise<AiBrief> {
    await delay()
    return {
      generatedAt: new Date().toISOString(),
      bodyText: `कल रात OPD में 4,127 मरीज, IPD में 412 भर्ती, 38 deliveries, 2 maternal deaths under review. Dengue cases wards 14/17/19 में 3.2× baseline — outbreak management में देखें. Hamidia DH में oxygen 4 hrs से कम. 12 doctors AWOL across 4 PHCs. कलेक्टर ब्रीफिंग 10:30 बजे · draft तैयार है.`,
      chips: [
        { label: 'Open Bhopal map', action: 'map' },
        { label: 'Brief Collector', action: 'brief' },
        { label: 'View dengue cluster', action: 'surveillance' },
      ],
    }
  },

  // Alerts
  async getAlerts(): Promise<Alert[]> {
    await delay()
    return [..._alerts]
  },

  async acknowledgeAlert(id: string): Promise<Alert | undefined> {
    await delay(200)
    _alerts = _alerts.map(a => a.id === id ? { ...a, acknowledged: true } : a)
    const alert = _alerts.find(a => a.id === id)
    appendAudit('Alert Acknowledged', `Alert ${id} — ${alert?.title ?? ''}`, 'Marked as acknowledged')
    return alert
  },

  async dismissAlert(id: string): Promise<void> {
    await delay(200)
    const alert = _alerts.find(a => a.id === id)
    _alerts = _alerts.filter(a => a.id !== id)
    appendAudit('Alert Dismissed', `Alert ${id} — ${alert?.title ?? ''}`, 'Removed from active feed')
  },

  async assignAlert(id: string, ownerName: string): Promise<Alert | undefined> {
    await delay(200)
    _alerts = _alerts.map(a =>
      a.id === id ? { ...a, owner: { id: ownerName, name: ownerName, avatar: ownerName.substring(0, 2).toUpperCase() } } : a
    )
    appendAudit('Alert Assigned', `Alert ${id}`, `Assigned to ${ownerName}`)
    return _alerts.find(a => a.id === id)
  },

  addAlert(alert: Alert) {
    _alerts = [alert, ..._alerts]
  },

  ageAlerts() {
    _alerts = _alerts.map(a => ({ ...a, ageMinutes: a.ageMinutes + (10 / 60) }))
  },

  // Approvals
  async getApprovals(): Promise<Approval[]> {
    await delay()
    return [..._approvals]
  },

  async approveItem(id: string, note?: string): Promise<Approval | undefined> {
    await delay(300)
    _approvals = _approvals.map(a =>
      a.id === id ? { ...a, status: 'approved', actionedAt: new Date().toISOString(), actionNote: note } : a
    )
    const item = _approvals.find(a => a.id === id)
    appendAudit('Approval Signed', `${id} — ${item?.title ?? ''}`, note ? `Approved with note: "${note}"` : 'Approved')
    return item
  },

  async rejectItem(id: string, reason: string): Promise<Approval | undefined> {
    await delay(300)
    _approvals = _approvals.map(a =>
      a.id === id ? { ...a, status: 'rejected', actionedAt: new Date().toISOString(), actionNote: reason } : a
    )
    const item = _approvals.find(a => a.id === id)
    appendAudit('Approval Rejected', `${id} — ${item?.title ?? ''}`, `Rejected: ${reason}`)
    return item
  },

  // Facilities
  async getFacilities(): Promise<Facility[]> {
    await delay()
    return [..._facilities]
  },

  async getFacility(id: string): Promise<Facility | undefined> {
    await delay(200)
    return _facilities.find(f => f.id === id)
  },

  // Beds
  async getBedNetwork(): Promise<BedNetworkSummary> {
    await delay()
    return JSON.parse(JSON.stringify(_beds))
  },

  async reserveBed(facilityId: string, wardType: string, bedId: string, patientName: string): Promise<void> {
    await delay(300)
    const fac = _beds.perFacility.find(f => f.facilityId === facilityId)
    if (fac) {
      const ward = fac.wards[wardType as keyof typeof fac.wards]
      if (ward) {
        ward.beds = ward.beds.map(b => b.id === bedId ? { ...b, status: 'reserved', patientName } : b)
        ward.used = ward.beds.filter(b => b.status === 'occupied' || b.status === 'reserved').length
      }
    }
    appendAudit('Bed Reserved', `${bedId} at ${facilityId}`, `Reserved for ${patientName}`)
  },

  tickBeds() {
    // Randomly flip 1-2 beds for live feel
    _beds.perFacility.forEach(fac => {
      Object.values(fac.wards).forEach(ward => {
        const freeBeds = ward.beds.filter(b => b.status === 'free')
        if (freeBeds.length > 0 && Math.random() < 0.15) {
          const bed = freeBeds[Math.floor(Math.random() * freeBeds.length)]
          bed.status = 'occupied'
          bed.patientName = 'New Patient'
          ward.used = Math.min(ward.used + 1, ward.total)
          _beds.occupied = Math.min(_beds.occupied + 1, _beds.totalBeds)
        }
      })
    })
  },

  // Ambulances
  async getAmbulances(): Promise<Ambulance[]> {
    await delay()
    return [..._ambulances]
  },

  tickAmbulances() {
    _ambulances = _ambulances.map(amb => {
      if (amb.status === 'en-route-facility' && amb.etaMinutes !== undefined) {
        const newEta = Math.max(0, amb.etaMinutes - 0.5)
        if (newEta === 0) return { ...amb, etaMinutes: 0, status: 'at-incident' as const }
        return { ...amb, etaMinutes: newEta }
      }
      return amb
    })
    // Tick vitals
    _ambulances = _ambulances.map(amb => {
      if (!amb.patient?.vitals) return amb
      const v = amb.patient.vitals
      return {
        ...amb,
        patient: {
          ...amb.patient,
          vitals: {
            hr: Math.max(60, Math.min(150, v.hr + Math.floor(Math.random() * 5) - 2)),
            bp: v.bp,
            spo2: Math.max(85, Math.min(100, v.spo2 + Math.floor(Math.random() * 3) - 1)),
            temp: parseFloat((v.temp + (Math.random() * 0.2 - 0.1)).toFixed(1)),
            lastUpdated: new Date().toISOString(),
          },
        },
      }
    })
  },

  async rerouteAmbulance(ambId: string, newFacilityId: string, newFacilityName: string, newEta: number): Promise<void> {
    await delay(300)
    _ambulances = _ambulances.map(a =>
      a.id === ambId
        ? { ...a, destinationFacility: { id: newFacilityId, name: newFacilityName }, etaMinutes: newEta }
        : a
    )
    appendAudit('Ambulance Rerouted', `AMB ${ambId}`, `Redirected to ${newFacilityName}, new ETA ${newEta} min`)
  },

  // Audit log
  async getAuditLog(limit = 50): Promise<AuditLogEntry[]> {
    await delay()
    return _auditLog.slice(0, limit)
  },

  appendAudit,
}
