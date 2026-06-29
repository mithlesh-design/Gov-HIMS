"use client"

import { Select } from "@/components/ui/Select"
import { useState, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search, X, Volume2, ArrowRight, Phone, Calendar, Stethoscope, Activity,
  Clock, Droplet, FileText, ShieldCheck, ChevronRight, Users as UsersIcon,
} from "lucide-react"
import { usePatientStore, type Patient, type QueueStatus, type TriageLevel } from "@/store/usePatientStore"
import { useAuthStore } from "@/store/useAuthStore"
import { notifyAndAudit } from "@/lib/notifyAndAudit"
import type { Role } from "@/types/roles"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { PatientJourneyTimeline } from "@/components/clinical/PatientJourneyTimeline"

const STATUS_LABEL: Record<QueueStatus, string> = {
  waiting: 'Waiting', vitals: 'Vitals', consulting: 'Consulting', pharmacy: 'Pharmacy', billing: 'Billing', done: 'Completed',
}
const STATUS_TINT: Record<QueueStatus, string> = {
  waiting: 'bg-amber-50 text-amber-700', vitals: 'bg-sky-50 text-sky-700', consulting: 'bg-[rgba(8,145,178,0.07)] text-[var(--color-primary)]',
  pharmacy: 'bg-[rgba(8,145,178,0.07)] text-[var(--color-primary)]', billing: 'bg-orange-50 text-orange-700', done: 'bg-green-50 text-green-700',
}
const TRIAGE_TINT: Record<TriageLevel, string> = {
  Critical: 'bg-red-50 text-red-700', High: 'bg-orange-50 text-orange-700', Medium: 'bg-amber-50 text-amber-700', Low: 'bg-green-50 text-green-700',
}
const NEXT_STATUS: Partial<Record<QueueStatus, { next: QueueStatus; label: string }>> = {
  waiting: { next: 'vitals', label: 'Send to Vitals' }, vitals: { next: 'consulting', label: 'Send to Doctor' },
  consulting: { next: 'pharmacy', label: 'Send to Pharmacy' }, pharmacy: { next: 'billing', label: 'Send to Billing' },
  billing: { next: 'done', label: 'Mark Done' },
}
const DEPARTMENTS = ['All', 'General Medicine', 'Cardiology', 'Orthopaedics', 'Gynaecology', 'ENT', 'Ophthalmology', 'Dermatology', 'Paediatrics']
const TABS = ['Today', 'Yesterday', 'Upcoming', 'All'] as const
type Tab = typeof TABS[number]

const initials = (n: string) => n.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

const NOTIFY_ROLE_BY_NEXT: Partial<Record<QueueStatus, Role>> = {
  vitals: 'nurse', consulting: 'doctor', pharmacy: 'pharmacy', billing: 'billing',
}

