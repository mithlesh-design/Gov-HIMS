"use client"

import { Select } from "@/components/ui/Select"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Calendar, Plus, X, Video, Building2, Clock, Stethoscope, RotateCcw,
  CheckCircle, Ban, ArrowRight, User,
} from "lucide-react"
import { usePatientStore, type Appointment } from "@/store/usePatientStore"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const DOCTORS = [
  { name: 'Dr. Priya Nair', specialty: 'General Medicine' },
  { name: 'Dr. Rohan Mehta', specialty: 'Cardiology' },
  { name: 'Dr. Ananya Iyer', specialty: 'Dermatology' },
  { name: 'Dr. Vikram Rao', specialty: 'ENT' },
  { name: 'Dr. Meena Shah', specialty: 'Gynaecology' },
]
const SLOTS = ['09:30 AM', '11:00 AM', '12:30 PM', '02:15 PM', '04:00 PM', '06:30 PM']
const MODES = [['all', 'All'], ['online', 'Online'], ['in_person', 'In-person']] as const
const STATUS_TINT: Record<string, string> = {
  upcoming: 'bg-[rgba(8,145,178,0.07)] text-[var(--color-primary)]', confirmed: 'bg-green-50 text-green-700', cancelled: 'bg-red-50 text-red-600',
}
const todayISO = () => new Date().toISOString().slice(0, 10)
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })

type Draft = { patientName: string; doctorIdx: number; mode: 'online' | 'in_person'; date: string; time: string }

