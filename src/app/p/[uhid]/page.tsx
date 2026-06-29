"use client"

// M13.11 — Public family tracking page.
//
// The SMS sent to the attendant from the ER registration form points here:
//   https://agentix.in/p/<uhid>
// Anyone with the link can see live status (no login required, like Apollo /
// Manipal patient-tracking pages). Polls every 10 seconds to feel real-time;
// shows the same journey data the staff portal aggregates, in WhatsApp-style
// chat-bubble format with patient-friendly language.

import { use, useEffect, useMemo, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Heart, Clock, Phone, Hospital, AlertTriangle, CheckCircle2,
  ClipboardList, Bed, Stethoscope, FlaskConical, ScanLine,
  ShieldCheck, LogOut, Building2, Activity, Ambulance, MessageCircle,
  Lock,
} from "lucide-react"
import { usePatientStore } from "@/store/usePatientStore"
import { useInpatientStore } from "@/store/useInpatientStore"
import { useERStore } from "@/store/useERStore"
import { useFamilyTokenStore } from "@/store/useFamilyTokenStore"
import { validateFamilyToken } from "@/lib/familyToken"
import { aggregateJourney, DEPT_COLOR, type Department, type JourneyEvent } from "@/lib/journeyAggregator"
import { cn } from "@/lib/utils"

const DEPT_ICON: Record<Department, React.ElementType> = {
  Reception: ClipboardList, Emergency: AlertTriangle, Nursing: Activity, Doctor: Stethoscope,
  Lab: FlaskConical, Radiology: ScanLine, Pharmacy: Heart, OT: Building2,
  IPD: Bed, Discharge: LogOut, Billing: Heart, Insurance: ShieldCheck,
}

// Patient-friendly language. Hides clinical jargon ("ESI 2", "qSOFA+") and
// rewrites titles to be reassuring without lying. Critical events still
// surface as red banners with "call us immediately" guidance.
const PUBLIC_REWRITE: Array<[RegExp, string]> = [
  [/^Registered/, "You're registered at Agentix HIMS"],
  [/^ER arrival/, "You arrived at the Emergency department"],
  [/^Triaged ESI \d/, "Triage assessment complete"],
  [/^Claimed by/, "Your doctor is now reviewing you"],
  [/^ER vitals/, "Your vitals were recorded"],
  [/^OPD vitals recorded/, "Your vitals were recorded"],
  [/^Disposition · Admit/, "You're being admitted for further care"],
  [/^Disposition · Discharge/, "You're cleared to go home"],
  [/^Disposition · Transfer/, "Transfer being arranged to another facility"],
  [/^Lab ordered/, "Your doctor ordered some lab tests"],
  [/^Specimen collected/, "Your blood sample was collected"],
  [/^.* released/, "Your test result is ready"],
  [/^Imaging ordered/, "Your doctor ordered an imaging scan"],
  [/^Study acquired/, "Your imaging scan is complete"],
  [/^Report verified/, "Your imaging report is ready"],
  [/^OT booked/, "Your surgery is booked"],
  [/^Surgery started/, "Your surgery has started"],
  [/^Surgery completed/, "Your surgery is complete"],
  [/^Discharge initiated/, "Discharge process started"],
  [/^Exit clearance issued/, "You can leave the hospital"],
  [/^Claim/, "Insurance update"],
]
function publicTitle(t: string): string {
  for (const [re, rep] of PUBLIC_REWRITE) if (re.test(t)) return t.replace(re, rep)
  return t
}

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
const fmtDate = (iso: string) => {
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === new Date(today.getTime() - 86400000).toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function groupByDate(events: JourneyEvent[]): { date: string; events: JourneyEvent[] }[] {
  const groups = new Map<string, JourneyEvent[]>()
  for (const e of events) {
    const key = new Date(e.at).toDateString()
    const cur = groups.get(key) ?? []
    cur.push(e)
    groups.set(key, cur)
  }
  return Array.from(groups.entries()).map(([_, list]) => ({
    date: list[0] ? fmtDate(list[0].at) : '',
    events: list,
  }))
}

// Centered card shell shared by every gate/loading state.
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">{children}</div>
    </div>
  )
}

