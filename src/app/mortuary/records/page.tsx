"use client"

import { Select } from "@/components/ui/Select"
import { useState } from "react"
import { useMortuaryStore } from "@/store/useMortuaryStore"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"
import { ShieldAlert, FileText, Send, Printer, X } from "lucide-react"
import { toast } from "sonner"
import { notifyAndAudit, notifyAndAuditMany } from "@/lib/notifyAndAudit"
import { printableHtml } from "@/lib/fileIO"

function ReleaseModal({ recordId, onClose }: { recordId: string; onClose: () => void }) {
  const releaseBody = useMortuaryStore((s) => s.releaseBody)
  const rec = useMortuaryStore((s) => s.records.find((r) => r.id === recordId))
  const [releasedTo, setReleasedTo] = useState('')
  const [relation, setRelation] = useState('Spouse')

  if (!rec) return null
  const submit = () => {
    if (!releasedTo.trim()) return
    releaseBody(recordId, `${releasedTo} (${relation})`, 'Shyam Tiwari')
    notifyAndAudit({
      to: 'admin', type: 'system', priority: 'low',
      title: `Body released · ${rec.patientName}`,
      body: `${rec.patientName} released to ${releasedTo} (${relation}).${rec.deathCertificateNumber ? ' Cert ' + rec.deathCertificateNumber : ''}`,
      audit: { action: 'mortuary_body_released', resource: 'mortuary_record', resourceId: recordId, detail: `Released to ${releasedTo} (${relation})`, userName: 'Shyam Tiwari' },
    })
    toast.success(`${rec.patientName} released to ${releasedTo}`)
    onClose()
  }
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-900">Release body · {rec.patientName}</h2>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"><X className="h-4 w-4 text-slate-500" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Released to (full name) *</label>
            <input value={releasedTo} onChange={e => setReleasedTo(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Relation</label>
            <Select value={relation} onChange={e => setRelation(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
              {['Spouse', 'Parent', 'Child', 'Sibling', 'Other relative', 'Funeral home'].map(r => <option key={r}>{r}</option>)}
            </Select>
          </div>
          <p className="text-[11px] text-slate-500">Body release requires legal clearance and (if applicable) a signed death certificate.</p>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">Cancel</button>
          <button onClick={submit} disabled={!releasedTo.trim()} className="flex-1 h-10 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold cursor-pointer disabled:opacity-50">Release</button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function MortuaryRecords() {
  const { records, issueDeathCertificate, clearMLC } = useMortuaryStore()
  const [releasing, setReleasing] = useState<string | null>(null)

  function issueCert(id: string, name: string) {
    issueDeathCertificate(id, 'Shyam Tiwari')
    notifyAndAudit({
      to: 'admin', type: 'system', priority: 'low',
      title: `Death cert issued · ${name}`,
      body: `Death certificate generated for ${name}. Family may collect.`,
      audit: { action: 'mortuary_body_received', resource: 'mortuary_record', resourceId: id, detail: `Death certificate issued for ${name}`, userName: 'Shyam Tiwari' },
    })
    toast.success(`Death certificate issued for ${name}`)
  }
  function routeMLC(id: string, name: string, mlcNumber?: string) {
    notifyAndAuditMany(['admin', 'audit_officer'], {
      type: 'system', priority: 'high',
      title: `MLC routed to police · ${name}`,
      body: `Police station notified for MLC ${mlcNumber ?? ''} (${name}). Awaiting clearance + autopsy.`,
      audit: { action: 'mortuary_mlc_cleared', resource: 'mortuary_record', resourceId: id, detail: `MLC ${mlcNumber} routed to police for clearance`, userName: 'Shyam Tiwari' },
    })
    toast.success(`MLC routed to police · admin + audit officer notified`)
  }
  function markCleared(id: string, name: string) {
    clearMLC(id, 'Shyam Tiwari', true)
    notifyAndAudit({
      to: 'admin', type: 'system', priority: 'low',
      title: `MLC cleared · ${name}`,
      body: `${name} legally cleared. Body may be released.`,
      audit: { action: 'mortuary_mlc_cleared', resource: 'mortuary_record', resourceId: id, detail: `${name} marked cleared post-autopsy`, userName: 'Shyam Tiwari' },
    })
    toast.success(`${name} marked cleared`)
  }
  function printCert(certNumber?: string, record?: { patientName?: string; age?: number; gender?: string; causeOfDeath?: string; certifiedBy?: string; timeOfDeath?: string }) {
    if (!certNumber) return
    const r = record ?? {}
    const timeStr = r.timeOfDeath ? new Date(r.timeOfDeath).toLocaleString('en-IN') : '—'
    printableHtml(`Death Certificate · ${certNumber}`, `
      <div class="info-row">
        <div class="info-item"><span class="info-label">Certificate No.</span><span class="info-value">${certNumber}</span></div>
        ${r.patientName ? `<div class="info-item"><span class="info-label">Deceased</span><span class="info-value">${r.patientName}</span></div>` : ''}
        ${r.age !== undefined ? `<div class="info-item"><span class="info-label">Age / Gender</span><span class="info-value">${r.age}Y / ${r.gender ?? '—'}</span></div>` : ''}
        <div class="info-item"><span class="info-label">Time of Death</span><span class="info-value">${timeStr}</span></div>
        ${r.certifiedBy ? `<div class="info-item"><span class="info-label">Certified by</span><span class="info-value">${r.certifiedBy}</span></div>` : ''}
      </div>
      <h3>Cause of Death</h3>
      <p>${r.causeOfDeath ?? 'As recorded in medical record'}</p>
      <p class="muted" style="margin-top:20px">This is a system-generated demo certificate. Official legal certificate must be obtained from the Civil Registration System (CRS).</p>
    `)
  }

  return (
    <div className="space-y-6 pt-6">
      <h2 className="text-2xl font-bold text-slate-900">Deceased Records</h2>
      <div className="space-y-3">
        {records.map((r) => (
          <div key={r.id} className={`bg-white rounded-xl border p-4 ${r.isMLC ? 'border-red-200' : 'border-slate-200'}`}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-3">
              <div><p className="text-xs text-slate-400">Name</p><p className="font-bold text-slate-900">{r.patientName}</p></div>
              <div><p className="text-xs text-slate-400">Age/Gender</p><p className="font-semibold">{r.age}Y / {r.gender}</p></div>
              <div><p className="text-xs text-slate-400">Cause of Death</p><p className="font-semibold">{r.causeOfDeath}</p></div>
              <div><p className="text-xs text-slate-400">Legal Status</p><Badge variant={r.legalClearance === 'cleared' ? 'success' : r.legalClearance === 'mlc' ? 'danger' : r.legalClearance === 'released' ? 'primary' : 'warning'}>{r.legalClearance.toUpperCase()}</Badge></div>
              <div><p className="text-xs text-slate-400">Time of Death</p><p className="font-semibold text-sm">{new Date(r.timeOfDeath).toLocaleString()}</p></div>
              <div><p className="text-xs text-slate-400">Certified by</p><p className="font-semibold">{r.certifiedBy}</p></div>
              <div><p className="text-xs text-slate-400">Slot</p><p className="font-semibold">{r.bodySlot}</p></div>
              {r.deathCertificateNumber ? <div><p className="text-xs text-slate-400">Death Cert.</p><p className="font-semibold text-xs">{r.deathCertificateNumber}</p></div> : <div></div>}
              {r.isMLC && <div><p className="text-xs text-slate-400">MLC #</p><p className="font-semibold text-xs">{r.mlcNumber}</p></div>}
              {r.policeStation && <div><p className="text-xs text-slate-400">Police station</p><p className="font-semibold text-xs">{r.policeStation}</p></div>}
              {r.releasedTo && <div><p className="text-xs text-slate-400">Released to</p><p className="font-semibold text-xs">{r.releasedTo}</p></div>}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap pt-3 border-t border-slate-100">
              {!r.deathCertificateNumber && (
                <button onClick={() => issueCert(r.id, r.patientName)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold bg-[#0E7490] hover:bg-[#155E75] text-white cursor-pointer">
                  <FileText className="h-3 w-3" /> Issue death cert
                </button>
              )}
              {r.deathCertificateNumber && (
                <button onClick={() => printCert(r.deathCertificateNumber, r)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer">
                  <Printer className="h-3 w-3" /> Print cert
                </button>
              )}
              {r.isMLC && r.legalClearance === 'mlc' && (
                <>
                  <button onClick={() => routeMLC(r.id, r.patientName, r.mlcNumber)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer">
                    <ShieldAlert className="h-3 w-3" /> Route to police
                  </button>
                  <button onClick={() => markCleared(r.id, r.patientName)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer">
                    Mark cleared
                  </button>
                </>
              )}
              {r.legalClearance === 'cleared' && !r.releasedTo && (
                <button onClick={() => setReleasing(r.id)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold bg-green-600 hover:bg-green-700 text-white cursor-pointer">
                  <Send className="h-3 w-3" /> Release body
                </button>
              )}
              {r.releasedTo && (
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                  Released to <span className="font-semibold text-slate-800">{r.releasedTo}</span> · {r.releasedAt ? new Date(r.releasedAt).toLocaleString() : ''}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      <AnimatePresence>
        {releasing && <ReleaseModal recordId={releasing} onClose={() => setReleasing(null)} />}
      </AnimatePresence>
    </div>
  )
}
