import type {
  SecretarySession, District, StateAlert, StateApproval,
  MobilizationRequest, NitiIndicator, AbdmMilestone, CabinetNote,
  AssemblyQuestion, MedicalCollege, StateDashboardSummary, AuditLogEntrySecretary,
} from '@/types/secretary'
import { seedDistricts }           from './seed-districts'
import { seedStateAlerts }         from './seed-state-alerts'
import { seedStateApprovals }      from './seed-state-approvals'
import { seedMobilizationRequests } from './seed-mobilization-requests'
import { seedNitiIndicators }      from './seed-niti-indicators'
import { seedAbdmMilestones }      from './seed-abdm-milestones'
import { seedCabinetTemplates }    from './seed-cabinet-templates'
import { seedAssemblyQuestions }   from './seed-assembly-questions'
import { seedMedicalColleges }     from './seed-medical-colleges'

const delay = (ms = 250 + Math.random() * 350) =>
  new Promise<void>(r => setTimeout(r, ms))

// ── In-memory mutable state ──────────────────────────────────────────────
let _alerts          = seedStateAlerts.map(a => ({ ...a }))
let _approvals       = seedStateApprovals.map(a => ({ ...a }))
let _mobilization    = seedMobilizationRequests.map(r => ({ ...r }))
let _districts       = seedDistricts.map(d => ({ ...d }))
let _nitiIndicators  = seedNitiIndicators.map(n => ({ ...n }))
let _abdmMilestones  = seedAbdmMilestones.map(m => ({ ...m }))
let _cabinetNotes:   CabinetNote[] = []
let _assemblyQs     = seedAssemblyQuestions.map(q => ({ ...q }))
let _medicalColleges = seedMedicalColleges.map(c => ({ ...c }))
let _auditLog:       AuditLogEntrySecretary[] = []

let _alertCounter = 100

// ── Session ──────────────────────────────────────────────────────────────
const _session: SecretarySession = {
  userId: 'usr_secretary_mp_01',
  name: 'Smt. Anuradha Verma',
  nameHindi: 'श्रीमती अनुराधा वर्मा',
  designation: 'Principal Secretary Health',
  designationHindi: 'प्रमुख सचिव स्वास्थ्य',
  state: 'Madhya Pradesh',
  stateHindi: 'मध्य प्रदेश',
  districtCount: 52,
  medicalCollegeCount: 14,
  facilitiesCount: 1247,
  populationCr: 8.5,
  joinedDate: '2023-01-12',
  avatarInitials: 'AV',
  permissionScope: 'state',
}

// ── Cabinet drafter ──────────────────────────────────────────────────────
function generateCabinetNoteFromPrompt(prompt: string): string {
  const lower = prompt.toLowerCase()
  for (const tpl of seedCabinetTemplates) {
    if (tpl.keywords.some(k => lower.includes(k))) {
      return tpl.draft
    }
  }
  // Generic fallback
  return `**Cabinet Note**\n**Subject: ${prompt}**\n\n---\n\n**1. परिस्थिति (Context)**\n\nयह नोट "${prompt}" विषय पर माननीय मंत्री की सूचना एवं अनुमोदन के लिए प्रस्तुत किया जा रहा है।\n\nThis note is submitted for the Minister's information and approval regarding the subject matter indicated above.\n\n---\n\n**2. पृष्ठभूमि (Background)**\n\nState health indicators continue to improve against national targets. The matter at hand requires immediate Ministerial attention due to its policy implications and resource requirements.\n\n**Key points:**\n- Current state performance is above national average on 12 of 20 NITI Health Index indicators\n- Resource gaps have been identified and prioritised\n- Stakeholder consultation completed at state level\n\n---\n\n**3. अनुशंसाएं (Recommendations)**\n\n1. Approve the proposed action plan\n2. Allocate required financial resources from NHM contingency\n3. Constitute a monitoring committee for implementation oversight\n4. Review progress at next monthly Health & Medical Education review\n\n---\n\n**4. वित्तीय निहितार्थ (Financial Implications)**\n\nProposed budget: To be assessed and submitted separately. Indicative cost: ₹15–40 Cr depending on scale of implementation.\n\n---\n\n**प्रस्तावित: Principal Secretary Health, MP**\n*Submitted for Cabinet consideration.*`
}