function LoadingShell() {
  return (
    <Shell>
      <Hospital className="h-12 w-12 text-emerald-600 mx-auto mb-3 motion-safe:animate-pulse" aria-hidden="true" />
      <p className="text-sm text-slate-500">Loading secure tracking…</p>
    </Shell>
  )
}

// useSearchParams() must sit inside a Suspense boundary.
export default function FamilyTrackPage({ params }: { params: Promise<{ uhid: string }> }) {
  return (
    <Suspense fallback={<LoadingShell />}>
      <FamilyTrackInner params={params} />
    </Suspense>
  )
}

function FamilyTrackInner({ params }: { params: Promise<{ uhid: string }> }) {
  const { uhid } = use(params)
  // Up-case so /p/pt-44012 and /p/PT-44012 both work — matches SMS-link behavior.
  const upUhid = uhid.toUpperCase()
  const router = useRouter()
  // Access token from the SMS link (?t=…). Validated before any PHI renders.
  const token = useSearchParams().get('t')

  // Live polling — re-aggregate every 10s so newly logged events appear.
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 10_000)
    return () => clearInterval(iv)
  }, [])

  const revoked = useFamilyTokenStore(s => s.revoked)
  const activeRecord = useFamilyTokenStore(s => s.records[upUhid])
  const validation = useMemo(
    () => validateFamilyToken(token, upUhid, { revoked }),
    [token, upUhid, revoked],
  )

  // Open a staff-issued link in place (the "resend secure link" affordance):
  // navigates to the same page with the active, consented token attached.
  const openWithToken = (t: string) => router.replace(`/p/${uhid}?t=${t}`)
  const consentAndOpen = () => {
    const fam = useFamilyTokenStore.getState()
    const name = validation.payload?.name ?? activeRecord?.name ?? 'Patient'
    const t = fam.grantConsent(upUhid) ?? fam.issue(upUhid, name, { consent: true })
    openWithToken(t)
  }

  const patient    = usePatientStore(s => s.patients.find(p => p.id === upUhid))
  const inpatient  = useInpatientStore(s => s.inpatients.find(i => i.patientId === upUhid))
  const erRecord   = useERStore(s => s.patients.find(e => e.patientId === upUhid))

  const name = patient?.name ?? inpatient?.name ?? erRecord?.name ?? 'Patient'
  const age  = patient?.age  ?? inpatient?.age  ?? erRecord?.age
  const phone = patient?.phone

  const events = useMemo(
    () => aggregateJourney(upUhid, name),
    // tick is intentionally in the dep array — it forces re-aggregation every 10s.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [upUhid, name, tick],
  )

  const grouped = useMemo(() => groupByDate(events), [events])
  const lastEvent = events[events.length - 1]
  const currentLocation = useMemo(() => {
    if (inpatient && inpatient.stage !== 'discharged') return `${inpatient.ward} · Bed ${inpatient.bed}`
    if (erRecord && erRecord.phase !== 'disposed') return `Emergency · ${erRecord.area ?? 'Triage'}`
    if (patient && patient.queueStatus !== 'done') return `OPD · ${patient.department}`
    return 'Visit complete'
  }, [inpatient, erRecord, patient])

  const criticalEvent = useMemo(
    () => events.find(e => e.severity === 'critical' && Date.now() - new Date(e.at).getTime() < 4 * 3600000),
    [events],
  )

  // ── Access gate ─────────────────────────────────────────────────────────
  // Validate the link's token BEFORE revealing any patient data — the UHID
  // alone is not a credential. (Frontend pattern; a real backend enforces the
  // same payload via HMAC + a route handler.)
  if (!validation.ok) {
    // A staff-issued, consented, still-valid link exists in this session —
    // offer to open it (the "resend secure link" affordance). Validity
    // (signature, expiry, consent, revocation) is checked via the lib.
    const fallback = activeRecord
      && validateFamilyToken(activeRecord.token, upUhid, { revoked }).ok
      ? activeRecord
      : undefined

    if (validation.reason === 'no-consent') {
      return (
        <Shell>
          <ShieldCheck className="h-12 w-12 text-emerald-600 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-slate-900">Consent needed</h1>
          <p className="text-sm text-slate-500 mt-2">
            Live tracking for <span className="font-bold">{validation.payload?.name ?? 'this patient'}</span> shares
            ward, care-team and progress with whoever holds this link. Continue only if you are
            the patient or an authorized family member.
          </p>
          <button onClick={consentAndOpen}
            className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-sm">
            <CheckCircle2 className="h-4 w-4" />I consent — show live status
          </button>
          <p className="text-[11px] text-slate-400 mt-3">Your consent is recorded. You can ask the hospital to revoke this link anytime.</p>
        </Shell>
      )
    }

    const expired = validation.reason === 'expired'
    return (
      <Shell>
        <Lock className="h-12 w-12 text-amber-500 mx-auto mb-3" />
        <h1 className="text-xl font-bold text-slate-900">{expired ? 'Link expired' : 'Secure link required'}</h1>
        <p className="text-sm text-slate-500 mt-2">
          {expired
            ? 'This tracking link has expired for the patient’s privacy.'
            : 'This page needs the secure link sent to you by SMS — the patient ID alone can’t open it.'}
        </p>
        {fallback ? (
          <button onClick={() => openWithToken(fallback.token)}
            className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-sm">
            <ShieldCheck className="h-4 w-4" />Open secure view
          </button>
        ) : (
          <a href="tel:+918012340000"
            className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-sm">
            <Phone className="h-4 w-4" />Ask hospital to resend link
          </a>
        )}
        <p className="text-[11px] text-slate-400 mt-3 font-mono">{upUhid}</p>
      </Shell>
    )
  }

  if (!patient && !inpatient && !erRecord) {
    return (
      <Shell>
        <Hospital className="h-12 w-12 text-emerald-600 mx-auto mb-3" />
        <h1 className="text-xl font-bold text-slate-900">Agentix HIMS</h1>
        <p className="text-sm text-slate-500 mt-2">
          Patient ID <span className="font-mono font-bold">{upUhid}</span> not found.
          Check the link from your SMS — UHIDs look like <span className="font-mono">PT-XXXXX</span>.
        </p>
        <a href="tel:+918012340000" className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-sm">
          <Phone className="h-4 w-4" />Call hospital
        </a>
      </Shell>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-slate-50">
      {/* Header — WhatsApp-y green */}
      <div className="bg-emerald-600 text-white px-4 py-4 sticky top-0 z-20 shadow-sm">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center font-bold">
              {name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base truncate">{name}</p>
              <p className="text-[11px] opacity-90 truncate flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 motion-safe:animate-pulse" aria-hidden="true" />
                {currentLocation}
              </p>
            </div>
            <a href="tel:+918012340000"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-[11px] font-bold transition">
              <Phone className="h-3 w-3" />Hospital
            </a>
          </div>
          <p className="text-[10px] opacity-80 mt-1.5">
            UHID <span className="font-mono">{upUhid}</span>{age ? ` · ${age}y` : ''}{phone ? ` · ${phone}` : ''} · Updates every 10 seconds
          </p>
        </div>
      </div>

      <div className="max-w-md mx-auto p-3 space-y-3">
        {/* Authorization banner — confirms this link is consented + time-boxed */}
        {validation.ok && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
            <p className="text-[11px] text-emerald-800">
              Tracking authorized · access expires {fmtDate(new Date(validation.payload.exp).toISOString())} {fmtTime(new Date(validation.payload.exp).toISOString())}
            </p>
          </div>
        )}

        {/* Critical banner (recent only) */}
        {criticalEvent && (
          <div role="alert" className="rounded-xl bg-red-50 border border-red-200 p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-red-900">{publicTitle(criticalEvent.title)}</p>
              <p className="text-[11px] text-red-700 mt-0.5">If you have any concerns, please speak with the duty doctor at the nursing station.</p>
            </div>
          </div>
        )}

        {/* Latest status card — announced to assistive tech as it updates */}
        {lastEvent && (
          <div aria-live="polite" className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-400 mb-1">
              <Activity className="h-3 w-3" />Latest update
            </div>
            <p className="text-sm font-bold text-slate-900">{publicTitle(lastEvent.title)}</p>
            <p className="text-[11px] text-slate-500 mt-0.5" suppressHydrationWarning>
              {fmtTime(lastEvent.at)} · by {lastEvent.actor ?? 'hospital staff'}
            </p>
          </div>
        )}

        {/* Patient-side care info */}
        {inpatient && (
          <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm space-y-2">
            <p className="text-[10px] font-bold uppercase text-slate-400">Your care team</p>
            <div className="flex items-center gap-2 text-[12px]">
              <Stethoscope className="h-3.5 w-3.5 text-[var(--color-primary)] flex-shrink-0" />
              <span><b className="text-slate-700">Doctor:</b> {inpatient.admittingDoctor}</span>
            </div>
            <div className="flex items-center gap-2 text-[12px]">
              <Bed className="h-3.5 w-3.5 text-[var(--color-primary)] flex-shrink-0" />
              <span><b className="text-slate-700">Room:</b> {inpatient.ward} · Bed {inpatient.bed}</span>
            </div>
            {inpatient.expectedDischarge && (
              <div className="flex items-center gap-2 text-[12px]">
                <Clock className="h-3.5 w-3.5 text-[var(--color-primary)] flex-shrink-0" />
                <span><b className="text-slate-700">Expected home:</b> {inpatient.expectedDischarge}</span>
              </div>
            )}
          </div>
        )}

        {/* WhatsApp-style timeline */}
        <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
            <p className="text-[12px] font-bold text-slate-700 flex items-center gap-1.5">
              <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />Hospital updates
            </p>
          </div>
          <div role="log" aria-label="Hospital updates timeline" className="p-4 space-y-3 max-h-[60vh] overflow-y-auto" style={{ background: 'linear-gradient(180deg,#FAF7F0,#F5F0E5)' }}>
            {events.length === 0 && (
              <p className="text-center text-xs text-slate-500 py-8">
                You're registered. Updates will start appearing as your visit progresses.
              </p>
            )}
            {grouped.map(({ date, events: list }) => (
              <div key={date}>
                <div className="flex items-center justify-center my-2">
                  <span className="text-[10px] font-bold uppercase text-slate-500 bg-white px-2 py-0.5 rounded-full shadow-sm">{date}</span>
                </div>
                {list.map((e, i) => {
                  const Icon = DEPT_ICON[e.dept] ?? Activity
                  const color = DEPT_COLOR[e.dept]
                  return (
                    <div key={`${e.at}-${i}`} className="flex gap-2 mb-2">
                      <div className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: color }}>
                        <Icon className="h-3.5 w-3.5 text-white" />
                      </div>
                      <div className={cn("flex-1 min-w-0 rounded-xl p-2.5 shadow-sm",
                        e.severity === 'critical' ? 'bg-red-50 border border-red-200'
                        : e.severity === 'warning' ? 'bg-amber-50 border border-amber-200'
                        : e.severity === 'success' ? 'bg-emerald-50 border border-emerald-200'
                        : 'bg-white border border-slate-200')}>
                        <p className="text-[12px] font-bold text-slate-900">{publicTitle(e.title)}</p>
                        {e.actor && <p className="text-[10px] text-slate-500 mt-0.5">{e.actor}</p>}
                        <p className="text-[10px] text-slate-400 mt-0.5" suppressHydrationWarning>{fmtTime(e.at)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Hospital contact card */}
        <div className="rounded-2xl bg-emerald-600 text-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase text-emerald-100">Need help?</p>
          <p className="text-sm font-bold mt-0.5">Reception · 24×7</p>
          <p className="text-[11px] text-emerald-100">For urgent concerns about your patient, speak with the duty doctor at the nursing station first.</p>
          <a href="tel:+918012340000"
            className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-white text-emerald-700 font-bold text-[12px]">
            <Phone className="h-3 w-3" />+91 80 1234 0000
          </a>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-slate-400 py-2">
          Agentix HIMS · This is a live tracking page · Updates every 10 seconds
        </p>
      </div>
    </div>
  )
}
