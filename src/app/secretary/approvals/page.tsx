'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, FileText, ChevronRight, RefreshCw } from 'lucide-react'
import { useSecretaryApprovalsStore } from '@/store/useSecretaryApprovalsStore'
import type { StateApproval, StateApprovalType } from '@/types/secretary'

const TYPE_STYLES: Record<StateApprovalType, { label: string; badge: string }> = {
  tender:            { label: 'Tender',            badge: 'bg-cyan-100 text-cyan-700' },
  mou:               { label: 'MoU',                badge: 'bg-blue-100 text-blue-700' },
  'cross-transfer':  { label: 'Cross-transfer',     badge: 'bg-cyan-100 text-cyan-700' },
  'scheme-launch':   { label: 'Scheme launch',      badge: 'bg-teal-100 text-teal-700' },
  'policy-circular': { label: 'Policy circular',    badge: 'bg-cyan-100 text-cyan-700' },
}

const ALL_TYPES: StateApprovalType[] = ['tender', 'mou', 'cross-transfer', 'scheme-launch', 'policy-circular']

function ApprovalCard({ approval }: { approval: StateApproval }) {
  const { approve, reject } = useSecretaryApprovalsStore()
  const [expanded, setExpanded] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')
  const [acting, setActing] = useState(false)
  const ts = TYPE_STYLES[approval.type]

  async function handleApprove() {
    setActing(true)
    await approve(approval.id)
    setActing(false)
  }

  async function handleReject() {
    if (!note.trim()) return
    setActing(true)
    await reject(approval.id, note)
    setActing(false)
    setRejecting(false)
  }

  const isActioned = approval.status !== 'pending'

  return (
    <div className="bg-white border border-[var(--color-border)] rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ts.badge}`}>{ts.label}</span>
              {approval.amount ? (
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                  ₹{(approval.amount / 1e7).toFixed(1)} Cr
                </span>
              ) : null}
              <span className="text-[10px] text-[var(--color-foreground-lighter)]">{approval.ageHours}h pending</span>
            </div>
            <p className="text-sm font-bold text-[var(--color-foreground)]">{approval.title}</p>
            <p className="text-xs text-[var(--color-foreground-muted)] mt-0.5">{approval.subtitle}</p>
            <p className="text-xs text-[var(--color-foreground-lighter)] mt-0.5">Raised by: {approval.raisedBy}</p>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 hover:bg-[var(--color-surface-raised)] rounded-lg flex-shrink-0 transition-colors"
          >
            <ChevronRight className={`h-4 w-4 text-[var(--color-foreground-muted)] transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
          </button>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-[var(--color-border)] space-y-3">
            <div className="bg-[var(--color-surface-raised)] rounded-xl p-3">
              <p className="text-xs font-semibold text-[var(--color-foreground-muted)] mb-1">Justification</p>
              <p className="text-sm text-[var(--color-foreground)] leading-relaxed">{approval.justification}</p>
            </div>
            {approval.documents.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[var(--color-foreground-muted)] mb-2">Supporting documents</p>
                <div className="space-y-1.5">
                  {approval.documents.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-[var(--color-primary)] hover:underline cursor-pointer">
                      <FileText className="h-3 w-3 flex-shrink-0" />{d.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action area */}
        {isActioned ? (
          <div className={`mt-4 flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg ${
            approval.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
          }`}>
            {approval.status === 'approved' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {approval.status === 'approved' ? 'Approved' : 'Rejected'}
            {approval.actionNote && <span className="text-xs opacity-70 ml-1">— {approval.actionNote}</span>}
          </div>
        ) : (
          <div className="mt-4">
            {!rejecting ? (
              <div className="flex gap-2">
                <button
                  onClick={handleApprove}
                  disabled={acting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[var(--color-primary)] text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {acting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                  Approve
                </button>
                <button
                  onClick={() => setRejecting(true)}
                  className="flex items-center gap-1.5 px-4 py-2 border border-rose-300 text-rose-700 text-sm font-medium rounded-lg hover:bg-rose-50 transition-colors"
                >
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Rejection reason (required)"
                  className="w-full border border-rose-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleReject}
                    disabled={!note.trim() || acting}
                    className="px-4 py-2 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700 disabled:opacity-50 transition-colors"
                  >
                    Confirm rejection
                  </button>
                  <button
                    onClick={() => { setRejecting(false); setNote('') }}
                    className="px-4 py-2 border border-[var(--color-border)] text-sm rounded-lg hover:bg-[var(--color-surface-raised)]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function SecretaryApprovalsPage() {
  const { approvals } = useSecretaryApprovalsStore()
  const [typeFilter, setTypeFilter] = useState<StateApprovalType | 'all'>('all')

  const filtered = typeFilter === 'all' ? approvals : approvals.filter(a => a.type === typeFilter)
  const pending = filtered.filter(a => a.status === 'pending').length

  function countFor(t: StateApprovalType | 'all') {
    return t === 'all' ? approvals.length : approvals.filter(a => a.type === t).length
  }

  return (
    <div className="p-6 space-y-5 max-w-screen-xl">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Approvals</h1>
        <p className="text-sm text-[var(--color-foreground-muted)] mt-0.5">
          अनुमोदन · {pending} pending{typeFilter !== 'all' ? ` in ${TYPE_STYLES[typeFilter].label}` : ''} of {approvals.filter(a => a.status === 'pending').length} total
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit flex-wrap">
        {/* All tab */}
        <button
          onClick={() => setTypeFilter('all')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
            typeFilter === 'all'
              ? 'bg-white text-[var(--color-primary)] shadow'
              : 'text-slate-500 hover:text-slate-700 font-medium'
          }`}
        >
          All ({countFor('all')})
        </button>

        {/* Per-type tabs */}
        {ALL_TYPES.map(t => {
          const count = countFor(t)
          if (count === 0) return null
          return (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                typeFilter === t
                  ? 'bg-white text-[var(--color-primary)] shadow'
                  : 'text-slate-500 hover:text-slate-700 font-medium'
              }`}
            >
              {TYPE_STYLES[t].label} ({count})
            </button>
          )
        })}
      </div>

      {/* Items */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-[var(--color-foreground-muted)]">
            <p className="text-sm">No {typeFilter !== 'all' ? TYPE_STYLES[typeFilter].label.toLowerCase() : ''} approvals found</p>
          </div>
        ) : (
          filtered.map(a => <ApprovalCard key={a.id} approval={a} />)
        )}
      </div>
    </div>
  )
}
