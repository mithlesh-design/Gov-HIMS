"use client"
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  title: string
  subtitle: string
  ageLabel: string
  status: 'pending' | 'approved' | 'rejected'
  onApprove?: () => void
  onReject?: (reason: string) => void
  onOpen?: () => void
}

export function ApprovalRow({ title, subtitle, ageLabel, status, onApprove, onReject, onOpen }: Props) {
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason]         = useState('')

  if (status !== 'pending') {
    return (
      <div className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl border text-[12px]',
        status === 'approved'
          ? 'bg-[var(--color-success-bg)] border-green-200'
          : 'bg-[var(--color-danger-bg)] border-red-200',
      )}>
        <span className={cn('font-bold text-[13px]', status === 'approved' ? 'text-green-600' : 'text-red-500')}>
          {status === 'approved' ? '✓' : '✗'}
        </span>
        <span className={cn('font-semibold capitalize', status === 'approved' ? 'text-green-900' : 'text-red-900')}>
          {status}
        </span>
        <span className="text-[var(--color-foreground-muted)] truncate flex-1">{title}</span>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-start gap-3 px-4 py-3.5">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[var(--color-foreground)] leading-snug">{title}</p>
          <p className="text-[11px] text-[var(--color-foreground-lighter)] mt-0.5">{subtitle} · {ageLabel}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {onOpen && (
            <button onClick={onOpen}
              className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-foreground-muted)] hover:border-[var(--color-border-hover)] hover:bg-slate-50 transition-all duration-150 whitespace-nowrap">
              View
            </button>
          )}
          {onApprove && (
            <button onClick={onApprove}
              className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-[var(--color-success)] text-white hover:bg-[var(--color-success-strong)] transition-colors whitespace-nowrap">
              स्वीकार
            </button>
          )}
          {onReject && (
            <button onClick={() => setShowReject(s => !s)}
              className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 bg-[var(--color-danger-bg)] hover:bg-red-100 transition-colors whitespace-nowrap">
              अस्वीकार
            </button>
          )}
        </div>
      </div>

      {showReject && (
        <div className="flex items-center gap-2 px-4 pb-3.5 pt-0" style={{ borderTop: '1px solid var(--color-border)' }}>
          <input
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Reason for rejection (required)"
            className="flex-1 text-[12px] border border-[var(--color-border)] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent placeholder:text-[var(--color-foreground-placeholder)]"
          />
          <button
            disabled={!reason.trim()}
            onClick={() => { onReject!(reason); setShowReject(false); setReason('') }}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-[var(--color-danger)] text-white disabled:opacity-40 hover:bg-[var(--color-danger-strong)] transition-colors whitespace-nowrap"
          >
            Confirm
          </button>
          <button onClick={() => setShowReject(false)} className="text-[11px] text-[var(--color-foreground-lighter)] hover:text-[var(--color-foreground-muted)]">
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
