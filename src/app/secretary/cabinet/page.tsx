'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Sparkles, Send, FileText, CheckCircle, Lock, Edit3, RefreshCw,
  Clock, Languages, BarChart3, Minimize2, Maximize2, FileCheck,
  MessageSquare, BookOpen, Link2,
} from 'lucide-react'
import { useSecretaryCabinetStore }  from '@/store/useSecretaryCabinetStore'
import { useSecretaryAssemblyStore } from '@/store/useSecretaryAssemblyStore'
import type { CabinetNote, AssemblyQuestion } from '@/types/secretary'

// ── Streaming text animation ──────────────────────────────────────────────
function useStreamingText(fullText: string | null, enabled: boolean) {
  const [displayed, setDisplayed] = useState('')
  const [streaming, setStreaming] = useState(false)
  const iRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!fullText || !enabled) { setDisplayed(fullText || ''); return }
    setDisplayed('')
    setStreaming(true)
    let i = 0
    iRef.current = setInterval(() => {
      i += 6
      setDisplayed(fullText.slice(0, i))
      if (i >= fullText.length) {
        clearInterval(iRef.current!)
        setDisplayed(fullText)
        setStreaming(false)
      }
    }, 16)
    return () => { if (iRef.current) clearInterval(iRef.current) }
  }, [fullText, enabled])

  return { displayed, streaming }
}

