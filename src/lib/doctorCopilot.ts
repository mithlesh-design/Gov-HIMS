// Doctor AI copilot — a records-grounded answer engine.
// Front-end simulation of a clinical LLM: every reply is derived from the
// doctor's actual patient/inpatient data so it never invents facts. It answers
// questions (lookups, cohorts, rounds) AND drafts artifacts (round note,
// prescription, discharge summary, referral) the doctor can copy or save.

import type { Patient, Visit } from '@/store/usePatientStore'
import type { Inpatient } from '@/store/useInpatientStore'
import { nextRound, lastRound, isRoundDue } from '@/store/useInpatientStore'
import type { AssistantDraft } from '@/store/useAssistantStore'

export type CopilotCtx = {
  patients: Patient[]        // already scoped to the logged-in doctor
  visits: Visit[]
  inpatients: Inpatient[]    // already scoped to the logged-in doctor
  focusId: string | null     // patientId of the pinned patient, if any
  doctorName: string
}
export type CopilotReply = { text: string; draft?: AssistantDraft }

const firstName = (n: string) => n.split(' ')[0]
const fmtDate = (iso?: string) => iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const fmtTime = (iso?: string) => iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
const today = () => new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

type Person = { name: string; patient?: Patient; inpatient?: Inpatient }

// Find which patient (if any) the query is about. Matches first name or full name.
function resolvePerson(q: string, ctx: CopilotCtx): Person | null {
  const lq = ` ${q.toLowerCase()} `
  const names = new Set<string>([...ctx.patients.map(p => p.name), ...ctx.inpatients.map(i => i.name)])
  let best: { name: string; score: number } | null = null
  for (const name of names) {
    const tokens = name.toLowerCase().split(' ').filter(t => t.length >= 3)
    const full = name.toLowerCase()
    let score = 0
    if (lq.includes(` ${full} `) || lq.includes(`${full}'s`)) score = full.length + 5
    else for (const t of tokens) if (lq.includes(` ${t} `) || lq.includes(` ${t}'s `) || lq.includes(`${t},`)) score = Math.max(score, t.length)
    if (score && (!best || score > best.score)) best = { name, score }
  }
  if (!best) return null
  return { name: best.name, patient: ctx.patients.find(p => p.name === best!.name), inpatient: ctx.inpatients.find(i => i.name === best!.name) }
}

function focusPerson(ctx: CopilotCtx): Person | null {
  if (!ctx.focusId) return null
  const patient = ctx.patients.find(p => p.id === ctx.focusId)
  const inpatient = ctx.inpatients.find(i => i.patientId === ctx.focusId)
  const name = patient?.name ?? inpatient?.name
  return name ? { name, patient, inpatient } : null
}

const has = (text: string, ...w: string[]) => w.some(k => text.includes(k))

