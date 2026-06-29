'use client'

import { useState } from 'react'
import { Siren, AlertTriangle, CheckCircle, Radio, MapPin, Phone, X } from 'lucide-react'

const PROTOCOLS = [
  { id: 'ep1', name: 'Disease Outbreak Response', hi: 'बीमारी प्रकोप प्रतिक्रिया', steps: ['Activate surveillance teams in all 52 districts', 'Notify NHM and MoHFW', 'Release stockpile from 4 district drug warehouses', 'Weekly PS video conference with all CMOs', 'Daily situation report to Minister'] },
  { id: 'ep2', name: 'Mass Casualty Incident', hi: 'सामूहिक हताहत', steps: ['Activate trauma network (8 designated hospitals)', 'Deploy 10 DMAT teams', 'Coordinate blood bank state reserve', 'Media blackout until situation controlled', 'PM-JAY claim fast-track activation'] },
  { id: 'ep3', name: 'Natural Disaster Health Response', hi: 'प्राकृतिक आपदा', steps: ['Mobile medical unit deployment to affected district', 'Water purification tablets distribution', 'Epidemic prevention: Hepatitis A/E, Cholera kits', 'Temporary hospital setup coordination with army', 'Toll-free helpline 104 boost capacity'] },
]

const CONTACTS = [
  { name: 'MoHFW Emergency Cell', phone: '011-23061703', type: 'GOI' },
  { name: 'NCDC Surveillance', phone: '011-23921401', type: 'GOI' },
  { name: 'State Control Room', phone: '0755-2441666', type: 'State' },
  { name: 'AIIMS Bhopal', phone: '0755-4293101', type: 'Hospital' },
  { name: 'GMCH Indore', phone: '0731-2535900', type: 'Hospital' },
  { name: 'GRMC Gwalior', phone: '0751-2323812', type: 'Hospital' },
]

export default function EmergencyPage() {
  const [activated, setActivated] = useState(false)
  const [selectedProtocol, setSelectedProtocol] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const proto = PROTOCOLS.find(p => p.id === selectedProtocol)

  return (
    <div className="p-6 space-y-5 max-w-screen-xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">State Emergency Activation</h1>
          <p className="text-sm text-[var(--color-foreground-muted)] mt-0.5">आपातकालीन सक्रियण · Statewide health emergency coordination</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border-2 ${activated ? 'bg-rose-50 text-rose-700 border-rose-400 animate-pulse' : 'bg-slate-50 text-slate-500 border-slate-300'}`}>
          <Siren className="h-4 w-4" /> {activated ? 'EMERGENCY ACTIVE' : 'Normal operations'}
        </div>
      </div>

      {/* Activation banner */}
      {activated && (
        <div className="bg-rose-600 text-white rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <Siren className="h-6 w-6 animate-bounce" />
            <div>
              <p className="text-lg font-black">STATE HEALTH EMERGENCY ACTIVE</p>
              <p className="text-sm opacity-80">Activated by PS Health — {new Date().toLocaleString('en-IN')}</p>
            </div>
          </div>
          <div className="flex gap-3 mt-2">
            <button onClick={() => setActivated(false)} className="px-4 py-2 bg-white text-rose-700 text-sm font-bold rounded-lg hover:bg-rose-50">
              Deactivate
            </button>
            <button className="px-4 py-2 bg-rose-800 text-white text-sm font-medium rounded-lg hover:bg-rose-900">
              Notify all CMOs
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Protocols */}
        <div>
          <h2 className="text-base font-bold text-[var(--color-foreground)] mb-3">Emergency Protocols</h2>
          <div className="space-y-3">
            {PROTOCOLS.map(p => (
              <div key={p.id} className={`bg-white border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md ${selectedProtocol === p.id ? 'border-[var(--color-primary)] shadow-md' : 'border-[var(--color-border)]'}`}
                onClick={() => setSelectedProtocol(selectedProtocol === p.id ? null : p.id)}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-[var(--color-foreground)]">{p.name}</p>
                    <p className="text-xs text-[var(--color-foreground-lighter)]" style={{ fontFamily: 'Noto Sans Devanagari' }}>{p.hi}</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); setSelectedProtocol(p.id); setConfirmOpen(true) }}
                    className="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700">
                    Activate
                  </button>
                </div>
                {selectedProtocol === p.id && (
                  <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                    <p className="text-xs font-semibold text-[var(--color-foreground-muted)] mb-2">Protocol steps:</p>
                    {p.steps.map((s, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-[var(--color-foreground)] mb-1.5">
                        <span className="flex-shrink-0 h-4 w-4 rounded-full bg-[var(--color-primary)] text-white text-[10px] flex items-center justify-center mt-0.5">{i + 1}</span>{s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Emergency contacts */}
        <div>
          <h2 className="text-base font-bold text-[var(--color-foreground)] mb-3">Emergency contacts</h2>
          <div className="space-y-2">
            {CONTACTS.map(c => (
              <div key={c.name} className="flex items-center justify-between bg-white border border-[var(--color-border)] rounded-xl px-4 py-3" style={{ boxShadow: 'var(--shadow-card)' }}>
                <div>
                  <p className="text-sm font-medium text-[var(--color-foreground)]">{c.name}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${c.type === 'GOI' ? 'bg-blue-100 text-blue-700' : c.type === 'State' ? 'bg-teal-100 text-teal-700' : 'bg-cyan-100 text-cyan-700'}`}>{c.type}</span>
                </div>
                <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-[var(--color-primary)] text-sm font-medium hover:underline">
                  <Phone className="h-4 w-4" />{c.phone}
                </a>
              </div>
            ))}
          </div>
          {!activated && (
            <button onClick={() => setConfirmOpen(true)}
              className="mt-4 w-full flex items-center justify-center gap-2 py-3 bg-rose-600 text-white text-sm font-bold rounded-xl hover:bg-rose-700 transition-colors">
              <Siren className="h-5 w-5" /> Declare State Health Emergency
            </button>
          )}
        </div>
      </div>

      {/* Confirm modal */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-rose-100 rounded-xl"><AlertTriangle className="h-5 w-5 text-rose-600" /></div>
              <h3 className="text-base font-bold text-[var(--color-foreground)]">Confirm activation</h3>
            </div>
            <p className="text-sm text-[var(--color-foreground-muted)] mb-4">
              {proto ? `Activate "${proto.name}" protocol?` : 'Declare State Health Emergency?'} This action will notify all district CMOs and the MoHFW.
            </p>
            <div className="flex gap-2">
              <button onClick={() => { setActivated(true); setConfirmOpen(false) }}
                className="flex-1 py-2.5 bg-rose-600 text-white text-sm font-bold rounded-xl hover:bg-rose-700">Confirm</button>
              <button onClick={() => setConfirmOpen(false)}
                className="flex-1 py-2.5 border border-[var(--color-border)] text-sm rounded-xl">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