export default function ReceptionPatients() {
  const { patients, visits, appointments, updateStatus } = usePatientStore()
  const currentUser = useAuthStore(s => s.currentUser)
  const [tab, setTab] = useState<Tab>('Today')
  const [search, setSearch] = useState('')
  const [dept, setDept] = useState('All')
  const [triage, setTriage] = useState('All')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const todayISO = new Date().toISOString().slice(0, 10)
  const yesterdayISO = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const upcomingIds = useMemo(
    () => new Set(appointments.filter(a => a.status !== 'cancelled' && a.date > todayISO).map(a => a.patientId)),
    [appointments, todayISO],
  )

  const bucket = (t: Tab): Patient[] => {
    if (t === 'Today') return patients.filter(p => (p.registeredDate ?? todayISO) === todayISO)
    if (t === 'Yesterday') return patients.filter(p => p.registeredDate === yesterdayISO)
    if (t === 'Upcoming') return patients.filter(p => upcomingIds.has(p.id))
    return patients // All
  }

  const counts = Object.fromEntries(TABS.map(t => [t, bucket(t).length])) as Record<Tab, number>

  const rows = bucket(tab).filter(p => {
    const q = search.trim().toLowerCase()
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.phone.includes(q)
    const matchDept = dept === 'All' || p.department === dept
    const matchTriage = triage === 'All' || p.triageLevel === triage
    return matchSearch && matchDept && matchTriage
  })

  const selected = patients.find(p => p.id === selectedId) ?? null

  // Close the detail drawer on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedId(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const announce = (p: Patient) => {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(`Token number ${p.token}, ${p.name}, please proceed.`))
      }
    } catch { /* optional */ }
    toast.success(`Announced token #${p.token}`, { description: p.name })
  }

  const advance = (p: Patient) => {
    const n = NEXT_STATUS[p.queueStatus]
    if (!n) return
    updateStatus(p.id, n.next)
    const targetRole = NOTIFY_ROLE_BY_NEXT[n.next]
    if (targetRole) {
      notifyAndAudit({
        to: targetRole, type: 'system', priority: 'medium',
        title: `${p.name} → ${STATUS_LABEL[n.next]}`,
        body: `${p.name} (${p.id}, token #${p.token}) routed from ${STATUS_LABEL[p.queueStatus]} to ${STATUS_LABEL[n.next]}. Department: ${p.department}.`,
        patientName: p.name,
        audit: { action: 'reception_queue_advance', resource: 'patient_queue', resourceId: p.id, detail: `Queue advance ${p.queueStatus} → ${n.next}`, userName: currentUser?.name ?? 'Reception' },
      })
    }
    toast.success(`${p.name} → ${STATUS_LABEL[n.next]}`)
  }

  return (
    <div className="pb-6">
      {/* Header + search */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-[24px] font-bold text-slate-900 tracking-tight">Patients</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Front-desk patient directory</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, ID or phone…"
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-white border border-slate-200 text-[14px] text-slate-800 placeholder:text-slate-400 outline-none focus:border-[rgba(8,145,178,0.30)] focus:ring-2 focus:ring-blue-100" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 w-fit mb-3">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition", tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
            {t} <span className={cn("text-[11px] font-bold px-1.5 rounded-full", tab === t ? "bg-[rgba(8,145,178,0.12)] text-[var(--color-primary)]" : "bg-slate-200 text-slate-500")}>{counts[t]}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Select value={dept} onChange={e => setDept(e.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[12.5px] font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100">
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d === 'All' ? 'All departments' : d}</option>)}
        </Select>
        <div className="flex gap-1">
          {['All', 'Critical', 'High', 'Medium', 'Low'].map(t => (
            <button key={t} onClick={() => setTriage(t)}
              className={cn("text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition", triage === t ? "bg-[var(--color-primary)] text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50")}>{t}</button>
          ))}
        </div>
        <span className="text-[12px] text-slate-400 ml-auto">{rows.length} patient{rows.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Rows */}
      {rows.length === 0 ? (
        <div className="rounded-2xl bg-white shadow-[0_1px_4px_rgba(15,23,42,0.06)] p-12 flex flex-col items-center text-center">
          <span className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3"><UsersIcon className="h-6 w-6 text-slate-400" /></span>
          <p className="text-[14px] font-semibold text-slate-700">No patients in this view</p>
          <p className="text-[12.5px] text-slate-500 mt-0.5">Try a different tab or clear the filters.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {rows.map(p => {
            const appt = appointments.find(a => a.patientId === p.id && a.date >= todayISO && a.status !== 'cancelled')
            return (
              <button key={p.id} onClick={() => setSelectedId(p.id)}
                className="text-left rounded-2xl bg-white shadow-[0_1px_4px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] p-4 hover:shadow-md transition group">
                <div className="flex items-start gap-3">
                  <span className="h-11 w-11 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white flex items-center justify-center font-bold text-[14px] flex-shrink-0">{initials(p.name)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[14.5px] font-bold text-slate-900 truncate">{p.name}</p>
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0", STATUS_TINT[p.queueStatus])}>{STATUS_LABEL[p.queueStatus]}</span>
                    </div>
                    <p className="text-[12px] text-slate-500">{p.id} · {p.age}y · {p.gender} · {p.department}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {p.triageLevel && <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider", TRIAGE_TINT[p.triageLevel])}>{p.triageLevel}</span>}
                      <span className="text-[11px] text-slate-400 flex items-center gap-1"><Clock className="h-3 w-3" /> {p.registeredAt}</span>
                      {tab === 'Upcoming' && appt && <span className="text-[11px] font-semibold text-[var(--color-primary)] flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(appt.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} {appt.time}</span>}
                      {tab === 'Yesterday' && <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1"><FileText className="h-3 w-3" /> Seen yesterday</span>}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 flex-shrink-0 mt-1" />
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Detail drawer */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={() => setSelectedId(null)} />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween', duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white z-50 shadow-2xl overflow-y-auto"
              role="dialog" aria-modal="true" aria-label="Patient details">
              <PatientDrawer patient={selected} visits={visits.filter(v => v.patientId === selected.id)}
                appointments={appointments.filter(a => a.patientId === selected.id)}
                onClose={() => setSelectedId(null)} onAnnounce={() => announce(selected)} onAdvance={() => advance(selected)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function PatientDrawer({ patient: p, visits, appointments, onClose, onAnnounce, onAdvance }: {
  patient: Patient
  visits: ReturnType<typeof usePatientStore.getState>['visits']
  appointments: ReturnType<typeof usePatientStore.getState>['appointments']
  onClose: () => void; onAnnounce: () => void; onAdvance: () => void
}) {
  const next = NEXT_STATUS[p.queueStatus]
  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-start justify-between gap-3 z-10">
        <div className="flex items-center gap-3">
          <span className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white flex items-center justify-center font-bold text-[16px]">{initials(p.name)}</span>
          <div>
            <p className="text-[17px] font-bold text-slate-900 leading-tight">{p.name}</p>
            <p className="text-[12.5px] text-slate-500">{p.id} · {p.age}y · {p.gender}</p>
          </div>
        </div>
        <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-slate-100"><X className="h-4.5 w-4.5 text-slate-500" /></button>
      </div>

      <div className="p-5 space-y-5">
        {/* Badges + token */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("text-[11px] font-bold px-2.5 py-1 rounded-full", STATUS_TINT[p.queueStatus])}>{STATUS_LABEL[p.queueStatus]}</span>
          {p.triageLevel && <span className={cn("text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider", TRIAGE_TINT[p.triageLevel])}>{p.triageLevel}</span>}
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">Token #{p.token}</span>
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1"><Droplet className="h-3 w-3 text-red-400" /> {p.bloodGroup}</span>
        </div>

        {/* Quick facts */}
        <div className="grid grid-cols-2 gap-2.5">
          <Fact icon={Phone} label="Phone" value={p.phone} />
          <Fact icon={Stethoscope} label="Doctor" value={p.doctor} />
          <Fact icon={Clock} label="Registered" value={p.registeredAt} />
          <Fact icon={Calendar} label="Department" value={p.department} />
        </div>

        {/* Vitals */}
        <Section title="Vitals">
          {p.vitals ? (
            <div className="grid grid-cols-3 gap-2">
              {[['BP', p.vitals.bp], ['Temp', p.vitals.temp], ['SpO₂', p.vitals.spo2], ['Pulse', p.vitals.pulse], ['Weight', p.vitals.weight]].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-slate-50 p-2.5"><p className="text-[10.5px] font-semibold text-slate-400">{k}</p><p className="text-[13px] font-bold text-slate-900">{v}</p></div>
              ))}
            </div>
          ) : <p className="text-[12.5px] text-amber-600 flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> Vitals not recorded yet</p>}
        </Section>

        {/* Symptoms + history */}
        <Section title="Chief complaint">
          {p.symptoms.length ? <div className="flex flex-wrap gap-1.5">{p.symptoms.map(s => <span key={s} className="text-[12px] font-medium bg-[rgba(8,145,178,0.07)] text-[var(--color-primary)] px-2.5 py-1 rounded-full">{s}</span>)}</div> : <p className="text-[12.5px] text-slate-400">None recorded</p>}
        </Section>
        {p.history.length > 0 && (
          <Section title="Medical history">
            <div className="flex flex-wrap gap-1.5">{p.history.map(h => <span key={h} className="text-[12px] font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">{h}</span>)}</div>
          </Section>
        )}

        {/* Appointments */}
        {appointments.length > 0 && (
          <Section title="Appointments">
            <div className="space-y-2">
              {appointments.map(a => (
                <div key={a.id} className="flex items-center gap-2.5 rounded-xl bg-slate-50 p-2.5">
                  <Calendar className="h-4 w-4 text-[var(--color-primary)] flex-shrink-0" />
                  <div className="flex-1 min-w-0"><p className="text-[12.5px] font-semibold text-slate-800 truncate">{a.doctorName} · {a.specialty}</p><p className="text-[11px] text-slate-500">{new Date(a.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {a.time}</p></div>
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full capitalize", a.status === 'cancelled' ? 'bg-red-50 text-red-600' : a.status === 'confirmed' ? 'bg-green-50 text-green-700' : 'bg-[rgba(8,145,178,0.07)] text-[var(--color-primary)]')}>{a.status}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Past visits */}
        {visits.length > 0 && (
          <Section title="Past visits">
            <div className="space-y-2">
              {visits.map(v => (
                <div key={v.id} className="rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center justify-between"><p className="text-[13px] font-bold text-slate-900">{v.diagnosis}</p><span className="text-[11px] text-slate-400">{new Date(v.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
                  <p className="text-[11.5px] text-slate-500 mt-0.5">{v.doctor} · {v.prescriptions.length} medicine{v.prescriptions.length !== 1 ? 's' : ''}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Family tracking */}
        <Section title="Family tracking">
          {p.familyAccessToken ? (
            <p className="text-[12.5px] text-green-700 flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Family link active{p.dishaConsentGiven ? ' · DISHA consent given' : ''}</p>
          ) : <p className="text-[12.5px] text-slate-400">No family tracking link issued</p>}
        </Section>

        {/* Cross-department journey timeline */}
        <Section title="Patient journey">
          <PatientJourneyTimeline patientId={p.id} patientName={p.name} variant="compact" />
          <a href={`/journey/${p.id}`} target="_blank" rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[var(--color-primary)] hover:underline">
            Open full journey →
          </a>
        </Section>
      </div>

      {/* Sticky actions */}
      <div className="sticky bottom-0 bg-white border-t border-slate-100 p-4 flex gap-2">
        <button onClick={onAnnounce} className="flex-1 h-11 rounded-xl bg-slate-100 text-slate-700 font-bold text-[13.5px] flex items-center justify-center gap-2 hover:bg-slate-200 transition"><Volume2 className="h-4.5 w-4.5" /> Announce</button>
        {next && <button onClick={onAdvance} className="flex-1 h-11 rounded-xl bg-[var(--color-primary)] text-white font-bold text-[13.5px] flex items-center justify-center gap-2 hover:bg-[var(--color-primary-dark)] transition">{next.label} <ArrowRight className="h-4 w-4" /></button>}
      </div>
    </div>
  )
}

function Fact({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 flex items-center gap-2.5">
      <Icon className="h-4 w-4 text-slate-400 flex-shrink-0" />
      <div className="min-w-0"><p className="text-[10.5px] font-semibold text-slate-400">{label}</p><p className="text-[12.5px] font-bold text-slate-900 truncate">{value}</p></div>
    </div>
  )
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">{title}</p>
      {children}
    </div>
  )
}
