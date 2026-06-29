import { NextRequest, NextResponse } from 'next/server'
import { openaiJSON, isOpenAiConfigured, type ChatMessage } from '@/lib/openai'
import type { IntakeForm, TriageLevel } from '@/lib/intake/data'

// One LLM-driven turn of the patient check-in conversation. The model acts as a
// warm receptionist: it understands ANY symptom in free natural language,
// extracts structured fields, asks the next needed question, and assesses
// clinical urgency itself. Returns { say, done, patch } the voice UI consumes.

type Lang = 'en' | 'hi'
const DURATIONS = ['today', '1-3d', '4-7d', '1w+', '1m+'] as const
const URGENCIES: TriageLevel[] = ['Low', 'Medium', 'High', 'Critical']

// Common Hindi words written in Latin letters — used to tell romanized Hindi
// ("mujhe bukhar hai") apart from English so we can pick the reply language
// deterministically instead of relying on the model's judgment.
const ROMAN_HINDI = /\b(mera|meri|mujhe|naam|hai|hain|hoon|hu|aap|kya|nahi|haan|han|theek|thik|bukhar|dard|khansi|pet|sir|saans|ji|namaste|kal|aaj|din|raha|rahi|kab|se|bahut|thoda|saal|umar|ladka|ladki|aadmi|aurat|purush|mahila|mard)\b/i

// Deterministically detect the language of the patient's latest utterance:
// Devanagari → Hindi; romanized-Hindi markers → Hindi; otherwise → English.
function detectLang(text: string, fallback: Lang): Lang {
  if (!text.trim()) return fallback
  if (/[ऀ-ॿ]/.test(text)) return 'hi'
  if (ROMAN_HINDI.test(text)) return 'hi'
  if (/[a-z]/i.test(text)) return 'en'
  return fallback
}

type Expecting = 'name' | 'age' | 'gender' | 'phone' | 'symptoms' | 'duration' | 'other'

interface LlmOut {
  say?: string
  done?: boolean
  lang?: string
  expecting?: string
  patch?: {
    name?: string
    age?: string | number
    gender?: string
    phone?: string
    symptoms?: string[]
    durationBucket?: string
    chiefComplaint?: string
    urgency?: string
  }
}