export default function ReceptionAppointments() {
  const { patients, appointments, bookAppointment, updateAppointment, cancelAppointment } = usePatientStore()
  const [modeFilter, setModeFilter] = useState<typeof MODES[number][0]>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'confirmed' | 'cancelled'>('all')
  const [showModal, setShowModal] = useState(false)
  const [rescheduleId, setRescheduleId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>({ patientName: '', doctorIdx: 0, mode: 'in_person', date: todayISO(), time: SLOTS[1] })

  const nameFor = (a: Appointment) => a.patientName ?? patients.find(p => p.id === a.patientId)?.name ?? a.patientId

  const rows = appointments
    .filter(a => (modeFilter === 'all' || (a.mode ?? 'in_person') === modeFilter) && (statusFilter === 'all' || a.status === statusFilter))
    .sort((a, b) => (a.status === 'cancelled' ? 1 : 0) - (b.status === 'cancelled' ? 1 : 0) || a.date.localeCompare(b.date))

  const counts = {
    today: appointments.filter(a => a.date === todayISO() && a.status !== 'cancelled').length,
    online: appointments.filter(a => a.mode === 'online' && a.status !== 'cancelled').length,
    upcoming: appointments.filter(a => a.status === 'upcoming').length,
  }

  const openNew = () => { setRescheduleId(null); setDraft({ patientName: '', doctorIdx: 0, mode: 'in_person', date: todayISO(), time: SLOTS[1] }); setShowModal(true) }
  const openReschedule = (a: Appointment) => {
    setRescheduleId(a.id)
    setDraft({
      patientName: nameFor(a),
      doctorIdx: Math.max(0, DOCTORS.findIndex(d => d.name === a.doctorName)),
      mode: a.mode ?? 'in_person',
      date: a.date, time: SLOTS.includes(a.time) ? a.time : SLOTS[1],
    })
    setShowModal(true)
  }

  const submit = () => {
    if (!draft.patientName.trim()) { toast.error('Enter a patient name'); return }
    const doc = DOCTORS[draft.doctorIdx]
    if (rescheduleId) {
      updateAppointment(rescheduleId, { patientName: draft.patientName.trim(), doctorName: doc.name, specialty: doc.specialty, mode: draft.mode, date: draft.date, time: draft.time })
      toast.success('Appointment rescheduled', { description: `${draft.patientName} · ${fmtDate(draft.date)} ${draft.time}` })
    } else {
      const match = patients.find(p => p.name.toLowerCase() === draft.patientName.trim().toLowerCase())
      const isToday = draft.date === todayISO()
      const isInPerson = draft.mode === 'in_person'
      bookAppointment({
        patientId: match?.id ?? `WALKIN-${Date.now()}`, patientName: draft.patientName.trim(),
        doctorName: doc.name, specialty: doc.specialty, mode: draft.mode, date: draft.date, time: draft.time, status: 'upcoming',
      })
      if (isToday && isInPerson) {
        toast.success('Appointment booked & added to OPD queue', {
          description: `${draft.patientName} · ${doc.name} · ${draft.time} — Reception & nursing notified`,
        })
      } else {
        toast.success('Appointment booked', { description: `${draft.patientName} · ${doc.name} · ${fmtDate(draft.date)} ${draft.time}` })
      }
    }
    setShowModal(false)
  }

  return (
    <div className="pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-[24px] font-bold text-slate-900 tracking-tight">Appointments</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">{counts.today} today · {counts.online} online · {counts.upcoming} awaiting confirmation</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 h-10 px-4 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-[13.5px] font-bold shadow-sm active:scale-[0.98] transition">
          <Plus className="h-4 w-4" /> Book appointment
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-1 p-1 rounded-xl bg-slate-100">
          {MODES.map(([key, label]) => (
            <button key={key} onClick={() => setModeFilter(key)}
              className={cn("flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12.5px] font-semibold transition", modeFilter === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
              {key === 'online' && <Video className="h-3.5 w-3.5" />}{key === 'in_person' && <Building2 className="h-3.5 w-3.5" />}{label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(['all', 'upcoming', 'confirmed', 'cancelled'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn("text-[11.5px] font-bold px-3 py-1.5 rounded-lg capitalize transition", statusFilter === s ? "bg-[var(--color-primary)] text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50")}>{s}</button>
          ))}
        </div>
      </div>

      {/* List */}
      {rows.length === 0 ? (
        <div className="rounded-2xl bg-white shadow-[0_1px_4px_rgba(15,23,42,0.06)] p-12 flex flex-col items-center text-center">
          <span className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3"><Calendar className="h-6 w-6 text-slate-400" /></span>
          <p className="text-[14px] font-semibold text-slate-700">No appointments here</p>
          <p className="text-[12.5px] text-slate-500 mt-0.5">Book one with the button above.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-3">
          {rows.map(a => {
            const online = a.mode === 'online'
            const isToday = a.date === todayISO()
            const cancelled = a.status === 'cancelled'
            return (
              <div key={a.id} className={cn("rounded-2xl bg-white shadow-[0_1px_4px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.04)] p-4", cancelled && "opacity-65")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className={cn("h-10 w-10 rounded-2xl flex items-center justify-center flex-shrink-0", online ? "bg-[rgba(8,145,178,0.07)] text-[var(--color-primary)]" : "bg-[rgba(8,145,178,0.07)] text-[var(--color-primary)]")}>
                      {online ? <Video className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[14.5px] font-bold text-slate-900 truncate">{nameFor(a)}</p>
                      <p className="text-[12.5px] text-slate-500 flex items-center gap-1 truncate"><Stethoscope className="h-3.5 w-3.5 text-slate-400" /> {a.doctorName} · {a.specialty}</p>
                      <p className="text-[12.5px] text-slate-600 mt-1 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-slate-400" /> {fmtDate(a.date)} <span className="text-slate-300">·</span> <Clock className="h-3.5 w-3.5 text-slate-400" /> {a.time}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", online ? "bg-[rgba(8,145,178,0.07)] text-[var(--color-primary)]" : "bg-[rgba(8,145,178,0.07)] text-[var(--color-primary)]")}>{online ? 'Online' : 'In-person'}</span>
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full capitalize", STATUS_TINT[a.status])}>{a.status}</span>
                  </div>
                </div>

                {!cancelled && (
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {online && isToday && (a.status === 'confirmed' || a.status === 'upcoming') && (
                      <button onClick={() => toast.success('Launching video room', { description: nameFor(a) })} className="text-[12px] font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"><Video className="h-3.5 w-3.5" /> Join</button>
                    )}
                    {a.status === 'upcoming' && (
                      <button onClick={() => { updateAppointment(a.id, { status: 'confirmed' }); toast.success('Appointment confirmed') }} className="text-[12px] font-bold text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"><CheckCircle className="h-3.5 w-3.5" /> Confirm</button>
                    )}
                    <button onClick={() => openReschedule(a)} className="text-[12px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"><RotateCcw className="h-3.5 w-3.5" /> Reschedule</button>
                    <button onClick={() => { cancelAppointment(a.id); toast('Appointment cancelled') }} className="text-[12px] font-bold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"><Ban className="h-3.5 w-3.5" /> Cancel</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Booking / reschedule modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[92vh] overflow-y-auto"
              onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-slate-900">{rescheduleId ? 'Reschedule appointment' : 'Book appointment'}</h2>
                <button onClick={() => setShowModal(false)} aria-label="Close" className="p-1.5 rounded-lg hover:bg-slate-100"><X className="h-4 w-4 text-slate-500" /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Patient name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input list="rc-patient-list" value={draft.patientName} onChange={e => setDraft(d => ({ ...d, patientName: e.target.value }))} placeholder="Search or type a name"
                      className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-100 focus:border-[rgba(8,145,178,0.30)]" />
                    <datalist id="rc-patient-list">{patients.map(p => <option key={p.id} value={p.name} />)}</datalist>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mode</label>
                  <div className="flex gap-2">
                    {([['in_person', 'In-person', Building2], ['online', 'Online', Video]] as const).map(([key, label, Icon]) => (
                      <button key={key} onClick={() => setDraft(d => ({ ...d, mode: key }))}
                        className={cn("flex-1 h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition", draft.mode === key ? "bg-[var(--color-primary)] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
                        <Icon className="h-4 w-4" /> {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Doctor</label>
                  <Select value={draft.doctorIdx} onChange={e => setDraft(d => ({ ...d, doctorIdx: parseInt(e.target.value) }))}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-100">
                    {DOCTORS.map((d, i) => <option key={d.name} value={i}>{d.name} · {d.specialty}</option>)}
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date</label>
                    <input type="date" value={draft.date} min={todayISO()} onChange={e => setDraft(d => ({ ...d, date: e.target.value }))}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-100" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Time</label>
                    <Select value={draft.time} onChange={e => setDraft(d => ({ ...d, time: e.target.value }))}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-100">
                      {SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowModal(false)} className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-700 font-bold text-[13.5px] hover:bg-slate-50 transition">Cancel</button>
                <button onClick={submit} className="flex-1 h-11 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-bold text-[13.5px] flex items-center justify-center gap-2 transition">
                  {rescheduleId ? 'Save changes' : 'Book'} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