// ── Cabinet notes tab ────────────────────────────────────────────────────
function CabinetNotesTab() {
  const store = useSecretaryCabinetStore()
  // Read currentDraft as a reactive value so the effect fires when it changes
  const currentDraft = useSecretaryCabinetStore(s => s.currentDraft)
  const [editableText, setEditableText] = useState('')
  const [streamTarget, setStreamTarget] = useState<string | null>(null)
  const [sendModal, setSendModal] = useState<CabinetNote | null>(null)
  const [sentChannel, setSentChannel] = useState('')

  const { displayed, streaming: isStreaming } = useStreamingText(streamTarget, true)

  useEffect(() => {
    store.loadNotes()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When generateDraft resolves and updates currentDraft in the store, kick off streaming
  useEffect(() => {
    if (currentDraft && !store.drafting) {
      setStreamTarget(currentDraft)
    }
  }, [currentDraft, store.drafting])

  useEffect(() => {
    if (displayed) setEditableText(displayed)
  }, [displayed])

  async function handleDraft() {
    if (!store.drafterPrompt.trim()) return
    setStreamTarget(null)
    setEditableText('')
    await store.generateDraft()
    // currentDraft update triggers the useEffect above → sets streamTarget
  }

  async function handleSave() {
    if (!editableText.trim()) return
    await store.saveDraft()
    store.loadNotes()
  }

  async function handleSign(id: string) {
    await store.signDraft(id)
    store.loadNotes()
  }

  async function handleSendToMinister(note: CabinetNote, channel: string) {
    await store.sendToMinister(note.id, channel)
    store.loadNotes()
    setSentChannel(channel)
    setTimeout(() => { setSendModal(null); setSentChannel('') }, 1500)
  }

  const statusColor: Record<CabinetNote['status'], string> = {
    draft: 'bg-amber-100 text-amber-700',
    signed: 'bg-blue-100 text-blue-700',
    sent: 'bg-emerald-100 text-emerald-700',
  }

  return (
    <div className="grid grid-cols-4 gap-0 h-[calc(100vh-220px)] min-h-[600px]">
      {/* Left: Recent notes */}
      <div className="col-span-1 border-r border-[var(--color-border)] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[var(--color-border)] px-4 py-3">
          <p className="text-xs font-semibold text-[var(--color-foreground-muted)] uppercase tracking-wide">Recent notes</p>
        </div>
        {store.notes.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-[var(--color-foreground-lighter)]">
            No notes yet. Draft your first note →
          </div>
        )}
        {store.notes.map(note => (
          <div key={note.id} className="px-4 py-3 border-b border-[var(--color-border)] hover:bg-[var(--color-surface-raised)] transition-colors cursor-pointer"
            onClick={() => { setEditableText(note.content); store.setDrafterPrompt(note.prompt) }}>
            <p className="text-xs font-medium text-[var(--color-foreground)] line-clamp-2">{note.prompt || 'Untitled'}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColor[note.status]}`}>{note.status}</span>
              <span className="text-[10px] text-[var(--color-foreground-lighter)]">{new Date(note.createdAt).toLocaleDateString('en-IN')}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Middle: Drafter */}
      <div className="col-span-2 flex flex-col border-r border-[var(--color-border)]">
        {/* Prompt area */}
        <div className="p-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-[var(--color-primary)]" />
            <span className="text-sm font-semibold text-[var(--color-foreground)]">Cabinet note drafter</span>
            <span className="text-[10px] text-[var(--color-foreground-lighter)] font-[Noto_Sans_Devanagari]">कैबिनेट नोट तैयारकर्ता</span>
          </div>
          <input
            value={store.drafterPrompt}
            onChange={e => store.setDrafterPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleDraft() }}
            placeholder="What's the note about? e.g. 'Sickle cell mission Q2 progress'"
            className="w-full border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] mb-3"
          />
          {/* Template chips */}
          <div className="flex flex-wrap gap-2 mb-3">
            {store.templates.map(t => (
              <button key={t.id} onClick={() => store.setDrafterPrompt(t.promptLabel)}
                className="text-xs px-3 py-1.5 bg-teal-50 text-[var(--color-primary)] border border-teal-200 rounded-full hover:bg-teal-100 transition-colors font-medium">
                {t.promptLabel}
              </button>
            ))}
          </div>
          <button
            onClick={handleDraft}
            disabled={!store.drafterPrompt.trim() || store.drafting}
            className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-primary)] text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {store.drafting ? (
              <><RefreshCw className="h-4 w-4 animate-spin" /> AI is drafting<span className="animate-pulse">...</span></>
            ) : (
              <><Sparkles className="h-4 w-4" /> Draft</>
            )}
          </button>
        </div>

        {/* Draft area */}
        <div className="flex-1 overflow-y-auto p-4">
          {!store.currentDraft && !editableText && !store.drafting && (
            <div className="h-full flex items-center justify-center text-center">
              <div className="text-[var(--color-foreground-lighter)]">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Type a prompt above and click Draft</p>
                <p className="text-xs mt-1">AI will generate a formatted cabinet note in Hindi + English</p>
              </div>
            </div>
          )}
          {(store.drafting) && (
            <div className="flex items-center gap-2 text-[var(--color-foreground-muted)] text-sm">
              <RefreshCw className="h-4 w-4 animate-spin text-[var(--color-primary)]" />
              AI is drafting your cabinet note<span className="animate-pulse">...</span>
            </div>
          )}
          {(displayed || editableText) && !store.drafting && (
            <div>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {[
                  { icon: Edit3, label: 'Make formal' },
                  { icon: Languages, label: 'Translate to Hindi' },
                  { icon: BarChart3, label: 'Add data' },
                  { icon: Minimize2, label: 'Shorten' },
                  { icon: Maximize2, label: 'Lengthen' },
                ].map(btn => (
                  <button key={btn.label}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-raised)] text-[var(--color-foreground-muted)] transition-colors">
                    <btn.icon className="h-3 w-3" /> {btn.label}
                  </button>
                ))}
              </div>
              <textarea
                value={editableText}
                onChange={e => setEditableText(e.target.value)}
                className="w-full border border-[var(--color-border)] rounded-xl p-4 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
                style={{ minHeight: '400px' }}
              />
              {isStreaming && <p className="text-xs text-[var(--color-primary)] mt-1 animate-pulse">Writing...</p>}
            </div>
          )}
        </div>

        {/* Bottom actions */}
        {editableText && !store.drafting && (
          <div className="p-4 border-t border-[var(--color-border)] flex gap-2 flex-wrap">
            <button onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 border border-[var(--color-border)] text-sm font-medium rounded-lg hover:bg-[var(--color-surface-raised)] transition-colors">
              <FileText className="h-4 w-4" /> Save draft
            </button>
            {store.notes[0] && store.notes[0].status === 'draft' && (
              <button onClick={() => handleSign(store.notes[0].id)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                <Lock className="h-4 w-4" /> Sign & lock
              </button>
            )}
            {store.notes[0] && store.notes[0].status === 'signed' && (
              <button onClick={() => setSendModal(store.notes[0])}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity">
                <Send className="h-4 w-4" /> Send to Minister
              </button>
            )}
            <button onClick={store.discardDraft}
              className="flex items-center gap-2 px-4 py-2 border border-rose-300 text-rose-700 text-sm font-medium rounded-lg hover:bg-rose-50 transition-colors ml-auto">
              Discard
            </button>
          </div>
        )}
      </div>

      {/* Right: Live data sidebar */}
      <div className="col-span-1 overflow-y-auto p-4 space-y-3">
        <p className="text-xs font-semibold text-[var(--color-foreground-muted)] uppercase tracking-wide">Live data</p>
        {[
          { label: 'Sickle Cell screened', value: '3.1L', sub: 'Q1+Q2 FY2024-25' },
          { label: 'Tribal districts active', value: '21', sub: 'All running mission' },
          { label: 'Patients on hydroxyurea', value: '980', sub: '+340 vs Q1' },
          { label: 'Dengue cases (today)', value: '72', sub: 'Bhopal+Indore+Gwalior' },
          { label: 'PM-JAY today', value: '₹4.2 Cr', sub: '1,247 claims' },
          { label: 'State alerts unread', value: '8', sub: 'Require action' },
        ].map(item => (
          <div key={item.label} className="bg-[var(--color-surface-raised)] rounded-xl p-3">
            <p className="text-xs text-[var(--color-foreground-muted)]">{item.label}</p>
            <p className="text-lg font-bold text-[var(--color-foreground)]">{item.value}</p>
            <p className="text-[10px] text-[var(--color-foreground-lighter)]">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* Send to Minister modal */}
      {sendModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSendModal(null)}>
          <div className="bg-white rounded-2xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-[var(--color-foreground)] mb-2">Send to Minister</h3>
            <p className="text-xs text-[var(--color-foreground-muted)] mb-4">Choose delivery channel:</p>
            {sentChannel ? (
              <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
                <CheckCircle className="h-5 w-5" /> Sent via {sentChannel}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {['WhatsApp', 'Email', 'Print', 'In-system'].map(ch => (
                  <button key={ch} onClick={() => handleSendToMinister(sendModal, ch)}
                    className="px-4 py-3 bg-[var(--color-primary)] text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity">
                    {ch}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Assembly Q&A tab ──────────────────────────────────────────────────────
function AssemblyTab() {
  const store = useSecretaryAssemblyStore()
  const [selected, setSelected] = useState<AssemblyQuestion | null>(null)
  const [drafting, setDrafting] = useState(false)
  const [draft, setDraft] = useState('')

  async function handleDraftAnswer(q: AssemblyQuestion) {
    setSelected(q)
    setDrafting(true)
    const text = await store.draftAnswer(q.id)
    setDrafting(false)
    setDraft(text)
  }

  async function handleLodge(q: AssemblyQuestion) {
    await store.saveDraftAnswer(q.id, draft)
    await store.lodgeAnswer(q.id)
    setSelected(null)
    setDraft('')
  }

  const starred = store.questions.filter(q => q.isStarred)
  const unstarred = store.questions.filter(q => !q.isStarred)

  return (
    <div className="grid grid-cols-2 gap-0 h-[calc(100vh-220px)]">
      {/* Left: Questions list */}
      <div className="border-r border-[var(--color-border)] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[var(--color-border)] px-4 py-3">
          <p className="text-xs font-semibold text-[var(--color-foreground-muted)] uppercase">
            Assembly session — {starred.length} starred · {unstarred.length} unstarred
          </p>
          <p className="text-[10px] text-[var(--color-foreground-lighter)] mt-0.5">विधानसभा प्रश्न · Due Friday 28 Jun</p>
        </div>
        {[...starred, ...unstarred].map(q => (
          <div key={q.id}
            className={`px-4 py-3 border-b border-[var(--color-border)] cursor-pointer transition-colors hover:bg-[var(--color-surface-raised)] ${selected?.id === q.id ? 'bg-teal-50 border-l-2 border-l-[var(--color-primary)]' : ''}`}
            onClick={() => setSelected(q)}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-[var(--color-foreground-muted)]">{q.questionNumber}</span>
              {q.isStarred && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 rounded-full font-bold">★ STARRED</span>}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                q.status === 'lodged' ? 'bg-emerald-100 text-emerald-700' : q.status === 'drafted' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
              }`}>{q.status}</span>
            </div>
            <p className="text-xs font-medium text-[var(--color-foreground)] line-clamp-2">{q.mlaName} · {q.constituency}</p>
            <p className="text-[10px] text-[var(--color-foreground-muted)] mt-0.5 line-clamp-2">{q.questionTextHi}</p>
          </div>
        ))}
      </div>

      {/* Right: Drafter */}
      <div className="flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-center text-[var(--color-foreground-lighter)]">
            <div>
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a question to draft an answer</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]">
              <p className="text-xs font-bold text-[var(--color-foreground-muted)]">{selected.questionNumber}</p>
              <p className="text-sm font-semibold text-[var(--color-foreground)] mt-0.5">{selected.mlaName} · {selected.constituency}</p>
              <p className="text-xs text-[var(--color-foreground-muted)] mt-2">{selected.questionTextEn}</p>
              <p className="text-xs text-[var(--color-foreground-lighter)] mt-1 font-[Noto_Sans_Devanagari]">{selected.questionTextHi}</p>
              <button onClick={() => handleDraftAnswer(selected)} disabled={drafting}
                className="mt-3 flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white text-xs font-medium rounded-lg hover:opacity-90 disabled:opacity-60">
                {drafting ? <><RefreshCw className="h-3 w-3 animate-spin" /> Drafting...</> : <><Sparkles className="h-3 w-3" /> Draft answer</>}
              </button>
            </div>
            {draft && (
              <>
                <div className="flex-1 overflow-y-auto p-4">
                  <textarea
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    className="w-full border border-[var(--color-border)] rounded-xl p-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none h-64"
                  />
                </div>
                <div className="p-4 border-t border-[var(--color-border)] flex gap-2">
                  <button onClick={() => handleLodge(selected)}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white text-sm font-medium rounded-lg hover:opacity-90">
                    <FileCheck className="h-4 w-4" /> Sign & lodge
                  </button>
                  <button className="px-4 py-2 border border-[var(--color-border)] text-sm rounded-lg hover:bg-[var(--color-surface-raised)]">
                    Forward to Minister
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Policy & MoU placeholders ─────────────────────────────────────────────
function PolicyTab() {
  const policies = [
    { title: 'Mandatory ABHA at OPD registration', status: 'Pending PS signature', version: 'v3', date: '2024-06-15' },
    { title: 'Standard Treatment Guidelines — NCD update', status: 'Under legal review', version: 'v2', date: '2024-06-10' },
    { title: 'Tribal health worker incentive circular', status: 'Draft', version: 'v1', date: '2024-06-08' },
    { title: 'Free drug procurement policy amendment', status: 'With Finance for concurrence', version: 'v4', date: '2024-05-28' },
  ]
  return (
    <div className="p-4 space-y-3">
      {policies.map(p => (
        <div key={p.title} className="bg-white border border-[var(--color-border)] rounded-xl p-4 flex items-center justify-between" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div>
            <p className="text-sm font-medium text-[var(--color-foreground)]">{p.title}</p>
            <p className="text-xs text-[var(--color-foreground-muted)] mt-0.5">{p.version} · {p.date}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--color-foreground-muted)]">{p.status}</span>
            <button className="px-3 py-1.5 text-xs bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-lg hover:bg-white transition-colors">Edit</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function MousTab() {
  const mous = [
    { partner: 'TCS', purpose: 'ABDM FHIR integration', signed: '2024-03-01', expires: '2026-02-28', status: 'Active' },
    { partner: 'NHSRC', purpose: 'Quality improvement technical support', signed: '2023-09-15', expires: '2025-09-14', status: 'Active' },
    { partner: 'AIIMS Bhopal', purpose: 'Super-specialty referral protocol', signed: '2024-01-20', expires: '2026-01-19', status: 'Active' },
    { partner: 'ICMR', purpose: 'Sickle cell research collaboration', signed: '2024-05-01', expires: '2027-04-30', status: 'Active' },
  ]
  return (
    <div className="p-4 space-y-3">
      {mous.map(m => (
        <div key={m.partner} className="bg-white border border-[var(--color-border)] rounded-xl p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-[var(--color-foreground)]">{m.partner}</p>
              <p className="text-xs text-[var(--color-foreground-muted)]">{m.purpose}</p>
            </div>
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{m.status}</span>
          </div>
          <div className="flex gap-4 mt-2 text-xs text-[var(--color-foreground-muted)]">
            <span>Signed: {m.signed}</span>
            <span>Expires: {m.expires}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────
type TabId = 'cabinet' | 'assembly' | 'policy' | 'mous'

export default function CabinetPage() {
  const [tab, setTab] = useState<TabId>('cabinet')

  const tabs: { id: TabId; label: string; hi: string }[] = [
    { id: 'cabinet',  label: 'Cabinet notes', hi: 'कैबिनेट नोट' },
    { id: 'assembly', label: 'Assembly Q&A',   hi: 'विधानसभा प्रश्न' },
    { id: 'policy',   label: 'Policy & circulars', hi: 'नीति एवं परिपत्र' },
    { id: 'mous',     label: 'MoUs & contracts',   hi: 'MoU एवं अनुबंध' },
  ]

  return (
    <div className="flex flex-col h-[calc(100vh-68px)] max-w-screen-2xl">
      {/* Header */}
      <div className="px-6 pt-5 pb-3 border-b border-[var(--color-border)] flex-shrink-0">
        <h1 className="text-xl font-bold text-[var(--color-foreground)]">Cabinet, Assembly & Policy</h1>
        <p className="text-sm text-[var(--color-foreground-muted)] mt-0.5">कैबिनेट, विधानसभा, नीति · AI-powered government document drafting</p>
        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mt-3 w-fit">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 rounded-lg text-sm transition-all ${
                tab === t.id ? 'bg-white text-[var(--color-primary)] font-semibold shadow' : 'font-medium text-slate-500 hover:text-slate-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'cabinet'  && <CabinetNotesTab />}
        {tab === 'assembly' && <AssemblyTab />}
        {tab === 'policy'   && <PolicyTab />}
        {tab === 'mous'     && <MousTab />}
      </div>
    </div>
  )
}