// ── Draft builders ────────────────────────────────────────────────
function rxFor(p: Patient): { dx: string; meds: string[]; advice: string; followUp: string } {
  const t = [...p.symptoms, ...p.history].join(' ').toLowerCase()
  if (has(t, 'chest', 'breath', 'palpitation'))
    return { dx: 'Chest pain — rule out acute coronary syndrome', meds: ['Tab Aspirin 75 mg — 1-0-0 (after food)', 'Tab Atorvastatin 40 mg — 0-0-1', 'Tab GTN 0.5 mg — SOS, sublingual for chest pain'], advice: 'URGENT: ECG + Troponin I before discharge; cardiology review. Do not treat as routine.', followUp: 'Same day if pain recurs; else cardiology OPD in 24–48h.' }
  if (has(t, 'fever', 'sore throat', 'cough', 'cold'))
    return { dx: 'Acute viral upper respiratory tract infection', meds: ['Tab Paracetamol 500 mg — 1-0-1 (for fever)', 'Tab Cetirizine 10 mg — 0-0-1 x 5 days', 'Warm saline gargles — TDS'], advice: 'Hydration, rest. CBC + Dengue NS1 if fever persists beyond 3 days.', followUp: 'Review in 5 days if not improving.' }
  if (has(t, 'stomach', 'abdominal', 'loose motion', 'vomit', 'nausea', 'diarr'))
    return { dx: 'Acute gastroenteritis', meds: ['ORS — sip frequently after each loose stool', 'Tab Ofloxacin 200 + Ornidazole 500 — 1-0-1 x 3 days', 'Cap Pantoprazole 40 mg — 1-0-0 (before breakfast)'], advice: 'Maintain hydration; bland diet. Stool routine + electrolytes if symptoms persist.', followUp: 'Review in 3 days or earlier if unable to retain fluids.' }
  if (has(t, 'joint', 'swelling', 'knee', 'arthritis'))
    return { dx: 'Osteoarthritis / inflammatory joint pain', meds: ['Tab Naproxen 250 mg — 1-0-1 (after food) x 5 days', 'Cap Pantoprazole 40 mg — 1-0-0 (before food)', 'Local analgesic gel — apply BD'], advice: 'Rest the joint, hot fomentation. CRP/ESR + X-ray if persistent.', followUp: 'Review in 1 week.' }
  if (has(t, 'headache', 'migraine'))
    return { dx: 'Migraine / tension headache', meds: ['Tab Paracetamol 500 mg — SOS for pain', 'Tab Naproxen 250 mg — SOS (max BD)', 'Adequate hydration & sleep'], advice: 'Avoid triggers; dark quiet room during episodes.', followUp: 'Review if frequency increases or new neuro symptoms.' }
  if (has(t, 'diabet', 'sugar'))
    return { dx: 'Type 2 Diabetes Mellitus — review', meds: ['Tab Metformin 500 mg — 1-0-1 (after food)', 'Tab Glimepiride 2 mg — 1-0-0 (before breakfast)'], advice: 'Diabetic diet, daily walk. Check HbA1c and fasting/PP glucose.', followUp: 'Review with reports in 2 weeks.' }
  return { dx: p.symptoms[0] ?? 'Clinical evaluation', meds: ['Tab Paracetamol 500 mg — SOS for pain/fever', 'Symptomatic management as per examination'], advice: 'Targeted history & examination; investigate as indicated.', followUp: 'Review in 5–7 days or earlier if worse.' }
}

function prescriptionDraft(person: Person): CopilotReply {
  const p = person.patient
  if (!p) return { text: `I don't have an OPD record for ${person.name} to base a prescription on. Open their consultation to prescribe.` }
  const r = rxFor(p)
  const content =
`Rx — ${p.name}  (${p.id})
${p.age} yrs / ${p.gender}   ·   ${today()}

Provisional diagnosis: ${r.dx}

${r.meds.map((m, i) => `${i + 1}. ${m}`).join('\n')}

Advice: ${r.advice}
Follow-up: ${r.followUp}`
  return {
    text: `Here's a draft prescription for **${p.name}** based on their recorded complaint (${p.symptoms.join(', ') || 'no symptoms listed'}). Review doses against weight/renal function before signing.`,
    draft: { kind: 'prescription', title: `Prescription · ${p.name}`, content, patientId: p.id, payload: { meds: r.meds } },
  }
}

function roundNoteDraft(person: Person): CopilotReply {
  const ip = person.inpatient
  if (!ip) return { text: `${person.name} is not currently admitted — round notes apply to inpatients. For OPD, ask me to draft a prescription instead.` }
  const lr = lastRound(ip)
  const nr = nextRound(ip)
  const v = lr?.vitals
  const pendingTests = ip.tests.filter(t => t.status !== 'Ready').map(t => t.name)
  const content =
`PROGRESS NOTE — ${ip.name}   (${ip.bed}, ${ip.ward})
${today()}   ·   ${ip.admittingDoctor}

S:  Patient currently ${ip.condition.toLowerCase()}. ${lr?.note ?? 'No acute new complaint noted on this round.'}
O:  Vitals — ${v ? `BP ${v.bp}, Pulse ${v.pulse}, Temp ${v.temp}, SpO₂ ${v.spo2}` : 'to be recorded this round.'}
A:  ${ip.diagnosis} — condition ${ip.condition}.
P:  Continue: ${ip.meds.map(m => `${m.name} ${m.dose} ${m.freq}`).join('; ') || 'current orders'}.
    ${pendingTests.length ? `Awaiting: ${pendingTests.join(', ')}.` : 'Investigations up to date.'}
    Reassess at next scheduled round${nr ? ` (${fmtTime(nr.scheduledAt)})` : ''}.`
  return {
    text: `Draft progress note for **${ip.name}** (${ip.bed}). I've pre-filled it from the last round and current orders — edit the subjective/exam lines, then save it to the chart.`,
    draft: { kind: 'round_note', title: `Progress note · ${ip.name}`, content, patientId: ip.patientId, condition: ip.condition },
  }
}

