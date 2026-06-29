"use client"
import { useState } from 'react'
import { toast } from 'sonner'
import { CmoPageHeader } from '@/components/cmo/layout/CmoPageHeader'

export default function CmoSettingsPage() {
  const [settings, setSettings] = useState({
    language: 'both',
    o2AlertHours: 4,
    alertSound: false,
    emailAlerts: true,
    smsAlerts: true,
    pushAlerts: false,
    delegateName: 'Dr. Anita Sharma (Addl. CMO)',
    timezone: 'Asia/Kolkata',
  })

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <CmoPageHeader title="Settings · सेटिंग्स" />

      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        {/* Language */}
        <div className="px-5 py-4">
          <p className="text-[13px] font-semibold text-slate-900 mb-2">Language</p>
          <div className="flex gap-3">
            {[{v:'en', l:'English only'}, {v:'hi', l:'हिंदी only'}, {v:'both', l:'Both (EN + हिं)'}].map(opt => (
              <label key={opt.v} className="flex items-center gap-1.5 cursor-pointer text-[12px]">
                <input type="radio" name="lang" value={opt.v} checked={settings.language === opt.v}
                  onChange={() => setSettings(s => ({...s, language: opt.v}))} />
                {opt.l}
              </label>
            ))}
          </div>
        </div>

        {/* Notification preferences */}
        <div className="px-5 py-4 space-y-2">
          <p className="text-[13px] font-semibold text-slate-900 mb-2">Notification channels</p>
          {[
            { key: 'emailAlerts', label: 'Email alerts for critical events' },
            { key: 'smsAlerts', label: 'SMS for new critical alerts' },
            { key: 'pushAlerts', label: 'Browser push notifications' },
            { key: 'alertSound', label: 'Sound on new alert' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center justify-between cursor-pointer">
              <span className="text-[12px] text-slate-700">{label}</span>
              <input type="checkbox" checked={settings[key as keyof typeof settings] as boolean}
                onChange={() => setSettings(s => ({...s, [key]: !s[key as keyof typeof s]}))} className="rounded" />
            </label>
          ))}
        </div>

        {/* Alert thresholds */}
        <div className="px-5 py-4">
          <p className="text-[13px] font-semibold text-slate-900 mb-2">Alert thresholds</p>
          <label className="flex items-center gap-3 text-[12px] text-slate-700">
            O₂ alert when stock below
            <input type="number" min={1} max={24} value={settings.o2AlertHours}
              onChange={e => setSettings(s => ({...s, o2AlertHours: +e.target.value}))}
              className="w-16 border border-slate-300 rounded px-2 py-1 text-center focus:outline-none focus:ring-1 focus:ring-blue-400" />
            hours
          </label>
        </div>

        {/* Delegation */}
        <div className="px-5 py-4">
          <p className="text-[13px] font-semibold text-slate-900 mb-2">Delegation (when away)</p>
          <input value={settings.delegateName} onChange={e => setSettings(s => ({...s, delegateName: e.target.value}))}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-400" />
        </div>

        {/* Timezone */}
        <div className="px-5 py-4">
          <p className="text-[13px] font-semibold text-slate-900 mb-2">Time zone</p>
          <select value={settings.timezone} onChange={e => setSettings(s => ({...s, timezone: e.target.value}))}
            className="border border-slate-300 rounded-lg px-3 py-2 text-[12px] bg-white focus:outline-none">
            <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
          </select>
        </div>
      </div>

      <button onClick={() => toast.success('Settings saved')}
        className="w-full text-[13px] font-semibold py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors">
        Save settings
      </button>
    </div>
  )
}
