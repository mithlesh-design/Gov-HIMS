// Client-side bridge to the OpenAI-backed intake turn-taker (/api/intake/turn).
// Returns the assistant's next line + extracted field patch, or null if the AI
// service is unavailable (the caller then falls back to the deterministic flow).

import type { IntakeForm } from '@/lib/intake/data'

export type Expecting = 'name' | 'age' | 'gender' | 'phone' | 'symptoms' | 'duration' | 'other'

export interface LlmIntakeTurn {
  say: string
  done: boolean
  lang: 'en' | 'hi'
  expecting: Expecting
  patch: Partial<IntakeForm>
}

export type LlmMsg = { role: 'assistant' | 'patient'; text: string }

export async function llmIntakeTurn(
  history: LlmMsg[],
  form: IntakeForm,
  lang: 'en' | 'hi',
): Promise<LlmIntakeTurn | null> {
  try {
    const res = await fetch('/api/intake/turn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history, form, lang }),
    })
    if (!res.ok) return null
    const data = await res.json() as LlmIntakeTurn
    if (typeof data.say !== 'string' || !data.say.trim()) return null
    return {
      say: data.say,
      done: !!data.done,
      lang: data.lang === 'en' ? 'en' : 'hi',
      expecting: data.expecting ?? 'other',
      patch: data.patch ?? {},
    }
  } catch {
    return null
  }
}
