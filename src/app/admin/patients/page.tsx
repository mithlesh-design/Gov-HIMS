"use client"

import { useState } from "react"
import { usePatientStore } from "@/store/usePatientStore"
import { Users, Search, Filter } from "lucide-react"
import { NeonBadge } from "@/components/ui/neon-badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { motion } from "framer-motion"

const TRIAGE_VARIANT: Record<string, 'danger' | 'warning' | 'muted' | 'success'> = {
  Critical: 'danger', High: 'warning', Medium: 'muted', Low: 'success',
}

const STATUS_VARIANT: Record<string, 'blue' | 'warning' | 'success' | 'muted' | 'teal'> = {
  waiting: 'muted', vitals: 'warning', consulting: 'blue',
  pharmacy: 'teal', billing: 'muted', done: 'success',
}

export default function AdminPatientsPage() {
  const { patients } = usePatientStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | string>('All')

  const filtered = patients.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      p.department.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'All' || p.queueStatus === statusFilter
    return matchSearch && matchStatus
  })

  const statuses = ['All', 'waiting', 'vitals', 'consulting', 'pharmacy', 'billing', 'done'] as const

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">All Patients</h1>
          <p className="text-sm text-[#64748B] mt-1">{patients.length} registered today · {filtered.length} shown</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[rgba(8,145,178,0.07)]/80">
          <Users className="h-4 w-4 text-[var(--color-primary)]" />
          <span className="text-sm font-bold text-[var(--color-primary)]">{patients.length} Total</span>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-amber-50/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800/60 mb-1">Active Queue</p>
          <p className="text-xl font-black text-[#0F172A]">
            {patients.filter(p => ['waiting', 'vitals', 'consulting'].includes(p.queueStatus)).length}
          </p>
        </div>
        <div className="rounded-xl bg-[rgba(8,145,178,0.07)]/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary-dark)]/60 mb-1">Pharmacy / Billing</p>
          <p className="text-xl font-black text-[#0F172A]">
            {patients.filter(p => ['pharmacy', 'billing'].includes(p.queueStatus)).length}
          </p>
        </div>
        <div className="rounded-xl bg-green-50/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-800/60 mb-1">Completed</p>
          <p className="text-xl font-black text-[#0F172A]">
            {patients.filter(p => p.queueStatus === 'done').length}
          </p>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search name, ID, department..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer capitalize whitespace-nowrap ${
                statusFilter === s ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {s === 'All' ? `All (${patients.length})` : `${s} (${patients.filter(p => p.queueStatus === s).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Users className="h-10 w-10 mb-3 opacity-40" />
          <p className="font-semibold">No patients match your search</p>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th scope="col" className="px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Token / ID</th>
                  <th scope="col" className="px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Patient</th>
                  <th scope="col" className="px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Department</th>
                  <th scope="col" className="px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Triage</th>
                  <th scope="col" className="px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider text-right">Wait</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p, i) => (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="bg-white hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <p className="font-bold text-[var(--color-primary)]">#{p.token}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{p.id}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-[#0F172A]">{p.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{p.age}y · {p.gender} · {p.bloodGroup}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-700">{p.department}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{p.doctor}</p>
                    </td>
                    <td className="px-5 py-4">
                      {p.triageLevel ? (
                        <NeonBadge variant={TRIAGE_VARIANT[p.triageLevel] ?? 'muted'}>{p.triageLevel}</NeonBadge>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <NeonBadge variant={STATUS_VARIANT[p.queueStatus] ?? 'muted'} dot={p.queueStatus !== 'done'} pulse={['waiting','consulting'].includes(p.queueStatus)}>
                        {p.queueStatus}
                      </NeonBadge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-sm font-bold text-slate-700">
                        {p.estimatedWait > 0 ? `${p.estimatedWait}m` : '—'}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">Reg: {p.registeredAt}</p>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
