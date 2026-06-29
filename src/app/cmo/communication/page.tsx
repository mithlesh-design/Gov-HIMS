"use client"
import { useState } from 'react'
import { toast } from 'sonner'
import { CmoPageHeader } from '@/components/cmo/layout/CmoPageHeader'
import { cn } from '@/lib/utils'

const TABS = ['Broadcast', 'Video conference', 'Escalate to state']

export default function CmoCommunicationPage() {
  const [tab, setTab] = useState(0)
  const [broadcast, setBroadcast] = useState({ recipients: 'All BMOs', message: '' })
  const [escalation, setEscalation] = useState({ issue: '', recipient: 'PS Health', data: '' })

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <CmoPageHeader title="Communication · संचार" />
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={cn('text-[12px] font-semibold px-3 py-2.5 border-b-2 -mb-px transition-colors',
              tab === i ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800')}>
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <p className="text-[13px] font-bold text-slate-900">Broadcast message</p>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-slate-500 font-medium mb-1 block">Recipients</label>
              <select value={broadcast.recipients} onChange={e => setBroadcast(b => ({...b, recipients: e.target.value}))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[12px] bg-white focus:outline-none">
                {['All BMOs', 'All PHC MOs', 'All CHC In-charges', 'All Facility Staff', 'Custom list'].map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-500 font-medium mb-1 block">Message</label>
              <textarea value={broadcast.message} onChange={e => setBroadcast(b => ({...b, message: e.target.value}))}
                placeholder="Type your broadcast message..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-400 h-28" />
            </div>
            <button disabled={!broadcast.message.trim()}
              onClick={() => { setBroadcast(b => ({...b, message: ''})); toast.success(`Broadcast sent to ${broadcast.recipients} · delivery status tracking`) }}
              className="text-[12px] font-semibold px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40">
              Send broadcast
            </button>
          </div>
        </div>
      )}

      {tab === 1 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <button onClick={() => toast.success('Video conference started (demo — link: vc.mp.gov.in/cmo-bhopal)')}
            className="text-[13px] font-semibold px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 w-full">
            🎥 Start instant video conference
          </button>
          <div className="space-y-2">
            <p className="text-[12px] font-semibold text-slate-700">Scheduled conferences</p>
            {[
              { title: 'Weekly BMO review', time: 'Mon 10:00', participants: 12 },
              { title: 'State health mission update', time: 'Thu 15:00', participants: 28 },
            ].map((vc, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border border-slate-200 rounded-lg text-[12px]">
                <span className="font-semibold text-slate-900 flex-1">{vc.title}</span>
                <span className="text-slate-500">{vc.time}</span>
                <span className="text-slate-400">{vc.participants} participants</span>
                <button onClick={() => toast.success('Joining conference...')} className="text-[10px] font-semibold px-2 py-1 bg-blue-600 text-white rounded">Join</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 2 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <p className="text-[13px] font-bold text-slate-900">Escalate to state</p>
          <div className="space-y-3">
            <textarea value={escalation.issue} onChange={e => setEscalation(es => ({...es, issue: e.target.value}))}
              placeholder="What are you escalating? (Describe the issue and why it requires state intervention)"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-400 h-24" />
            <select value={escalation.recipient} onChange={e => setEscalation(es => ({...es, recipient: e.target.value}))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[12px] bg-white focus:outline-none">
              {['PS Health', 'Mission Director NHM', 'Director Health Services', 'State Surveillance Officer'].map(r => <option key={r}>{r}</option>)}
            </select>
            <button disabled={!escalation.issue.trim()}
              onClick={() => { setEscalation(es => ({...es, issue: ''})); toast.success(`Escalation sent to ${escalation.recipient} · tracking ID: ESC-2026-${Date.now().toString().slice(-4)}`) }}
              className="text-[12px] font-semibold px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40">
              Send escalation to {escalation.recipient}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