// ── Audit helper ─────────────────────────────────────────────────────────
function auditLog(action: string, target: string, details: string) {
  _auditLog.unshift({
    id: `aud_${Date.now()}`,
    timestamp: new Date().toISOString(),
    user: _session.name,
    userRole: _session.designation,
    action,
    target,
    details,
    ip: '10.42.0.1',
  })
}

// ── Live push helpers ─────────────────────────────────────────────────────
const LIVE_ALERT_TEMPLATES = [
  { severity: 'info'     as const, title: 'Centre fund release · NHM Q2 ₹47 Cr cleared', source: 'centre'       as const },
  { severity: 'warning'  as const, title: 'Outbreak alert from Sehore CMO — AGE cluster', source: 'surveillance' as const },
  { severity: 'critical' as const, title: 'Mass casualty alert · Singrauli highway accident', source: 'inter-district' as const },
  { severity: 'info'     as const, title: 'NITI Aayog review scheduled — PM office', source: 'centre'       as const },
  { severity: 'warning'  as const, title: 'Press query received · doctor absenteeism', source: 'press'        as const },
]

const MOB_DISTRICTS = ['Balaghat', 'Chhindwara', 'Tikamgarh', 'Damoh', 'Harda', 'Betul']
const MOB_RESOURCES: MobilizationRequest['resourceType'][] = ['oxygen', 'blood', 'ventilator', 'specialist', 'drug', 'ambulance']