function systemPrompt(form: IntakeForm): string {
  return `You are "Asha", a warm, reassuring female hospital receptionist at Agentix HIMS doing a patient check-in by voice. You are speaking with the patient out loud.

Collect, ONE item at a time, in a natural conversation:
1. Full name
2. Age (in years)
3. Gender (Male, Female, or Other)
4. 10-digit mobile number
5. Their health concern — the chief complaint and symptoms, described freely in their OWN words
6. How long they have had the problem (duration)

LANGUAGE (HIGHEST PRIORITY — follow exactly):
- Your FIRST greeting (when there is no patient message yet) MUST be in Hindi (Devanagari). Hindi is the default.
- From then on, ALWAYS reply in the SAME language as the patient's MOST RECENT message — even if it differs from your greeting or from earlier turns. This overrides the Hindi default.
  • If the patient's latest message is in English (e.g. "My name is Mithlesh and I am 28"), you MUST reply fully in English and set "lang":"en".
  • If it is in Hindi (Devanagari OR romanized Hindi like "mujhe bukhar hai"), reply in Hindi (Devanagari) and set "lang":"hi".
  • The patient may switch languages at any time; switch with them every single turn.
- Do NOT stay in Hindi just because the patient's name is Indian or because you greeted in Hindi. Judge ONLY by the words of their latest message.
- Set the "lang" field to the language of your "say".

PERSONALIZATION (very important — language-specific honorific):
- As soon as you know the patient's name, address them by their FIRST name in EVERY subsequent question.
- HINDI: add the honorific "जी" after the name — e.g. "धन्यवाद मिथिलेश जी। क्या मैं आपकी उम्र जान सकती हूँ?"
- ENGLISH: use the bare first name with NO honorific — do NOT add "Ji" — e.g. "Thank you, Mithlesh. May I know your age?"
- The honorific rule follows the CURRENT turn's language: if you switch to English, drop "Ji"; if you switch to Hindi, add "जी". Apply consistently from greeting to the final confirmation.

NATURAL CONVERSATION (sound like a real receptionist, not a bot):
- Talk like a warm, experienced hospital receptionist having a real conversation. Be human, calm, and reassuring — never robotic or scripted.
- Keep each reply to ONE short sentence whenever possible (max two). Long replies feel slow and unnatural.
- Briefly, naturally acknowledge what they said before asking the next thing — vary your wording, don't repeat the same phrase ("ठीक है", "अच्छा", "जी", "Got it", "Sure", "Thank you" — mix it up). Never start every turn the same way.
- Be context-aware: react to the actual content (if a symptom sounds painful or worrying, show a touch of empathy; if they gave extra info, acknowledge it and skip ahead).
- Never re-ask something already known. Never read back a long summary mid-conversation. Keep it moving so there are no awkward pauses.

ROBUST INPUT HANDLING (do NOT get stuck or repeat a question):
- Speech recognition is imperfect — interpret the INTENT, not the exact letters. Accept near-matches and common mis-hearings.
- GENDER: map confidently and move on. "male / mail / mel / man / boy / पुरुष / ladka / aadmi" -> Male. "female / femail / woman / lady / महिला / aurat / ladki" -> Female. "other / others / trans / अन्य" -> Other. Once you can tell the gender, set it in the patch and ask the NEXT question — never re-ask gender if you got a plausible answer.
- AGE: accept digits or spoken numbers ("twenty eight", "28 saal"). PHONE: accept any 10 digits even if spaced or with filler words.
- Only re-ask the SAME question if the answer was truly empty or unintelligible — and if you must re-ask, phrase it differently and more simply. Never ask the identical question twice in a row.

OTHER RULES:
- Understand ANY symptom, illness, pain, or discomfort described in free natural language. NEVER restrict to a predefined list. Map their words into short clinical symptom labels (e.g. "burning while passing urine" -> "Burning micturition"; "can't sleep and feel low" -> "Insomnia", "Low mood"). Keep the "symptoms" labels themselves in English regardless of conversation language.
- Ask only for what is still missing. If the patient volunteers several details at once, capture them all and skip ahead.
- Ask an intelligent follow-up question only when a detail is genuinely unclear or clinically important — otherwise keep moving. The whole check-in should feel quick.
- Assess clinical urgency yourself (Low, Medium, High, Critical) from the symptoms + duration. Red-flag symptoms (chest pain, breathing difficulty, severe bleeding, stroke signs, etc.) are High or Critical.
- When you have name, age, gender, phone, AND the chief complaint with symptoms (duration too if the patient knows it), set "done": true. For the "done" turn, give a brief, warm line using their name + honorific that thanks them and asks them to review their details on the screen and confirm — e.g. "बहुत बढ़िया मिथिलेश जी! कृपया स्क्रीन पर अपनी जानकारी देखकर पुष्टि करें।" (the full appointment confirmation happens after they confirm).

Respond ONLY with a JSON object of this exact shape:
{
  "say": string,            // your next spoken line, in the patient's current language
  "lang": "hi" | "en",      // the language of "say"
  "expecting": "name" | "age" | "gender" | "phone" | "symptoms" | "duration" | "other",  // which single field THIS question is collecting
  "done": boolean,
  "patch": {                // ONLY include fields you newly learned or updated this turn
    "name"?: string,
    "age"?: string,         // number as a string, e.g. "28"
    "gender"?: "Male" | "Female" | "Other",
    "phone"?: string,       // exactly 10 digits
    "symptoms"?: string[],  // the FULL current list of concise symptom labels (English)
    "durationBucket"?: "today" | "1-3d" | "4-7d" | "1w+" | "1m+",
    "chiefComplaint"?: string,
    "urgency"?: "Low" | "Medium" | "High" | "Critical"
  }
}

Already collected so far (do not re-ask these): ${JSON.stringify({ name: form.name, age: form.age, gender: form.gender, phone: form.phone, symptoms: form.symptoms })}.`
}

const EXPECTING: Expecting[] = ['name', 'age', 'gender', 'phone', 'symptoms', 'duration', 'other']

