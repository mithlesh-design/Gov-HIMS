import { NextRequest, NextResponse } from 'next/server'
import { openaiJSON, isOpenAiConfigured } from '@/lib/openai'

// Generic OpenAI JSON proxy. Any AI service sends a system + user prompt and
// gets back the model's JSON object. Keeps the API key server-side and gives
// every feature one place to reach the model.

export async function POST(req: NextRequest) {
  if (!isOpenAiConfigured()) return NextResponse.json({ error: 'AI not configured' }, { status: 503 })

  let system = ''
  let user = ''
  let temperature = 0.3
  let maxTokens = 900
  try {
    const b = await req.json() as { system?: string; user?: string; temperature?: number; maxTokens?: number }
    system = String(b.system ?? '')
    user = String(b.user ?? '')
    if (typeof b.temperature === 'number') temperature = Math.max(0, Math.min(1.5, b.temperature))
    if (typeof b.maxTokens === 'number') maxTokens = Math.max(64, Math.min(4000, b.maxTokens))
    if (!system || !user) throw new Error('system and user required')
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  try {
    const data = await openaiJSON([
      { role: 'system', content: `${system}\n\nReturn ONLY a valid JSON object.` },
      { role: 'user', content: user },
    ], { temperature, maxTokens })
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('[ai/complete]', (err as Error).message)
    return NextResponse.json({ error: 'ai upstream error' }, { status: 502 })
  }
}
