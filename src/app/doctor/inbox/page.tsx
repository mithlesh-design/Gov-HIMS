"use client"

import { useState } from "react"
import {
  MessageSquare, Bell, CheckCircle, FlaskConical, ScanLine, ClipboardCheck, AlertTriangle,
} from "lucide-react"
import { useMessagingStore, unreadFor } from "@/store/useMessagingStore"
import { useNotificationStore } from "@/store/useNotificationStore"
import { useLabStore } from "@/store/useLabStore"
import { useLabOrdersStore } from "@/store/useLabOrdersStore"
import { useRadiologyStore } from "@/store/useRadiologyStore"
import { useInpatientStore } from "@/store/useInpatientStore"
import { useAuthStore } from "@/store/useAuthStore"
import { collectResults, type ResultItem } from "@/lib/resultsInbox"
import { StaffMessages } from "@/components/messaging/StaffMessages"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { ClientOnly } from "@/components/ClientOnly"

const TYPE_LABEL: Record<string, string> = {
  critical_value: 'Critical value', drug_interaction: 'Drug alert', lab_result: 'Lab result',
  allergy_alert: 'Allergy', referral: 'Referral', appointment: 'Appointment', system: 'Message',
}
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

export default function DoctorInbox() {
  const conversations = useMessagingStore(s => s.conversations)
  const { notifications, markRead: markNotifRead, markAllRead } = useNotificationStore()
  const labSamples = useLabStore(s => s.samples)
  const labOrders = useLabOrdersStore(s => s.orders)
  const acknowledgeResult = useLabStore(s => s.acknowledgeResult)
  const radScans = useRadiologyStore(s => s.scans)
  const acknowledgeScan = useRadiologyStore(s => s.acknowledgeScan)
  const inpatients = useInpatientStore(s => s.inpatients)
  const acknowledgeTest = useInpatientStore(s => s.acknowledgeTest)
  const doctorName = useAuthStore(s => s.currentUser?.name ?? 'Dr. Priya Nair')
  const doctorId = useAuthStore(s => s.currentUser?.id ?? 'DR-1012')

  const [tab, setTab] = useState<'messages' | 'results' | 'alerts'>('messages')

  const alerts = notifications.filter(n => n.targetRole === 'doctor')
  const unreadAlerts = alerts.filter(n => !n.read).length
  const unreadMsgs = conversations.filter(c => c.participants.includes(doctorId)).reduce((s, c) => s + unreadFor(c, doctorId), 0)
  const results = collectResults(doctorName, { labOrders, radScans, inpatients })
  // labSamples kept imported for back-compat with other consumers / future fallbacks
  void labSamples

  const ackResult = (r: ResultItem) => {
    if (r.ack.source === 'lab') acknowledgeResult(r.ack.id)
    else if (r.ack.source === 'radiology') acknowledgeScan(r.ack.id)
    else acknowledgeTest(r.ack.patientId, r.ack.testId)
    toast.success('Result signed off')
  }

  return (
    <div className="pb-2 h-full flex flex-col min-h-0">
      <div className="mb-4">
        <h1 className="text-[24px] font-bold text-slate-900 tracking-tight">Inbox</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">Message any colleague across the hospital · results to sign off · clinical alerts</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 w-fit mb-4">
        <button onClick={() => setTab('messages')} className={cn("flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition", tab === 'messages' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}>
          <MessageSquare className="h-3.5 w-3.5" /> Messages {unreadMsgs > 0 && <span className="text-[11px] font-bold px-1.5 rounded-full bg-[rgba(8,145,178,0.12)] text-[var(--color-primary)]">{unreadMsgs}</span>}
        </button>
        <button onClick={() => setTab('results')} className={cn("flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition", tab === 'results' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}>
          <ClipboardCheck className="h-3.5 w-3.5" /> Results {results.length > 0 && <span className="text-[11px] font-bold px-1.5 rounded-full bg-[rgba(8,145,178,0.12)] text-[var(--color-primary)]">{results.length}</span>}
        </button>
        <button onClick={() => setTab('alerts')} className={cn("flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition", tab === 'alerts' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}>
          <Bell className="h-3.5 w-3.5" /> Alerts {unreadAlerts > 0 && <span className="text-[11px] font-bold px-1.5 rounded-full bg-orange-100 text-orange-700">{unreadAlerts}</span>}
        </button>
      </div>

      <ClientOnly fallback={<div className="flex-1 flex items-center justify-center"><div className="h-7 w-7 rounded-full border-4 border-[rgba(8,145,178,0.20)] border-t-blue-600 animate-spin" role="status" aria-label="Loading inbox" /></div>}>
        {tab === 'messages' ? (
          <StaffMessages meId={doctorId} />
        ) : tab === 'results' ? (
          <ResultsTab results={results} onAck={ackResult} />
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
            {unreadAlerts > 0 && (
              <div className="flex justify-end">
                <button onClick={() => markAllRead('doctor')} className="text-[12.5px] font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary)]">Mark all read</button>
              </div>
            )}
            {alerts.map(n => (
              <div key={n.id} className={cn("p-4 rounded-xl border bg-white", n.priority === 'critical' ? "border-l-4 border-l-red-500" : n.priority === 'high' ? "border-l-4 border-l-orange-400" : "border-l-4 border-l-slate-200", !n.read && "ring-1 ring-blue-200 bg-[rgba(8,145,178,0.07)]/30")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Bell className={cn("h-5 w-5 mt-0.5 flex-shrink-0", n.priority === 'critical' ? "text-red-500" : n.priority === 'high' ? "text-orange-500" : "text-slate-400")} />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-900 text-sm">{n.title}</p>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-500">{TYPE_LABEL[n.type] ?? 'Alert'}</span>
                        {!n.read && <span className="h-2 w-2 rounded-full bg-[rgba(8,145,178,0.07)]0" />}
                      </div>
                      <p className="text-sm text-slate-600 mt-0.5">{n.body}</p>
                      <p className="text-xs text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString()}{n.patientName ? ` · ${n.patientName}` : ''}</p>
                    </div>
                  </div>
                  {!n.read && (
                    <button onClick={() => markNotifRead(n.id)} aria-label="Mark as read" className="text-slate-400 hover:text-slate-700 flex-shrink-0"><CheckCircle className="h-5 w-5" /></button>
                  )}
                </div>
              </div>
            ))}
            {alerts.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-400" />
                <p className="text-sm font-medium">No clinical alerts</p>
              </div>
            )}
          </div>
        )}
      </ClientOnly>
    </div>
  )
}

const RESULT_SRC = {
  lab: { label: 'Lab', icon: FlaskConical, tint: 'bg-[rgba(8,145,178,0.07)] text-[var(--color-primary)]' },
  radiology: { label: 'Radiology', icon: ScanLine, tint: 'bg-[rgba(8,145,178,0.07)] text-[var(--color-primary)]' },
  ipd: { label: 'Inpatient', icon: ClipboardCheck, tint: 'bg-rose-50 text-rose-700' },
}
function ResultsTab({ results, onAck }: { results: ResultItem[]; onAck: (r: ResultItem) => void }) {
  if (results.length === 0) return (
    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
      <CheckCircle className="h-8 w-8 mb-2 text-green-400" />
      <p className="text-sm font-medium">All results reviewed</p>
    </div>
  )
  return (
    <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
      <p className="text-[12px] text-slate-500">{results.length} result(s) awaiting your sign-off · lab, radiology & inpatient investigations</p>
      {results.map(r => {
        const s = RESULT_SRC[r.source]
        return (
          <div key={r.key} className={cn("p-4 rounded-xl bg-white flex items-start justify-between gap-3 border", r.critical ? "border-l-4 border-l-red-500 ring-1 ring-red-100" : "border-slate-200")}>
            <div className="flex items-start gap-3 min-w-0">
              <span className={cn("h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0", s.tint)}><s.icon className="h-4.5 w-4.5" /></span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-slate-900 text-[14px]">{r.label}</p>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{s.label}</span>
                  {r.critical && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 flex items-center gap-0.5"><AlertTriangle className="h-3 w-3" /> Critical</span>}
                </div>
                <p className="text-[13px] text-slate-600 mt-0.5">{r.value}</p>
                <p className="text-[11px] text-slate-400 mt-1">{r.patient}{r.at ? ` · ${timeOf(r.at)}` : ''}</p>
              </div>
            </div>
            <button onClick={() => onAck(r)} className="flex-shrink-0 h-9 px-3 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-[12px] font-bold flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" /> Sign off</button>
          </div>
        )
      })}
    </div>
  )
}
