"use client"

import { Select } from "@/components/ui/Select"
import { useMemo, useState } from "react"
import { CheckCircle2, Circle, AlertCircle, Plus, Sparkles, Mic, Wand2, FileText, Trash2 } from "lucide-react"
import { NeonBadge } from "@/components/ui/neon-badge"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/EmptyState"
import { toast } from "sonner"
import { useNursingStore, type NurseTask, type NurseTaskCategory } from "@/store/useNursingStore"
import { useInpatientStore } from "@/store/useInpatientStore"
import { suggestTasks, structureNote, SAMPLE_DICTATION } from "@/lib/nursing"

const CATEGORY_COLOR: Record<NurseTaskCategory, string> = {
  Medication:    'text-danger bg-danger-bg border-danger/20',
  Vitals:        'text-success-strong bg-success-bg border-success/20',
  Assessment:    'text-primary bg-accent-soft border-primary/20',
  Hygiene:       'text-primary bg-accent-soft border-primary/20',
  Mobility:      'text-brand-amber-strong bg-warning-bg border-warning/25',
  Documentation: 'text-foreground-muted bg-surface-sunken border-border',
  Procedure:     'text-primary bg-accent-soft border-primary/20',
}

export default function NurseTasksPage() {
  const { tasks, toggleTask, removeTask, addTask, addAiTasks } = useNursingStore()
  const inpatients = useInpatientStore(s => s.inpatients)
  const addNursingNote = useInpatientStore(s => s.addNursingNote)
  const active = inpatients.filter(i => i.stage !== 'discharged')

  // Nursing-note composer state
  const [notePatient, setNotePatient] = useState<string>('')
  const [noteText, setNoteText] = useState('')

  const pending = tasks.filter(t => !t.done)
  const done = tasks.filter(t => t.done)
  const high = pending.filter(t => t.priority === 'High')
  const pct = tasks.length ? Math.round((done.length / tasks.length) * 100) : 0

  const buildAiTasks = () => {
    const d = new Date()
    const suggestions = suggestTasks(inpatients, d.getHours() * 60 + d.getMinutes())
    const added = addAiTasks(suggestions)
    if (added > 0) toast.success(`AI added ${added} task${added > 1 ? 's' : ''} to your shift list`)
    else toast('Shift list already up to date — no new AI tasks')
  }

  const addManual = () => {
    const p = active[0]
    addTask({ patientId: p?.patientId, patientName: p?.name ?? 'Ward', title: 'New nursing task', category: 'Documentation', priority: 'Medium', source: 'manual' })
    toast.success('Task added — edit inline as needed')
  }

  const selectedPatient = active.find(i => i.patientId === notePatient)
  const dictate = () => setNoteText(t => (t ? `${t} ${SAMPLE_DICTATION}` : SAMPLE_DICTATION))
  const structure = () => {
    if (!noteText.trim()) { toast('Dictate or type a note first'); return }
    setNoteText(structureNote(noteText, selectedPatient?.name ?? 'Patient'))
    toast.success('Note structured by AI')
  }
  const saveNote = () => {
    if (!notePatient) { toast('Select a patient'); return }
    if (!noteText.trim()) { toast('Note is empty'); return }
    addNursingNote(notePatient, noteText.trim(), 'Anjali Desai')
    toast.success(`Nursing note charted for ${selectedPatient?.name}`)
    setNoteText('')
  }

  const TaskRow = ({ t }: { t: NurseTask }) => (
    <div className={`flex items-center gap-4 p-4 rounded-xl shadow-xs transition-all ${t.done ? 'bg-surface-sunken opacity-70' : t.priority === 'High' ? 'bg-danger-bg/60' : t.priority === 'Medium' ? 'bg-warning-bg/60' : 'bg-surface u-row'}`}>
      <button onClick={() => toggleTask(t.id)} aria-label={t.done ? `Mark "${t.title}" pending` : `Mark "${t.title}" complete`}
        className={`flex-shrink-0 cursor-pointer transition-colors ${t.done ? 'text-success hover:text-foreground-placeholder' : 'text-foreground-placeholder hover:text-success'}`}>
        {t.done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`font-bold text-sm ${t.done ? 'text-foreground-lighter line-through' : 'text-foreground'}`}>{t.title}</p>
          {t.source === 'ai' && <span className="inline-flex items-center gap-1 text-[9px] font-bold text-primary bg-accent-soft border border-primary/20 px-1.5 py-0.5 rounded-full"><Sparkles className="h-2.5 w-2.5" /> AI</span>}
        </div>
        <p className="text-xs text-foreground-lighter mt-0.5">{t.patientName}</p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${CATEGORY_COLOR[t.category]}`}>{t.category}</span>
        {!t.done && <NeonBadge variant={t.priority === 'High' ? 'danger' : t.priority === 'Medium' ? 'warning' : 'success'} className="text-[10px]">{t.priority}</NeonBadge>}
        <button onClick={() => removeTask(t.id)} aria-label={`Remove "${t.title}"`} className="text-foreground-placeholder hover:text-danger transition-colors cursor-pointer"><Trash2 className="h-4 w-4" /></button>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="t-body text-foreground-lighter">{pending.length} remaining · {done.length} completed</p>
        <div className="flex items-center gap-2">
          {high.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-danger-bg">
              <AlertCircle className="h-4 w-4 text-danger" /><span className="text-sm font-bold text-danger-strong">{high.length} urgent</span>
            </div>
          )}
          <button onClick={buildAiTasks} className="u-press flex items-center gap-1.5 text-sm font-bold text-primary bg-accent-soft border border-primary/20 hover:bg-accent-soft/70 px-3 py-2 rounded-xl cursor-pointer transition-colors">
            <Sparkles className="h-4 w-4" /> AI: build shift tasks
          </button>
          <button onClick={addManual} className="u-press flex items-center gap-1.5 text-sm font-bold text-foreground-muted bg-surface border border-border hover:bg-surface-sunken px-3 py-2 rounded-xl cursor-pointer transition-colors">
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-foreground-muted">Shift Progress</p>
          <p className="text-sm font-bold text-primary">{pct}%</p>
        </div>
        <div className="h-2 bg-surface-sunken rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </Card>

      {/* Nursing note composer */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-4 w-4 text-success-strong" />
          <h2 className="text-sm font-bold text-foreground">Chart a nursing note</h2>
          <span className="ml-auto text-[11px] text-foreground-placeholder">posts to the patient&apos;s shared timeline</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={notePatient} onChange={e => setNotePatient(e.target.value)}
            className="h-10 px-3 rounded-xl border border-border text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-success/40 bg-surface-sunken sm:w-56">
            <option value="">Select patient…</option>
            {active.map(i => <option key={i.patientId} value={i.patientId}>{i.name} · {i.ward} {i.bed}</option>)}
          </Select>
          <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={3}
            placeholder="Type, or click Dictate to capture by voice, then Structure with AI…"
            className="flex-1 px-3 py-2 rounded-xl border border-border text-sm text-foreground placeholder:text-foreground-placeholder focus:outline-none focus:ring-2 focus:ring-success/40 bg-surface-sunken whitespace-pre-wrap" />
        </div>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <button onClick={dictate} className="u-press flex items-center gap-1.5 text-sm font-bold text-primary bg-accent-soft border border-primary/20 hover:bg-accent-soft/70 px-3 py-1.5 rounded-xl cursor-pointer transition-colors">
            <Mic className="h-4 w-4" /> Dictate
          </button>
          <button onClick={structure} className="u-press flex items-center gap-1.5 text-sm font-bold text-primary bg-accent-soft border border-primary/20 hover:bg-accent-soft/70 px-3 py-1.5 rounded-xl cursor-pointer transition-colors">
            <Wand2 className="h-4 w-4" /> Structure with AI
          </button>
          <button onClick={saveNote} className="u-press flex items-center gap-1.5 text-sm font-bold text-white bg-success hover:bg-success-strong px-4 py-1.5 rounded-xl shadow-xs cursor-pointer transition-colors ml-auto">
            <CheckCircle2 className="h-4 w-4" /> Save to chart
          </button>
        </div>
      </Card>

      {pending.length > 0 && (
        <div>
          <p className="t-overline tracking-widest text-foreground-placeholder mb-3">Pending</p>
          <div className="space-y-2">{pending.map(t => <TaskRow key={t.id} t={t} />)}</div>
        </div>
      )}
      {done.length > 0 && (
        <div>
          <p className="t-overline tracking-widest text-foreground-placeholder mb-3">Completed</p>
          <div className="space-y-2">{done.map(t => <TaskRow key={t.id} t={t} />)}</div>
        </div>
      )}
      {tasks.length === 0 && (
        <EmptyState
          icon={CheckCircle2}
          title="No tasks yet"
          description="Use “AI: build shift tasks” to generate your worklist from the ward."
          size="sm"
        />
      )}
    </div>
  )
}