export const mockSecretaryApi = {
  // ── Session ──────────────────────────────────────────────────────────
  async getSession() {
    await delay(100)
    return _session
  },

  // ── Dashboard ─────────────────────────────────────────────────────────
  async getStateDashboardSummary(): Promise<StateDashboardSummary> {
    await delay()
    const sorted = [..._districts].sort((a, b) => a.rank - b.rank)
    return {
      nitiRank: 17,
      nitiRankDelta: 3,
      redDistricts: _districts.filter(d => d.score < 50).length,
      yellowDistricts: _districts.filter(d => d.score >= 50 && d.score < 65).length,
      stateAlertsCount: _alerts.filter(a => !a.acknowledged).length,
      pmJayTodayCr: 4.2,
      mmr: 163,
      mmrDelta: -4,
      immunizationPct: 87,
      abdmCompliancePct: 74,
      topDistricts: sorted.slice(0, 5),
      bottomDistricts: sorted.slice(-5).reverse(),
    }
  },

  // ── Alerts ────────────────────────────────────────────────────────────
  async getStateAlerts() {
    await delay()
    return [..._alerts]
  },
  async acknowledgeAlert(id: string) {
    await delay(200)
    _alerts = _alerts.map(a => a.id === id ? { ...a, acknowledged: true } : a)
    auditLog('Alert acknowledged', id, `Alert marked acknowledged by ${_session.name}`)
  },
  async dismissAlert(id: string) {
    await delay(200)
    _alerts = _alerts.filter(a => a.id !== id)
  },
  pushLiveAlert() {
    const tpl = LIVE_ALERT_TEMPLATES[Math.floor(Math.random() * LIVE_ALERT_TEMPLATES.length)]
    const newAlert: StateAlert = {
      id: `sa_live_${_alertCounter++}`,
      severity: tpl.severity,
      title: tpl.title,
      detail: `Auto-generated live alert — ${new Date().toLocaleTimeString('en-IN')}`,
      source: tpl.source,
      ageMinutes: 0,
      acknowledged: false,
      owner: null,
      recommendedActions: ['Review and take appropriate action'],
      timeline: [{ timestamp: new Date().toISOString(), actor: 'AI System', action: 'Alert auto-generated by live simulator' }],
    }
    _alerts = [newAlert, ..._alerts]
    return newAlert
  },
  ageAlerts() {
    _alerts = _alerts.map(a => ({ ...a, ageMinutes: a.ageMinutes + 1.5 }))
  },

  // ── Approvals ─────────────────────────────────────────────────────────
  async getStateApprovals() {
    await delay()
    return [..._approvals]
  },
  async approveItem(id: string, note = '') {
    await delay(300)
    _approvals = _approvals.map(a =>
      a.id === id
        ? { ...a, status: 'approved' as const, actionedAt: new Date().toISOString(), actionNote: note }
        : a
    )
    auditLog('Approval granted', id, note || 'Approved by PS Health')
  },
  async rejectItem(id: string, note: string) {
    await delay(300)
    _approvals = _approvals.map(a =>
      a.id === id
        ? { ...a, status: 'rejected' as const, actionedAt: new Date().toISOString(), actionNote: note }
        : a
    )
    auditLog('Approval rejected', id, note)
  },

  // ── Districts ─────────────────────────────────────────────────────────
  async getDistrictRanking(): Promise<District[]> {
    await delay(150)
    return [..._districts].sort((a, b) => a.rank - b.rank)
  },
  async getDistrictDetail(id: string) {
    await delay(200)
    return _districts.find(d => d.id === id) || null
  },
  async sendCongratulation(districtId: string) {
    await delay(300)
    auditLog('Congratulation sent', districtId, `Congratulation message sent to CMO of ${districtId}`)
    console.log(`[Secretary Demo] Congratulation sent to ${districtId}`)
  },
  async issueShowCause(districtId: string, reason: string) {
    await delay(400)
    auditLog('Show-cause issued', districtId, reason)
    console.log(`[Secretary Demo] Show-cause issued to ${districtId}: ${reason}`)
  },
  tickDistrictScore(districtId: string, delta: number) {
    _districts = _districts.map(d =>
      d.id === districtId
        ? { ...d, score: Math.max(30, Math.min(100, d.score + delta)) }
        : d
    )
    const updated = _districts.find(d => d.id === districtId)!
    // Re-sort ranks
    const sorted = [..._districts].sort((a, b) => b.score - a.score)
    sorted.forEach((d, i) => {
      const idx = _districts.findIndex(x => x.id === d.id)
      _districts[idx] = { ..._districts[idx], rank: i + 1 }
    })
    return updated
  },

  // ── Mobilization ─────────────────────────────────────────────────────
  async getMobilizationRequests() {
    await delay()
    return [..._mobilization]
  },
  async approveMobilization(id: string) {
    await delay(400)
    _mobilization = _mobilization.map(r =>
      r.id === id
        ? { ...r, status: 'in-transit' as const, approvedAt: new Date().toISOString(), etaMinutes: r.aiSuggestion.etaMinutes }
        : r
    )
    auditLog('Mobilization approved', id, `Resource mobilization approved, in-transit to requesting district`)
    console.log(`[Secretary Demo] Mobilization ${id} approved — in transit`)
    return _mobilization.find(r => r.id === id)!
  },
  async rejectMobilization(id: string, reason: string) {
    await delay(300)
    _mobilization = _mobilization.map(r =>
      r.id === id ? { ...r, status: 'rejected' as const } : r
    )
    auditLog('Mobilization rejected', id, reason)
  },
  tickMobilizationEta() {
    _mobilization = _mobilization.map(r =>
      r.status === 'in-transit' && r.etaMinutes !== undefined
        ? { ...r, etaMinutes: Math.max(0, r.etaMinutes - 0.5) }
        : r
    )
    _mobilization = _mobilization.map(r =>
      r.status === 'in-transit' && r.etaMinutes === 0
        ? { ...r, status: 'delivered' as const, deliveredAt: new Date().toISOString() }
        : r
    )
  },
  pushLiveMobilizationRequest() {
    const district = MOB_DISTRICTS[Math.floor(Math.random() * MOB_DISTRICTS.length)]
    const resourceType = MOB_RESOURCES[Math.floor(Math.random() * MOB_RESOURCES.length)]
    const newReq: MobilizationRequest = {
      id: `mob_live_${_alertCounter++}`,
      fromDistrict: district,
      resourceType,
      resourceDetail: resourceType === 'oxygen' ? 'Liquid oxygen' : resourceType === 'blood' ? 'O positive blood' : resourceType,
      quantity: resourceType === 'oxygen' ? '500 litres' : resourceType === 'blood' ? '8 units' : '2 units',
      urgencyHours: 12,
      severity: 'warning',
      reason: `${district} District Hospital has requested emergency ${resourceType} from state pool.`,
      aiSuggestion: {
        source: 'MPPHSCL Central Warehouse, Bhopal',
        sourceDistrict: 'Bhopal',
        distanceKm: Math.floor(Math.random() * 200 + 50),
        etaMinutes: Math.floor(Math.random() * 180 + 60),
        rationale: 'Central warehouse has adequate stock. Nearest dispatch point.',
      },
      alternatives: [
        { source: 'Nearest District Hospital', etaMinutes: Math.floor(Math.random() * 120 + 30), note: 'Leaves source district at marginal stock.' },
      ],
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    _mobilization = [newReq, ..._mobilization]
    return newReq
  },

  // ── NITI Aayog ─────────────────────────────────────────────────────────
  async getNitiIndicators(): Promise<NitiIndicator[]> {
    await delay()
    return [..._nitiIndicators]
  },
  tickNitiIndicator() {
    const idx = Math.floor(Math.random() * _nitiIndicators.length)
    const delta = (Math.random() - 0.4) * 0.5
    _nitiIndicators[idx] = {
      ..._nitiIndicators[idx],
      currentValue: Number((_nitiIndicators[idx].currentValue + delta).toFixed(2)),
    }
    return _nitiIndicators[idx]
  },

  // ── ABDM ─────────────────────────────────────────────────────────────
  async getAbdmMilestones(): Promise<AbdmMilestone[]> {
    await delay()
    return [..._abdmMilestones]
  },

  // ── Cabinet drafter ───────────────────────────────────────────────────
  async draftCabinetNote(prompt: string): Promise<string> {
    await delay(2000)
    return generateCabinetNoteFromPrompt(prompt)
  },
  async saveCabinetNote(prompt: string, content: string): Promise<CabinetNote> {
    await delay(200)
    const note: CabinetNote = {
      id: `cn_${Date.now()}`,
      prompt,
      content,
      status: 'draft',
      createdAt: new Date().toISOString(),
    }
    _cabinetNotes = [note, ..._cabinetNotes]
    auditLog('Cabinet note saved', note.id, `Draft saved: "${prompt.substring(0, 50)}"`)
    return note
  },
  async signCabinetNote(id: string): Promise<CabinetNote | undefined> {
    await delay(300)
    _cabinetNotes = _cabinetNotes.map(n =>
      n.id === id ? { ...n, status: 'signed' as const, signedAt: new Date().toISOString() } : n
    )
    auditLog('Cabinet note signed', id, 'Digitally signed and locked by PS Health')
    return _cabinetNotes.find(n => n.id === id)
  },
  async sendCabinetNoteToMinister(id: string, channel: string) {
    await delay(500)
    _cabinetNotes = _cabinetNotes.map(n =>
      n.id === id ? { ...n, status: 'sent' as const, sentAt: new Date().toISOString() } : n
    )
    auditLog('Cabinet note sent', id, `Sent to Minister via ${channel}`)
    console.log(`[Secretary Demo] Cabinet note ${id} sent to Minister via ${channel}`)
  },
  getCabinetNotes() { return [..._cabinetNotes] },

  // ── Assembly ──────────────────────────────────────────────────────────
  async getAssemblyQuestions(): Promise<AssemblyQuestion[]> {
    await delay()
    return [..._assemblyQs]
  },
  async draftAssemblyAnswer(questionId: string): Promise<string> {
    await delay(1500)
    const q = _assemblyQs.find(x => x.id === questionId)
    if (!q) return 'Answer draft not available.'
    if (q.draftAnswer) return q.draftAnswer
    return `**Answer to ${q.questionNumber}**\n\nThe Government informs the Hon'ble House that the subject matter of the question has been carefully reviewed. The Department of Health & Family Welfare, Madhya Pradesh, has taken the following actions:\n\n1. The matter has been actively monitored at Secretary level.\n2. District-wise performance data has been compiled and shared with relevant authorities.\n3. Corrective measures are in progress and outcomes will be reported to the House at the next session.\n\nDetailed district-wise data is being compiled and will be placed on the House table.`
  },
  async saveDraftAnswer(questionId: string, answer: string) {
    await delay(200)
    _assemblyQs = _assemblyQs.map(q =>
      q.id === questionId ? { ...q, draftAnswer: answer, status: 'drafted' as const } : q
    )
    auditLog('Assembly answer drafted', questionId, 'Draft answer saved')
  },
  async lodgeAssemblyAnswer(questionId: string) {
    await delay(300)
    _assemblyQs = _assemblyQs.map(q =>
      q.id === questionId ? { ...q, status: 'lodged' as const } : q
    )
    auditLog('Assembly answer lodged', questionId, 'Answer lodged with Vidhansabha secretariat')
  },

  // ── Medical colleges ─────────────────────────────────────────────────
  async getMedicalColleges(): Promise<MedicalCollege[]> {
    await delay()
    return [..._medicalColleges]
  },

  // ── Audit log ─────────────────────────────────────────────────────────
  async getAuditLog(): Promise<AuditLogEntrySecretary[]> {
    await delay(100)
    return [..._auditLog]
  },
}
