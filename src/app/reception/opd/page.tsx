"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search, ArrowRight, UserPlus, CheckCircle2, Volume2, Clock,
  Activity, Ambulance, ShieldCheck, Fingerprint, BadgeCheck, AlertTriangle,
} from "lucide-react"
import { usePatientStore, type QueueStatus, type TriageLevel } from "@/store/usePatientStore"
import { computeQueueEta } from "@/lib/queueEta"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { NeonBadge } from "@/components/ui/neon-badge"
import { SideDrawer } from "@/components/ui/SideDrawer"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { notifyAndAuditMany } from "@/lib/notifyAndAudit"
import { AadhaarAbhaFlow, type AadhaarAbhaResult } from "@/components/reception/AadhaarAbhaFlow"

const NEXT_STATUS: Partial<Record<QueueStatus, QueueStatus>> = {
  waiting: 'vitals', vitals: 'consulting', consulting: 'pharmacy', pharmacy: 'billing', billing: 'done',
}
const NEXT_LABEL: Partial<Record<QueueStatus, string>> = {
  waiting: 'Send to Vitals', vitals: 'Send to Doctor', consulting: 'Send to Pharmacy',
  pharmacy: 'Send to Billing', billing: 'Mark Done',
}

const STATUS_PILL: Record<QueueStatus, { label: string; cls: string }> = {
  waiting:    { label: 'Waiting',    cls: 'bg-slate-100 text-slate-600' },
  vitals:     { label: 'In Vitals',  cls: 'bg-amber-100 text-amber-700' },
  consulting: { label: 'Consulting', cls: 'bg-blue-100 text-blue-700' },
  pharmacy:   { label: 'Pharmacy',   cls: 'bg-green-100 text-green-700' },
  billing:    { label: 'Billing',    cls: 'bg-amber-100 text-amber-700' },
  done:       { label: 'Completed',  cls: 'bg-green-100 text-green-700' },
}

const SOURCE_META: Record<NonNullable<ReturnType<typeof sourceOf>>, { label: string; cls: string }> = {
  walk_in:     { label: 'Walk-in',     cls: 'bg-slate-100 text-slate-600' },
  online:      { label: 'Online token', cls: 'bg-[rgba(8,145,178,0.10)] text-[var(--color-primary-dark)]' },
  appointment: { label: 'Appointment', cls: 'bg-violet-100 text-violet-700' },
}
function sourceOf(s?: 'walk_in' | 'online' | 'appointment') { return s ?? 'walk_in' }

const TRIAGE_RANK: Record<TriageLevel, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 }
const getTriageTheme = (triage?: string) => {
  switch (triage) {
    case 'Critical': return { variant: 'danger' as const,  bar: 'bg-red-500' }
    case 'High':     return { variant: 'orange' as const,  bar: 'bg-orange-500' }
    case 'Medium':   return { variant: 'warning' as const, bar: 'bg-amber-400' }
    default:         return { variant: 'success' as const, bar: 'bg-green-500' }
  }
}

const STATUS_FILTERS = ['All', 'Waiting', 'Needs Aadhaar', 'In Vitals', 'In Care', 'Done'] as const
type StatusFilter = typeof STATUS_FILTERS[number]
function matchesStatusFilter(status: QueueStatus, hasUhid: boolean, filter: StatusFilter): boolean {
  switch (filter) {
    case 'All':           return true
    case 'Waiting':       return status === 'waiting'
    case 'Needs Aadhaar': return status === 'waiting' && !hasUhid
    case 'In Vitals':     return status === 'vitals'
    case 'In Care':       return status === 'consulting' || status === 'pharmacy' || status === 'billing'
    case 'Done':          return status === 'done'
  }
}

