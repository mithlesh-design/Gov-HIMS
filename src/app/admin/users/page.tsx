"use client"

import { Select } from "@/components/ui/Select"
import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  Users, UserPlus, Search, ShieldOff, AlertTriangle, BadgeCheck,
  Download, Filter, Building2, Briefcase, ChevronRight,
} from "lucide-react"
import { useHRStore, BRANCH_LABEL, type StaffMember } from "@/store/useHRStore"
import { useAuthStore } from "@/store/useAuthStore"
import { canDo } from "@/lib/permissions"
import { StaffProfileDrawer } from "@/components/admin/StaffProfileDrawer"
import { AddStaffWizard } from "@/components/admin/AddStaffWizard"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useDialogs } from "@/components/ui/ConfirmDialog"
import { useNotificationStore } from "@/store/useNotificationStore"
import { notifyAndAuditMany } from "@/lib/notifyAndAudit"

const STATUS_TINT: Record<StaffMember['status'], string> = {
  active:      'bg-emerald-100 text-emerald-700',
  on_leave:    'bg-amber-100 text-amber-700',
  suspended:   'bg-red-100 text-red-700',
  terminated:  'bg-slate-300 text-slate-700',
  inactive:    'bg-slate-100 text-slate-500',
}

const STATUS_LABEL: Record<StaffMember['status'], string> = {
  active:     'Active',
  on_leave:   'On leave',
  suspended:  'Suspended',
  terminated: 'Terminated',
  inactive:   'Inactive',
}

const ROLE_TINT: Record<string, string> = {
  doctor: 'bg-[rgba(8,145,178,0.07)] text-[var(--color-primary)]',
  nurse: 'bg-emerald-50 text-emerald-700',
  emergency: 'bg-red-50 text-red-700',
  ot: 'bg-[rgba(8,145,178,0.07)] text-[var(--color-primary)]',
  radiology: 'bg-[rgba(8,145,178,0.07)] text-[var(--color-primary)]',
  lab: 'bg-[rgba(8,145,178,0.07)] text-[var(--color-primary)]',
  pharmacy: 'bg-[rgba(8,145,178,0.07)] text-[var(--color-primary)]',
  admin: 'bg-[rgba(8,145,178,0.07)] text-[var(--color-primary)]',
  quality: 'bg-[rgba(8,145,178,0.07)] text-[var(--color-primary)]',
  audit_officer: 'bg-[rgba(8,145,178,0.07)] text-[var(--color-primary)]',
}

