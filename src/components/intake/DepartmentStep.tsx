"use client"

import {
  Heart, Brain, Bone, Eye, Ear, Droplets, Stethoscope, Smile, Activity, CheckCircle2,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { NeonBadge } from "@/components/ui/neon-badge"
import {
  DEPARTMENTS, SYMPTOM_DEPARTMENT_MAP, DURATION_OPTIONS, triageScore, suggestDepartments,
  type IntakeForm,
} from "@/lib/intake/data"
import { cn } from "@/lib/utils"

const DEPT_META: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  'Cardiology':        { icon: Heart,        color: 'text-red-500',     bg: 'bg-red-50' },
  'Neurology':         { icon: Brain,        color: 'text-cyan-500',  bg: 'bg-cyan-50' },
  'Orthopedics':       { icon: Bone,         color: 'text-amber-600',   bg: 'bg-amber-50' },
  'Ophthalmology':     { icon: Eye,          color: 'text-blue-500',    bg: 'bg-blue-50' },
  'ENT':               { icon: Ear,          color: 'text-teal-500',    bg: 'bg-teal-50' },
  'Gastroenterology':  { icon: Droplets,     color: 'text-orange-500',  bg: 'bg-orange-50' },
  'Dermatology':       { icon: Smile,        color: 'text-pink-500',    bg: 'bg-pink-50' },
  'General Medicine':  { icon: Stethoscope,  color: 'text-[#0891B2]',   bg: 'bg-[rgba(8,145,178,0.07)]' },
}
const FALLBACK_META = { icon: Stethoscope, color: 'text-slate-500', bg: 'bg-slate-50' }

function durationLabel(val: string): string {
  return DURATION_OPTIONS.find(o => o.value === val)?.label ?? val
}

function reasonText(dept: string, symptoms: string[], durations: Record<string, string>): string {
  const matched = symptoms.filter(s => SYMPTOM_DEPARTMENT_MAP[s] === dept)
  if (!matched.length) return 'General assessment recommended'
  return matched
    .map(s => durations[s] ? `${s} · ${durationLabel(durations[s])}` : s)
    .join(', ')
}

interface Props {
  form: IntakeForm
  update: (patch: Partial<IntakeForm>) => void
}

export function DepartmentStep({ form, update }: Props) {
  const triage = triageScore(form.symptoms, form.symptomDurations)

  // AI-suggested departments (source of truth from symptoms)
  const aiSuggested = suggestDepartments(form.symptoms)
  // User's current selection
  const selected = form.departments

  const toggle = (dept: string) => {
    const next = selected.includes(dept)
      ? selected.filter(d => d !== dept)
      : [...selected, dept]
    update({ departments: next })
  }

  // Departments not in the AI suggested list — available to manually add
  const extras = DEPARTMENTS.filter(d => !aiSuggested.includes(d))
  // Any extra departments the user manually added
  const manuallyAdded = selected.filter(d => !aiSuggested.includes(d))

  return (
    <div className="h-full flex flex-col overflow-y-auto pr-1 gap-3">

      {/* AI summary header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 rounded-[16px] bg-white border border-[rgba(8,145,178,0.15)] shadow-[0_2px_12px_rgba(5,150,105,0.10)]">
        <span className="flex items-center gap-2.5">
          <span className="h-9 w-9 rounded-full bg-[rgba(8,145,178,0.07)] flex items-center justify-center border border-[rgba(8,145,178,0.12)]">
            <Activity className="h-4 w-4 text-[#0891B2]" aria-hidden="true" />
          </span>
          <span>
            <p className="text-[13px] font-bold text-slate-900 leading-tight">AI Triage</p>
            <p className="text-[11px] text-slate-400 leading-tight">Based on symptoms &amp; duration</p>
          </span>
        </span>
        <NeonBadge variant={triage.variant} dot pulse className="px-3 py-1">{triage.level}</NeonBadge>
      </div>

      {/* AI-recommended department cards */}
      <div className="flex flex-col gap-2">
        <p className="text-[11px] uppercase font-semibold text-slate-400 tracking-wide px-0.5">AI Recommended</p>
        {aiSuggested.map(dept => {
          const meta = DEPT_META[dept] ?? FALLBACK_META
          const Icon = meta.icon
          const isSelected = selected.includes(dept)
          const reason = reasonText(dept, form.symptoms, form.symptomDurations)
          return (
            <button
              key={dept}
              onClick={() => toggle(dept)}
              aria-pressed={isSelected}
              className={cn(
                "flex items-start gap-3 px-4 py-3 rounded-[16px] bg-white border-2 text-left w-full active:scale-[0.985] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]",
                isSelected
                  ? "border-[#0891B2] shadow-[0_2px_8px_rgba(8,145,178,0.12)]"
                  : "border-slate-200 opacity-60",
              )}
            >
              <span className={cn("h-9 w-9 rounded-full flex-shrink-0 flex items-center justify-center", meta.bg)}>
                <Icon className={cn("h-4 w-4", meta.color)} aria-hidden="true" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center justify-between gap-2">
                  <p className="text-[14px] font-semibold text-slate-900">{dept}</p>
                  {isSelected
                    ? <CheckCircle2 className="h-4 w-4 text-[#0891B2] flex-shrink-0" aria-hidden="true" />
                    : <span className="h-4 w-4 rounded-full border-2 border-slate-300 flex-shrink-0" aria-hidden="true" />
                  }
                </span>
                <p className="text-[12px] text-slate-500 mt-0.5 leading-snug">{reason}</p>
              </span>
            </button>
          )
        })}
      </div>

      {/* Extra departments the user can manually add */}
      {extras.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] uppercase font-semibold text-slate-400 tracking-wide px-0.5">Also available</p>
          <div className="flex flex-wrap gap-2">
            {extras.map(dept => {
              const meta = DEPT_META[dept] ?? FALLBACK_META
              const Icon = meta.icon
              const isAdded = manuallyAdded.includes(dept)
              return (
                <button
                  key={dept}
                  onClick={() => toggle(dept)}
                  aria-pressed={isAdded}
                  className={cn(
                    "flex items-center gap-1.5 h-9 px-3 rounded-[10px] text-[13px] font-medium border transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]",
                    isAdded
                      ? "bg-[rgba(8,145,178,0.07)] border-[#0891B2] text-[#0891B2]"
                      : "bg-white border-slate-200 text-slate-700 hover:border-[#0891B2]/40",
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5", meta.color)} aria-hidden="true" />
                  {dept}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <p className="text-[12px] text-slate-400 flex-shrink-0 pt-1">
        Tap a department to deselect it, or add one from &ldquo;Also available&rdquo; below.
      </p>
    </div>
  )
}
