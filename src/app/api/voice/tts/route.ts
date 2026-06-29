import { NextRequest, NextResponse } from 'next/server'

// Server-side proxy to ElevenLabs text-to-speech. The API key stays on the
// server; the client only ever receives MP3 audio. Flash v2.5 is low-latency
// and multilingual, so the same voice handles English and Hindi prompts —
// `language_code` nudges pronunciation per turn.

// Single voice for the whole assistant — "Priyanka Sogam" (1zUSi8LeHs9M2mV8X6YS),
// a Hindi professional voice. Professional voices need a PAID ElevenLabs plan; on
// the free tier the API returns 402 and speak() falls back to the browser voice.
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '1zUSi8LeHs9M2mV8X6YS'
const MODEL_ID = process.env.ELEVENLABS_MODEL_ID || 'eleven_flash_v2_5'

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'TTS not configured' }, { status: 503 })

  let text = ''
  let lang: 'en' | 'hi' = 'en'
  try {
    const body = await req.json() as { text?: string; lang?: string }
    text = (body.text ?? '').toString().slice(0, 2000)
    lang = body.lang === 'hi' ? 'hi' : 'en'
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }
  if (!text.trim()) return NextResponse.json({ error: 'text required' }, { status: 400 })

  const upstream = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
        language_code: lang,
        // Calm, even, receptionist-like delivery. High stability + zero style
        // keeps the pace consistent and prevents the erratic speed-ups, skipped
        // words, and artifacts that lower stability / higher style introduce.
        // speed 0.92 is a touch slower than default for clear, unhurried speech.
        voice_settings: { stability: 0.7, similarity_boost: 0.85, style: 0, use_speaker_boost: true, speed: 0.92 },
      }),
    },
  )

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '')
    console.error('[ElevenLabs TTS]', upstream.status, detail.slice(0, 200))
    return NextResponse.json({ error: 'tts upstream error' }, { status: 502 })
  }

  const audio = await upstream.arrayBuffer()
  return new NextResponse(audio, {
    headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
  })
}