const fmtDate = (s?: string) => s ? new Date(s.includes('T') ? s : s + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

type StatusTab = 'all' | 'active' | 'on_leave' | 'inactive' | 'terminated'

export default function StaffManagementPage() {
  const currentUser = useAuthStore(s => s.currentUser)
  const staff = useHRStore(s => s.staff)

  const [tab, setTab] = useState<StatusTab>('active')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('All')
  const [deptFilter, setDeptFilter] = useState<string>('All')
  const [contractFilter, setContractFilter] = useState<string>('All')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [drawerId, setDrawerId] = useState<string | null>(null)
  const [showWizard, setShowWizard] = useState(false)
  const deactivateStaff = useHRStore(s => s.deactivateStaff)
  const addNotification = useNotificationStore(s => s.add)
  const { confirm, prompt, view: dialogView } = useDialogs()
  const actorName = currentUser?.name ?? 'Administrator'

  const canWrite = canDo(currentUser?.role, 'hr.staff.write')

  // ── Derived data ─────────────────────────────────────────────────────
  const tabCounts = useMemo(() => ({
    all:        staff.length,
    active:     staff.filter(s => s.status === 'active').length,
    on_leave:   staff.filter(s => s.status === 'on_leave').length,
    inactive:   staff.filter(s => s.status === 'inactive').length,
    terminated: staff.filter(s => s.status === 'terminated').length,
  }), [staff])

  const allRoles = useMemo(() => ['All', ...Array.from(new Set(staff.map(s => s.role))).sort()], [staff])
  const allDepts = useMemo(() => ['All', ...Array.from(new Set(staff.map(s => s.department))).sort()], [staff])
  const allContracts = ['All', 'permanent', 'visiting', 'locum', 'intern', 'contract']

  const filtered = useMemo(() => {
    return staff.filter(m => {
      if (tab !== 'all' && m.status !== tab) return false
      if (roleFilter !== 'All' && m.role !== roleFilter) return false
      if (deptFilter !== 'All' && m.department !== deptFilter) return false
      if (contractFilter !== 'All' && m.contractType !== contractFilter) return false
      if (search) {
        const s = search.toLowerCase()
        return m.name.toLowerCase().includes(s) ||
          m.id.toLowerCase().includes(s) ||
          m.employeeId.toLowerCase().includes(s) ||
          m.email.toLowerCase().includes(s) ||
          m.department.toLowerCase().includes(s) ||
          m.designation.toLowerCase().includes(s)
      }
      return true
    })
  }, [staff, tab, search, roleFilter, deptFilter, contractFilter])

  const today = new Date().toISOString().split('T')[0]!
  const credentialHealth = (member: StaffMember) => {
    if (member.credentials.length === 0) return { tint: 'text-slate-300', label: '—' }
    const expired = member.credentials.filter(c => !c.expiryDate.startsWith('2099') && c.expiryDate < today).length
    if (expired > 0) return { tint: 'text-red-600', label: `${expired} expired` }
    const soon = member.credentials.filter(c => !c.expiryDate.startsWith('2099') && (new Date(c.expiryDate).getTime() - new Date(today).getTime()) / 86400000 <= 90).length
    if (soon > 0) return { tint: 'text-amber-600', label: `${soon} due ≤90d` }
    return { tint: 'text-emerald-600', label: 'All valid' }
  }

  // ── Bulk actions ─────────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(m => m.id)))
  }

  const exportCSV = () => {
    const rows = filtered
    const header = ['Staff ID', 'Employee ID', 'Name', 'Role', 'Department', 'Designation', 'Status', 'Email', 'Phone', 'Joined', 'Contract', 'Branch', 'Credentials']
    const csv = [
      header.join(','),
      ...rows.map(m => [
        m.id, m.employeeId, `"${m.name}"`, m.role, `"${m.department}"`, `"${m.designation}"`,
        m.status, m.email, m.phone, m.joiningDate, m.contractType,
        BRANCH_LABEL[m.branchId], m.credentials.length,
      ].join(',')),
    ].join('\n')
    if (typeof window !== 'undefined') {
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `staff-directory-${today}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }
    toast.success(`Exported ${rows.length} staff records`)
  }

  return (
    <div className="space-y-5 p-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-[var(--color-primary)]" />Staff Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {staff.length} staff members · canonical directory · audited mutations · NABH HRM evidence
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer">
            <Download className="h-3.5 w-3.5" />Export CSV
          </button>
          {canWrite && (
            <button onClick={() => setShowWizard(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white cursor-pointer">
              <UserPlus className="h-3.5 w-3.5" />Add staff
            </button>
          )}
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100 w-fit overflow-x-auto">
        {(['active', 'on_leave', 'inactive', 'terminated', 'all'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            data-testid={`staff-tab-${t}`}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap',
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            {t === 'all' ? 'All' : STATUS_LABEL[t as StaffMember['status']]}
            <span className="ml-1 text-slate-400">{tabCounts[t]}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name / ID / email / department"
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-300" />
        </div>
        <FilterChip label="Role" icon={Briefcase} value={roleFilter} onChange={setRoleFilter} options={allRoles} />
        <FilterChip label="Dept" icon={Building2} value={deptFilter} onChange={setDeptFilter} options={allDepts} />
        <FilterChip label="Contract" icon={Filter} value={contractFilter} onChange={setContractFilter} options={allContracts} />
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[rgba(8,145,178,0.07)] border border-cyan-200">
          <span className="text-xs font-bold text-[var(--color-primary-dark)]">{selected.size} selected</span>
          <button onClick={async () => {
            const values = await prompt({
              title: `Send broadcast to ${selected.size} selected`,
              body: 'Pushed as an in-app notification to each recipient. Audited.',
              confirmLabel: 'Send broadcast',
              fields: [
                { id: 'title', label: 'Title', placeholder: 'e.g. Mandatory training Mon 09:00', required: true },
                { id: 'body',  label: 'Message', type: 'textarea', required: true },
              ],
            })
            if (!values) return
            const ids = Array.from(selected)
            for (const id of ids) {
              addNotification({
                type: 'system', priority: 'medium',
                title: values.title, body: values.body,
                targetUserId: id, channels: ['in_app'],
              })
            }
            toast.success(`Broadcast sent to ${ids.length} staff`)
            setSelected(new Set())
          }} className="text-xs font-bold text-[var(--color-primary)] hover:underline cursor-pointer">Send broadcast</button>
          <span className="text-slate-300">·</span>
          <button onClick={async () => {
            const values = await prompt({
              title: `Bulk deactivate ${selected.size} staff?`,
              body: 'Each member loses portal access. Audited per staff.',
              tone: 'danger',
              confirmLabel: 'Deactivate selected',
              fields: [
                { id: 'reason', label: 'Reason', type: 'textarea',
                  placeholder: 'e.g. Restructure / temporary suspension / end of contract',
                  required: true },
              ],
            })
            if (!values) return
            const ids = Array.from(selected)
            for (const id of ids) deactivateStaff(id, values.reason, actorName)
            notifyAndAuditMany(['admin', 'audit_officer'], {
              type: 'system', priority: 'high',
              title: `${ids.length} staff deactivated`,
              body: `${actorName} deactivated ${ids.length} staff member${ids.length !== 1 ? 's' : ''}. Reason: ${values.reason}.`,
              audit: { action: 'hr_staff_deactivated', resource: 'staff', resourceId: ids.join(','), detail: `Bulk deactivate ${ids.length} · reason: ${values.reason}`, userName: actorName },
            })
            toast.success(`${ids.length} staff deactivated`)
            setSelected(new Set())
          }} className="text-xs font-bold text-amber-700 hover:underline cursor-pointer">Bulk deactivate</button>
          <span className="text-slate-300">·</span>
          <button onClick={() => setSelected(new Set())}
            className="text-xs font-bold text-slate-500 hover:underline cursor-pointer ml-auto">Clear</button>
        </motion.div>
      )}

      {/* Staff table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 w-10">
                <input type="checkbox"
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onChange={toggleSelectAll}
                  className="cursor-pointer" />
              </th>
              {['Staff', 'Role', 'Department', 'Status', 'Credentials', 'Last login', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400 italic">
                No staff members match these filters.
              </td></tr>
            ) : filtered.map((m, i) => {
              const ch = credentialHealth(m)
              const initials = m.name.replace('Dr. ', '').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
              return (
                <motion.tr key={m.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.015 }}
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => setDrawerId(m.id)}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox"
                      checked={selected.has(m.id)}
                      onChange={() => toggleSelect(m.id)}
                      className="cursor-pointer" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-light)] text-white flex items-center justify-center text-[12px] font-bold flex-shrink-0">{initials}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{m.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{m.id} · {m.employeeId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded', ROLE_TINT[m.role] ?? 'bg-slate-50 text-slate-700')}>
                      {m.role.replace('_', ' ')}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">{m.designation}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700 text-xs">{m.department}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded', STATUS_TINT[m.status])}>
                      {STATUS_LABEL[m.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-[11px] font-bold flex items-center gap-1', ch.tint)}>
                      {m.credentials.length > 0 && <BadgeCheck className="h-3 w-3" />}
                      {ch.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">
                    {m.lastLoginAt ? new Date(m.lastLoginAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ChevronRight className="h-4 w-4 text-slate-300 inline-block" />
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-slate-400">
        Showing {filtered.length} of {staff.length} staff members · canonical source: <code>useHRStore</code> · every change audit-logged to NABH HRM chapter
      </p>

      {/* Profile drawer */}
      <StaffProfileDrawer staffId={drawerId} onClose={() => setDrawerId(null)} />

      {/* Add Staff wizard */}
      <AddStaffWizard open={showWizard} onClose={() => setShowWizard(false)} onCreated={(id) => setDrawerId(id)} />
      {dialogView}
    </div>
  )
}

// ─── Filter chip ────────────────────────────────────────────────────────
function FilterChip({ label, icon: Icon, value, onChange, options }: {
  label: string
  icon: React.ElementType
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-white border border-slate-200">
      <Icon className="h-3.5 w-3.5 text-slate-400" />
      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <Select value={value} onChange={(e) => onChange(e.target.value)}
        className="text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer">
        {options.map(o => <option key={o} value={o} className="font-normal">{o.toString().replace('_', ' ')}</option>)}
      </Select>
    </div>
  )
}