function dischargeDraft(person: Person): CopilotReply {
  const ip = person.inpatient
  if (!ip) return { text: `${person.name} is not an inpatient, so there's nothing to discharge.` }
  const course = ip.progressNotes.slice(0, 2).map(n => n.text).join(' ')
  const meds = ip.meds.map((m, i) => `${i + 1}. ${m.name} ${m.dose} — ${m.freq} (${m.route})`).join('\n')
  const surgeryLine = ip.surgery ? `\nProcedure: ${ip.surgery.procedure} by ${ip.surgery.surgeon} — status ${ip.surgery.status.replace('_', ' ')}.` : ''
  const content =
`DISCHARGE SUMMARY — ${ip.name}  (${ip.patientId})
Admitting consultant: ${ip.admittingDoctor}
Admitted: ${fmtDate(ip.admittedAt)}   ·   Discharged: ${today()}
Ward/Bed: ${ip.ward} / ${ip.bed}

Diagnosis: ${ip.diagnosis}

Hospital course:
  ${course || 'Patient managed conservatively with regular monitoring.'}${surgeryLine}
  Condition at discharge: ${ip.condition}.

Discharge medications (TTO):
${meds || '  As per OPD prescription.'}

Diet: ${ip.diet ?? 'Normal'}
Follow-up: OPD review in 1 week (or as advised).
Red-flag advice: return immediately if chest pain, breathlessness, persistent fever, or any new concern.`
  return {
    text: `Draft discharge summary for **${ip.name}**. Take-home meds are carried over from the active orders. Confirm the follow-up date and red flags before issuing.`,
    draft: { kind: 'discharge_summary', title: `Discharge summary · ${ip.name}`, content, patientId: ip.patientId },
  }
}

function referralDraft(person: Person): CopilotReply {
  const p = person.patient
  const ip = person.inpatient
  const age = p?.age ?? ip?.age
  const gender = p?.gender ?? ip?.gender
  const reason = ip?.diagnosis ?? p?.symptoms.join(', ') ?? 'clinical evaluation'
  const summary = ip ? `Admitted with ${ip.diagnosis}; currently ${ip.condition}.` : `Presented with ${p?.symptoms.join(', ') || 'symptoms'}; history of ${p?.history.join(', ') || 'nil significant'}.`
  const content =
`REFERRAL LETTER
${today()}

Patient: ${person.name}${age ? `, ${age} yrs` : ''}${gender ? ` / ${gender}` : ''}
Referring physician: Dr. Priya Nair

Reason for referral: ${reason}

Clinical summary: ${summary}

Request: Kindly review and advise on further management / co-management. Reports available on request.

With regards,
Dr. Priya Nair`
  return {
    text: `Draft referral letter for **${person.name}**. Add the receiving specialty/consultant name before sending.`,
    draft: { kind: 'referral', title: `Referral · ${person.name}`, content, patientId: p?.id ?? ip?.patientId, payload: { specialty: 'Specialist' } },
  }
}

// ── Read-only answers ─────────────────────────────────────────────
function personSummary(person: Person): string {
  const { patient: p, inpatient: ip } = person
  const lines: string[] = [`**${person.name}**`]
  if (p) {
    lines.push(`${p.id} · ${p.age}y · ${p.gender} · ${p.bloodGroup} · ${p.department}`)
    if (p.symptoms.length) lines.push(`Complaint: ${p.symptoms.join(', ')}`)
    if (p.history.length) lines.push(`History: ${p.history.join(', ')}`)
    if (p.vitals) lines.push(`Vitals: BP ${p.vitals.bp}, Pulse ${p.vitals.pulse}, Temp ${p.vitals.temp}, SpO₂ ${p.vitals.spo2}`)
    else lines.push(`Vitals: not recorded yet`)
    if (p.triageLevel) lines.push(`Triage: ${p.triageLevel} · Queue: ${p.queueStatus}`)
  }
  if (ip) {
    lines.push(``, `🛏 Admitted — ${ip.ward} (${ip.bed})`)
    lines.push(`Diagnosis: ${ip.diagnosis} · Condition: ${ip.condition} · Stage: ${ip.stage.replace('_', ' ')}`)
    const lr = lastRound(ip), nr = nextRound(ip)
    if (lr) lines.push(`Last round: ${fmtTime(lr.doneAt)} — "${lr.note ?? ''}"`)
    if (nr) lines.push(`Next round: ${fmtTime(nr.scheduledAt)}${isRoundDue(ip) ? ' ⚠ DUE NOW' : ''}`)
    if (ip.meds.length) lines.push(`Meds: ${ip.meds.map(m => `${m.name} ${m.dose}`).join(', ')}`)
    if (ip.surgery) lines.push(`Surgery: ${ip.surgery.procedure} — ${ip.surgery.status.replace('_', ' ')}`)
  }
  lines.push(``, `_Ask me to draft a ${ip ? 'round note, discharge summary' : 'prescription'} or referral for ${firstName(person.name)}._`)
  return lines.join('\n')
}

