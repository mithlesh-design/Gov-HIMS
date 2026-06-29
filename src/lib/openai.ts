// Server-side OpenAI client. Keep this module out of client components — it
// reads OPENAI_API_KEY and must only run in route handlers / server code.
// Reusable by any AI feature that needs real model output instead of mock data.

type Role = 'system' | 'user' | 'assistant'
export interface ChatMessage { role: Role; content: string }

interface ChatOpts {
  model?: string
  temperature?: number
  maxTokens?: number
  /** Force a JSON object response (OpenAI json_object mode). */
  json?: boolean
}

const ENDPOINT = 'https://api.openai.com/v1/chat/completions'

export function isOpenAiConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY
}

/** Low-level chat completion. Returns the assistant message text. Throws on error. */
export async function openaiChat(messages: ChatMessage[], opts: ChatOpts = {}): Promise<string> {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY is not set')

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: opts.model ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 600,
      ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
      messages,
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`OpenAI ${res.status}: ${detail.slice(0, 300)}`)
  }

  const data = await res.json()
  return data?.choices?.[0]?.message?.content ?? ''
}

/** Chat completion that returns parsed JSON. Throws if the model returns invalid JSON. */
export async function openaiJSON<T = unknown>(messages: ChatMessage[], opts: ChatOpts = {}): Promise<T> {
  const text = await openaiChat(messages, { ...opts, json: true })
  return JSON.parse(text) as T
}