export default function OpdQueuePage() {
  const router = useRouter()
  const { patients, updateStatus, sendToEmergency, linkPatientIdentity } = usePatientStore()
  const [search, setSearch] = useState("")
  const [filterTriage, setFilterTriage] = useState<string>("All")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All")
  const [cleared, setCleared] = useState<string[]>([])

  // Aadhaar-verification drawer for online patients lacking a hospital identity.
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
  const [verifiedDone, setVerifiedDone] = useState(false)
  const verifyingPatient = patients.find(p => p.id === verifyingId)

  const todayISO = new Date().toISOString().slice(0, 10)

  const base = patients.filter(p => {
    const matchToday = (p.registeredDate ?? todayISO) === todayISO
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase())
    const matchTriage = filterTriage === 'All' || p.triageLevel === filterTriage
    const notCleared = !(p.queueStatus === 'done' && cleared.includes(p.id))
    return matchToday && matchSearch && matchTriage && notCleared
  })

  const rows = base
    .filter(p => matchesStatusFilter(p.queueStatus, !!p.uhid, statusFilter))
    .sort((a, b) => (TRIAGE_RANK[a.triageLevel ?? 'Low'] - TRIAGE_RANK[b.triageLevel ?? 'Low']) || a.token - b.token)

  const countFor = (f: StatusFilter) => base.filter(p => matchesStatusFilter(p.queueStatus, !!p.uhid, f)).length

  const handleAdvance = (id: string, currentStatus: QueueStatus) => {
    const next = NEXT_STATUS[currentStatus]
    if (!next) return
    updateStatus(id, next)
    toast.success(`Patient moved to ${STATUS_PILL[next].label}`)
  }

  const announce = (token: number, name: string, room?: string) => {
    const msg = `Token number ${token}, ${name}, please proceed${room ? ` to ${room}` : ''}.`
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(msg))
      }
    } catch { /* speech optional */ }
    toast.success(`Announced token #${token}`, { description: name })
  }

  const escalate = (id: string, name: string, triageLevel?: TriageLevel) => {
    sendToEmergency(id)
    notifyAndAuditMany(['emergency', 'doctor', 'bed_manager'], {
      type: 'system', priority: 'critical',
      title: `EMERGENCY · ${name}`,
      body: `${name} (${triageLevel ?? 'High'} acuity) escalated from OPD reception. Triage immediately.`,
      patientName: name,
      audit: { action: 'reception_emergency_escalation', resource: 'patient', resourceId: id, detail: `Patient ${name} escalated to Emergency from reception`, userName: 'Reception' },
    })
    toast.error(`${name} sent to Emergency — ER + Doctor + Bed-Manager notified`, { description: `${triageLevel ?? 'Low'} acuity` })
  }

  const openVerify = (id: string) => { setVerifyingId(id); setVerifiedDone(false) }
  const closeVerify = () => { setVerifyingId(null); setVerifiedDone(false) }
  const handleVerified = (r: AadhaarAbhaResult) => {
    if (!verifyingId) return
    linkPatientIdentity(verifyingId, { uhid: r.uhid, abhaId: r.abhaId, aadhaarVerified: true })
    setVerifiedDone(true)
    toast.success('Hospital identity linked', { description: `UHID ${r.uhid}` })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)]">

      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
            <Input
              placeholder="Search patients by name or ID..."
              aria-label="Search patients"
              className="pl-10 h-10 text-[14px] font-medium shadow-sm border-slate-200 bg-white focus-visible:ring-[var(--color-primary)] rounded-xl"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1">
            {['All', 'Critical', 'High', 'Medium', 'Low'].map(t => (
              <button key={t} onClick={() => setFilterTriage(t)}
                className={cn(
                  "text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                  filterTriage === t ? "bg-[var(--color-primary)] text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                )}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={() => router.push('/reception/register')} size="lg"
          className="h-10 px-5 gap-2 font-bold shadow-sm hover:shadow-md transition-all rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white cursor-pointer">
          <UserPlus className="h-4 w-4" aria-hidden="true" /> Register Walk-in
        </Button>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        {STATUS_FILTERS.map(f => {
          const n = countFor(f)
          return (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={cn(
                "flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer border",
                statusFilter === f ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50",
                f === 'Needs Aadhaar' && statusFilter !== f && n > 0 && "border-amber-300 text-amber-700 bg-amber-50"
              )}>
              {f === 'Needs Aadhaar' && <Fingerprint className="h-3.5 w-3.5" />}
              {f}
              <span className={cn("text-[10.5px] font-bold px-1.5 py-0.5 rounded-full", statusFilter === f ? "bg-white/20" : "bg-slate-100 text-slate-500")}>{n}</span>
            </button>
          )
        })}
      </div>

      {/* Unified queue list */}
      <div className="flex-1 overflow-y-auto pb-4 space-y-2.5">
        <AnimatePresence>
          {rows.map(p => {
            const triage = getTriageTheme(p.triageLevel)
            const eta = computeQueueEta(p, patients)
            const hasUhid = !!p.uhid
            const status = STATUS_PILL[p.queueStatus]
            const source = SOURCE_META[sourceOf(p.source)]
            const isWaiting = p.queueStatus === 'waiting'
            const canAnnounce = p.queueStatus === 'waiting' || p.queueStatus === 'vitals' || p.queueStatus === 'consulting'
            const nextLabel = NEXT_LABEL[p.queueStatus]

            return (
              <motion.div
                layout
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white border border-slate-200 shadow-sm rounded-xl p-3.5 hover:shadow-md hover:border-slate-300 transition-all flex items-center gap-3 relative overflow-hidden"
              >
                <div className={cn("absolute left-0 top-0 bottom-0 w-1", triage.bar)} />

                {/* Token */}
                <div className="ml-1 h-10 w-10 rounded-xl bg-slate-50 text-slate-700 border border-slate-100 flex items-center justify-center font-bold text-[13px] flex-shrink-0">#{p.token}</div>

                {/* Photo */}
                {p.photoUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={p.photoUrl} alt={p.name} className="h-10 w-10 rounded-xl object-cover ring-1 ring-slate-200 flex-shrink-0" />
                )}

                {/* Identity + name */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[14px] font-bold text-slate-900 leading-tight flex items-center gap-1">
                      {p.name}
                      {p.phoneVerified && <ShieldCheck className="h-3 w-3 text-emerald-500" aria-label="Mobile verified" />}
                    </p>
                    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md", source.cls)}>{source.label}</span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">{p.department} • {p.age}y{p.symptoms.length > 0 ? ` • ${p.symptoms[0]}` : ''}</p>
                </div>

                {/* Identity chip */}
                {hasUhid ? (
                  <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1 flex-shrink-0">
                    <BadgeCheck className="h-3.5 w-3.5" /> {p.uhid}
                  </span>
                ) : (
                  <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 flex-shrink-0">
                    <AlertTriangle className="h-3.5 w-3.5" /> Needs Aadhaar
                  </span>
                )}

                {/* Triage */}
                {p.triageLevel && (
                  <NeonBadge variant={triage.variant} className="px-1.5 py-0.5 text-[10px] uppercase tracking-wider font-bold flex-shrink-0">{p.triageLevel}</NeonBadge>
                )}

                {/* Status pill */}
                <span className={cn("text-[11px] font-bold px-2 py-1 rounded-lg flex-shrink-0", status.cls)}>{status.label}</span>

                {/* Meta: arrival + wait */}
                <div className="hidden lg:flex flex-col items-end text-[10.5px] font-medium text-slate-400 flex-shrink-0 w-24">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {p.registeredAt}</span>
                  {isWaiting && (eta.nextUp
                    ? <span className="text-green-600 font-semibold">Next up</span>
                    : <span>~{eta.etaMin}m · {eta.positionAhead} ahead</span>)}
                  {p.vitals && <span className="flex items-center gap-1 text-green-600 font-semibold"><Activity className="h-3 w-3" /> Vitals done</span>}
                </div>

                {/* Primary action */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {isWaiting && !hasUhid ? (
                    <Button onClick={() => openVerify(p.id)} className="h-8 px-3 rounded-lg gap-1.5 text-[11.5px] bg-amber-500 hover:bg-amber-600 text-white">
                      <Fingerprint className="h-3.5 w-3.5" /> Complete Aadhaar
                    </Button>
                  ) : isWaiting && hasUhid ? (
                    <Button onClick={() => handleAdvance(p.id, 'waiting')} className="h-8 px-3 rounded-lg gap-1.5 text-[11.5px]">
                      <Activity className="h-3.5 w-3.5" /> Send to Vitals
                    </Button>
                  ) : nextLabel ? (
                    <button onClick={() => handleAdvance(p.id, p.queueStatus)} aria-label={nextLabel}
                      className="flex items-center gap-1.5 text-[11.5px] font-bold text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] transition-colors cursor-pointer px-2">
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /> {nextLabel}
                    </button>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[11.5px] font-bold text-green-600 px-2"><CheckCircle2 className="h-3.5 w-3.5" /> Complete</span>
                  )}

                  {canAnnounce && (
                    <button onClick={() => announce(p.token, p.name, p.queueStatus === 'consulting' ? 'consultation' : undefined)}
                      aria-label={`Announce token ${p.token}`} title="Announce / call token"
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-[var(--color-primary)] hover:bg-[rgba(8,145,178,0.10)] transition cursor-pointer">
                      <Volume2 className="h-4 w-4" />
                    </button>
                  )}
                  {canAnnounce && (
                    <button onClick={() => escalate(p.id, p.name, p.triageLevel)}
                      aria-label={`Send ${p.name} to Emergency`} title="Send to Emergency"
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-red-500 hover:text-white hover:bg-red-500 transition cursor-pointer">
                      <Ambulance className="h-4 w-4" />
                    </button>
                  )}
                  {p.queueStatus === 'done' && (
                    <button onClick={() => setCleared(c => [...c, p.id])} className="text-[11px] font-bold text-slate-400 hover:text-red-600 transition cursor-pointer px-1">Clear</button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {rows.length === 0 && (
          <div className="flex items-center justify-center h-40 border-2 border-dashed border-slate-200 rounded-xl bg-white/50">
            <p className="text-[13px] font-semibold text-slate-400">No patients in this view</p>
          </div>
        )}
      </div>

      {/* Aadhaar verification drawer */}
      <SideDrawer
        open={!!verifyingId}
        onClose={closeVerify}
        title="Complete Aadhaar verification"
        description={verifyingPatient ? `${verifyingPatient.name} · Token #${verifyingPatient.token}` : undefined}
        icon={Fingerprint}
        width="md"
        footer={verifiedDone ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={closeVerify} className="flex-1 rounded-xl">Done</Button>
            <Button onClick={() => { if (verifyingId) updateStatus(verifyingId, 'vitals'); closeVerify() }} className="flex-1 rounded-xl gap-1.5">
              <Activity className="h-4 w-4" /> Send to Vitals
            </Button>
          </div>
        ) : undefined}
      >
        {verifyingId && <AadhaarAbhaFlow key={verifyingId} onComplete={handleVerified} />}
      </SideDrawer>
    </div>
  )
}