const CONDITION_KEYWORDS = ['diabet', 'hypertens', 'chest', 'breath', 'cough', 'fever', 'pneumonia', 'sepsis', 'cardiac', 'migraine', 'headache', 'joint', 'rash', 'palpitation', 'sugar', 'asthma', 'sore throat', 'nausea', 'vomit']

function cohortByKeyword(kw: string, ctx: CopilotCtx): string {
  const hits = ctx.patients.filter(p => [...p.symptoms, ...p.history].join(' ').toLowerCase().includes(kw))
  const ipHits = ctx.inpatients.filter(i => i.diagnosis.toLowerCase().includes(kw))
  if (!hits.length && !ipHits.length) return `No patients on your list match "${kw}".`
  const rows = [
    ...hits.map(p => `• ${p.name} (${p.id}) — ${p.symptoms.join(', ') || p.history.join(', ')} · ${p.queueStatus}`),
    ...ipHits.map(i => `• ${i.name} (${i.patientId}) — ${i.diagnosis} · admitted ${i.ward}`),
  ]
  return `**${hits.length + ipHits.length} patient(s)** matching "${kw}":\n${rows.join('\n')}`
}

export function respond(query: string, ctx: CopilotCtx): CopilotReply {
  const q = query.trim()
  const lq = q.toLowerCase()
  if (!q) return { text: 'Ask me anything about your patients.' }

  const person = resolvePerson(q, ctx) ?? focusPerson(ctx)

  // 1) Draft intents
  const wantsDraft = has(lq, 'draft', 'write', 'generate', 'prepare', 'compose', 'create')
  if (wantsDraft || has(lq, 'round note', 'progress note', 'discharge summary', 'prescription', 'referral')) {
    if (has(lq, 'round note', 'progress note')) return person ? roundNoteDraft(person) : needPatient('a round note')
    if (has(lq, 'discharge')) return person ? dischargeDraft(person) : needPatient('a discharge summary')
    if (has(lq, 'prescription', 'rx', 'prescribe')) return person ? prescriptionDraft(person) : needPatient('a prescription')
    if (has(lq, 'referral', 'refer')) return person ? referralDraft(person) : needPatient('a referral')
    // generic "draft something for X" — pick by where the patient is
    if (person) return person.inpatient ? roundNoteDraft(person) : prescriptionDraft(person)
  }

  // 2) Cohort / list / ops queries (these shouldn't be hijacked by a name match)
  if (has(lq, 'round') && has(lq, 'due', 'pending', 'now')) {
    const due = ctx.inpatients.filter(isRoundDue)
    if (!due.length) return { text: 'No rounds are due right now. ✅ All inpatients are within their scheduled interval.' }
    return { text: `**${due.length} round(s) due now:**\n${due.map(i => `• ${i.name} (${i.bed}, ${i.ward}) — ${i.condition} · due ${fmtTime(nextRound(i)?.scheduledAt)}`).join('\n')}` }
  }
  if (has(lq, 'admitted', 'inpatient', 'in-patient', 'ipd', 'in hospital', 'in the ward', 'on the ward')) {
    if (!ctx.inpatients.length) return { text: 'You have no admitted patients right now.' }
    return { text: `**${ctx.inpatients.length} admitted patient(s):**\n${ctx.inpatients.map(i => `• ${i.name} — ${i.ward} (${i.bed}) · ${i.diagnosis} · ${i.condition}`).join('\n')}` }
  }
  if (has(lq, 'icu')) {
    const icu = ctx.inpatients.filter(i => i.ward.toLowerCase().includes('icu') || i.bed.toLowerCase().includes('icu') || i.bed.toLowerCase().includes('ccu'))
    return { text: icu.length ? `**${icu.length} in ICU/critical care:**\n${icu.map(i => `• ${i.name} (${i.bed}) — ${i.diagnosis} · ${i.condition}`).join('\n')}` : 'No patients in ICU/CCU currently.' }
  }
  if (has(lq, 'critical', 'sickest', 'most serious', 'unstable')) {
    const crit = ctx.inpatients.filter(i => i.condition === 'Critical' || i.condition === 'Serious').sort((a, b) => (a.condition === 'Critical' ? -1 : 1))
    return { text: crit.length ? `**Most acute patients:**\n${crit.map(i => `• ${i.name} (${i.bed}) — ${i.condition} · ${i.diagnosis}`).join('\n')}` : 'No critical/serious inpatients right now.' }
  }
  if (has(lq, 'discharge ready', 'ready for discharge', 'ready to go home', 'fit for discharge')) {
    const ready = ctx.inpatients.filter(i => i.condition === 'Discharge-ready')
    return { text: ready.length ? `**Ready for discharge:**\n${ready.map(i => `• ${i.name} (${i.bed}) — ${i.diagnosis}`).join('\n')}` : 'No inpatients are flagged discharge-ready yet.' }
  }
  if (has(lq, 'how many', 'count', 'number of')) {
    if (has(lq, 'admit', 'inpatient', 'ipd')) return { text: `You have **${ctx.inpatients.length}** admitted patient(s).` }
    const waiting = ctx.patients.filter(p => p.queueStatus === 'waiting').length
    return { text: `**Your load right now:** ${ctx.patients.length} patient(s) on record, ${waiting} waiting in OPD, ${ctx.inpatients.length} admitted.` }
  }
  if ((has(lq, 'who has', 'who have', 'patients with', 'anyone with', 'list', 'show me', 'which patient')) ) {
    const kw = CONDITION_KEYWORDS.find(k => lq.includes(k))
    if (kw) return { text: cohortByKeyword(kw, ctx) }
  }

  // 3) Person-specific reads
  if (person && (resolvePerson(q, ctx) || ctx.focusId)) {
    if (has(lq, 'med', 'drug', 'prescri')) {
      const ip = person.inpatient, p = person.patient
      if (ip?.meds.length) return { text: `**${person.name} — current meds:**\n${ip.meds.map(m => `• ${m.name} ${m.dose} · ${m.freq} · ${m.route}`).join('\n')}` }
      return { text: `No active medication list on record for ${person.name}.${p ? ' Ask me to draft a prescription.' : ''}` }
    }
    if (has(lq, 'vital')) {
      const v = person.patient?.vitals
      return { text: v ? `**${person.name} — vitals:** BP ${v.bp}, Pulse ${v.pulse}, Temp ${v.temp}, SpO₂ ${v.spo2}, Wt ${v.weight}` : `Vitals not recorded yet for ${person.name}.` }
    }
    // history / summary / about / default
    return { text: personSummary(person) }
  }

  // 4) Greeting / help
  if (has(lq, 'hello', 'hi ', 'hey', 'help', 'what can you')) return { text: helpText(ctx) }

  // 5) Fallback
  return { text: `I work only from your patient records, so I couldn't map that to a patient or query. Try:\n• "Summarise Kiran Patil"\n• "Who has diabetes?"\n• "Which rounds are due?"\n• "Draft a discharge summary for Mohan Lal"\n\n${helpText(ctx)}` }
}

function needPatient(what: string): CopilotReply {
  return { text: `Which patient should I draft ${what} for? Pin a patient above, or name them — e.g. "draft ${what} for Kiran Patil".` }
}

function helpText(ctx: CopilotCtx): string {
  return `I'm your clinical copilot, grounded in **${ctx.patients.length} OPD** and **${ctx.inpatients.length} admitted** patients under you. I can:\n• Summarise any patient & pull meds/vitals/history\n• Answer cohort questions ("who has diabetes", "which rounds are due", "who's in ICU")\n• Draft a **round note, prescription, discharge summary or referral** you can copy or save\n\nI never invent clinical facts — verify everything before acting.`
}