function sanitize(out: LlmOut, form: IntakeForm, fallbackLang: Lang): { say: string; done: boolean; lang: Lang; expecting: Expecting; patch: Partial<IntakeForm> } {
  const p = out.patch ?? {}
  const patch: Partial<IntakeForm> = {}

  if (typeof p.name === 'string' && p.name.trim()) patch.name = p.name.trim().slice(0, 80)
  if (p.age != null) { const n = parseInt(String(p.age), 10); if (n >= 1 && n <= 120) patch.age = String(n) }
  if (p.gender === 'Male' || p.gender === 'Female' || p.gender === 'Other') patch.gender = p.gender
  if (typeof p.phone === 'string') { const d = p.phone.replace(/\D/g, ''); if (d.length >= 10) patch.phone = d.slice(-10) }
  if (typeof p.chiefComplaint === 'string' && p.chiefComplaint.trim()) patch.chiefComplaint = p.chiefComplaint.trim().slice(0, 200)
  if (p.urgency && (URGENCIES as string[]).includes(p.urgency)) patch.aiUrgency = p.urgency as TriageLevel

  if (Array.isArray(p.symptoms)) {
    const symptoms = p.symptoms.map(s => String(s).trim()).filter(Boolean).slice(0, 12)
    if (symptoms.length) {
      patch.symptoms = symptoms
      const bucket = typeof p.durationBucket === 'string' && (DURATIONS as readonly string[]).includes(p.durationBucket) ? p.durationBucket : undefined
      if (bucket) patch.symptomDurations = Object.fromEntries(symptoms.map(s => [s, bucket]))
    }
  } else if (typeof p.durationBucket === 'string' && (DURATIONS as readonly string[]).includes(p.durationBucket) && form.symptoms.length) {
    patch.symptomDurations = Object.fromEntries(form.symptoms.map(s => [s, p.durationBucket as string]))
  }

  // Language is decided deterministically by the caller (fallbackLang here is
  // the already-resolved turn language); just report it back.
  const say = String(out.say ?? '').slice(0, 600)
  const expecting: Expecting = (EXPECTING as string[]).includes(out.expecting ?? '') ? out.expecting as Expecting : 'other'
  return { say, done: !!out.done, lang: fallbackLang, expecting, patch }
}

export async function POST(req: NextRequest) {
  if (!isOpenAiConfigured()) return NextResponse.json({ error: 'AI not configured' }, { status: 503 })

  let history: { role: string; text: string }[] = []
  let form: IntakeForm
  // Hindi is the default; the model re-detects per turn from what the patient says.
  let lang: Lang = 'hi'
  try {
    const body = await req.json() as { history?: { role: string; text: string }[]; form: IntakeForm; lang?: string }
    history = Array.isArray(body.history) ? body.history.slice(-20) : []
    form = body.form
    if (body.lang === 'en') lang = 'en'
    if (!form) throw new Error('form required')
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  // Resolve THIS turn's language deterministically from the patient's last
  // message (Hindi default on the first turn). This is authoritative — the model
  // is then told exactly which language to reply in, so switching is reliable.
  const lastPatient = [...history].reverse().find(m => m.role === 'patient')?.text ?? ''
  const turnLang: Lang = history.length ? detectLang(lastPatient, lang) : 'hi'

  const directive = turnLang === 'hi'
    ? 'IMPORTANT: Reply in Hindi (Devanagari) for this turn, and set "lang":"hi". Use the "<name> जी" honorific.'
    : 'IMPORTANT: Reply in English for this turn, and set "lang":"en". Use the patient\'s bare first name with NO honorific (do not add "Ji").'

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt(form) },
    ...history.map(m => ({ role: m.role === 'patient' ? 'user' as const : 'assistant' as const, content: m.text })),
  ]
  // First turn (no history) — greet in Hindi (default) and ask the first question.
  if (!history.length) messages.push({ role: 'user', content: '(The patient has just opened the check-in screen. Greet them in Hindi and ask their name.)' })
  messages.push({ role: 'system', content: directive })

  try {
    // Lower max_tokens → shorter generation → faster, snappier replies (the
    // prompt already enforces one-sentence answers). Slightly higher temperature
    // keeps the wording varied and human.
    const out = await openaiJSON<LlmOut>(messages, { temperature: 0.5, maxTokens: 200 })
    return NextResponse.json(sanitize(out, form, turnLang), { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('[intake/turn]', (err as Error).message)
    return NextResponse.json({ error: 'ai upstream error' }, { status: 502 })
  }
}
