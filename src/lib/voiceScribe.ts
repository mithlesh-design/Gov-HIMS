// Ambient voice scribe. Dictation uses the browser's Web Speech API
// (feature-detected, graceful fallback). `toSOAP` turns a free-text/dictated
// note into a structured S/O/A/P note the doctor can refine.

/* eslint-disable @typescript-eslint/no-explicit-any */

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
}

export type Recognition = { stop: () => void }

const browserLang = () =>
  typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US'

// Starts continuous dictation; `onText` receives finalised chunks. Returns a
// handle to stop, or null if unsupported / failed to start.
export function startDictation(onText: (chunk: string) => void, onEnd: () => void): Recognition | null {
  const SR = typeof window !== 'undefined' ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null
  if (!SR) return null
  let rec: any
  try { rec = new SR() } catch { return null }
  rec.continuous = true
  rec.interimResults = false
  rec.lang = browserLang()
  rec.onresult = (e: any) => {
    let text = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) text += e.results[i][0].transcript
    }
    if (text.trim()) onText(text.trim())
  }
  rec.onend = onEnd
  // 'aborted' fires when stop() is called — treat it the same as natural end.
  rec.onerror = (e: any) => { if ((e?.error || '') !== 'aborted') onEnd() }
  try { rec.start() } catch { return null }
  return { stop: () => { try { rec.stop() } catch { /* ignore */ } } }
}

// Voice-command dictation for search/assistant: a SINGLE utterance with live
// interim text and explicit error reporting. `onPartial` streams the running
// transcript (replace the input); `onFinal` fires once with the complete phrase
// when the user stops (use it to auto-submit). `onError` surfaces problems like
// blocked-mic ('not-allowed') or 'no-speech' so the UI isn't silently dead.
export function startVoiceCommand(opts: {
  onPartial?: (text: string) => void
  onFinal: (text: string) => void
  onError?: (err: string) => void
  onEnd?: () => void
  lang?: string
  /** How long to keep waiting for the patient to START speaking before giving
   *  up (ms). Slow/elderly patients need a generous window — the browser's own
   *  no-speech timeout (~5-7s) is too short, so we auto-restart until this. */
  graceMs?: number
}): Recognition | null {
  const SR = typeof window !== 'undefined' ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null
  if (!SR) { opts.onError?.('unsupported'); return null }

  const grace = opts.graceMs ?? 15000
  const startedAt = Date.now()
  let finalText = ''
  let lastInterim = ''    // best interim transcript seen — used if no final arrives
  let spoke = false       // patient has produced some speech (interim or final)
  let stopped = false     // explicit stop() or a final result — do not restart
  let settleTimer: ReturnType<typeof setTimeout> | null = null
  let rec: any

  const clearSettle = () => { if (settleTimer) { clearTimeout(settleTimer); settleTimer = null } }

  const build = (): any | null => {
    let r: any
    try { r = new SR() } catch { opts.onError?.('init-failed'); return null }
    r.continuous = false
    r.interimResults = true
    r.maxAlternatives = 1
    r.lang = opts.lang ?? browserLang()
    r.onresult = (e: any) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalText += t
        else interim += t
      }
      if (interim) lastInterim = interim
      if (interim || finalText) spoke = true
      opts.onPartial?.((finalText + interim).trim())
      // Snappier endpointing: once we have a confident transcript, if no further
      // speech arrives shortly, stop to finalize immediately instead of waiting
      // for the browser's slow silence timeout. This cuts response latency,
      // especially on short answers like "Male" / "28".
      clearSettle()
      if (finalText.trim() || lastInterim.trim()) {
        settleTimer = setTimeout(() => { try { r.stop() } catch { /* ignore */ } }, 900)
      }
    }
    r.onerror = (e: any) => {
      const err: string = e?.error || 'error'
      // 'aborted'/'no-speech' are expected silence outcomes, not failures.
      if (err !== 'aborted' && err !== 'no-speech') { stopped = true; opts.onError?.(err) }
    }
    r.onend = () => {
      clearSettle()
      // Use the final transcript, or fall back to the best interim — Chrome
      // frequently ends short utterances ("Male", "28") without ever marking a
      // result final, which previously dropped the answer and stalled the flow.
      const t = (finalText.trim() || lastInterim.trim())
      if (t) { stopped = true; opts.onFinal(t); opts.onEnd?.(); return }
      // Nothing heard yet. If still within the grace window, restart so slow
      // patients have more time to begin answering.
      if (!stopped && !spoke && Date.now() - startedAt < grace) {
        try { rec = build(); rec?.start() } catch { opts.onEnd?.() }
        return
      }
      opts.onEnd?.()
    }
    return r
  }

  rec = build()
  if (!rec) return null
  try { rec.start() } catch { opts.onError?.('start-failed'); return null }
  return { stop: () => { stopped = true; clearSettle(); try { rec?.stop() } catch { /* ignore */ } } }
}

// ── Text-to-speech (assistant voice) ─────────────────────────────────
// Speaks `text` via the browser's speechSynthesis, preferring a voice that
// matches the requested language. `onDone` fires when speech finishes (or
// immediately if TTS is unsupported) so callers can chain "speak → listen".
export function isSpeechOutputSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

// Playback handles for the current clip, tracked so cancelSpeech() can stop it.
let currentAudio: HTMLAudioElement | null = null
let currentSource: AudioBufferSourceNode | null = null
let audioCtx: AudioContext | null = null
// Monotonic token identifying the latest speak() request. Because TTS audio is
// fetched asynchronously, a newer speak() (or cancelSpeech()) must invalidate any
// in-flight request so two clips can never play at once — this is the guard that
// prevents overlapping / duplicate voice (e.g. a re-run effect firing twice).
let speakSeq = 0

function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext || (window as any).webkitAudioContext
  if (!Ctor) return null
  if (!audioCtx) { try { audioCtx = new Ctor() } catch { return null } }
  return audioCtx
}

// Warm up the audio engine on a user gesture: create + resume the AudioContext
// and play one silent sample. Browsers start an AudioContext "suspended" until a
// gesture, and resuming lazily (mid-conversation) delays/clips the first word.
// Unlocking early guarantees the engine is fully initialized before the
// assistant's first greeting plays. Idempotent.
let audioUnlocked = false
function unlockAudio(): void {
  const ctx = getAudioCtx()
  if (!ctx) return
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  try {
    const buf = ctx.createBuffer(1, 1, 22050)
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(ctx.destination)
    src.start(0)
    audioUnlocked = true
  } catch { /* ignore */ }
}

// Register once: the patient taps several times (Get started → consult type →
// method → Continue) before the voice greeting, so the context is already
// running and warm by the time the assistant speaks.
if (typeof window !== 'undefined') {
  const handler = () => {
    unlockAudio()
    if (audioUnlocked) {
      window.removeEventListener('pointerdown', handler)
      window.removeEventListener('touchstart', handler)
      window.removeEventListener('keydown', handler)
    }
  }
  window.addEventListener('pointerdown', handler)
  window.addEventListener('touchstart', handler)
  window.addEventListener('keydown', handler)
}

// Speaks via the ElevenLabs proxy (`/api/voice/tts`) for a natural assistant
// voice, falling back to the browser's speechSynthesis if the request fails or
// the key isn't configured. `onDone` fires exactly once when audio finishes.
export function speak(text: string, lang: 'en' | 'hi' = 'en', onDone?: () => void): void {
  cancelSpeech()
  if (typeof window === 'undefined' || !text.trim()) { onDone?.(); return }

  const seq = ++speakSeq
  let settled = false
  const finish = () => { if (!settled) { settled = true; onDone?.() } }

  fetch('/api/voice/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, lang }),
  })
    .then(async (res) => {
      // A newer speak()/cancelSpeech() superseded this request — drop it before
      // it can start a competing audio clip.
      if (seq !== speakSeq) return
      if (!res.ok) throw new Error(`tts ${res.status}`)
      const bytes = await res.arrayBuffer()
      if (seq !== speakSeq) return

      // Preferred path: decode the WHOLE clip with the Web Audio API before
      // playing. `decodeAudioData` only resolves once every sample is decoded, so
      // an AudioBufferSourceNode plays from sample 0 with zero warm-up — this is
      // what guarantees the sentence starts on the very first word (no clipping).
      const ctx = getAudioCtx()
      if (ctx) {
        try {
          if (ctx.state === 'suspended') { try { await ctx.resume() } catch { /* ignore */ } }
          const decoded = await ctx.decodeAudioData(bytes.slice(0))
          if (seq !== speakSeq) return

          // Prepend ~200ms of silence to the decoded clip. The audio engine can
          // drop its first render quantum while spinning up, which clips the
          // opening word ("Thank you…"). With a silent lead, any dropped warm-up
          // samples come from the silence — the speech itself always plays in
          // full from its first word. This is the definitive anti-clip fix.
          const padSec = 0.2
          const pad = Math.floor(decoded.sampleRate * padSec)
          const buffer = ctx.createBuffer(decoded.numberOfChannels, decoded.length + pad, decoded.sampleRate)
          for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
            buffer.getChannelData(ch).set(decoded.getChannelData(ch), pad)
          }

          const source = ctx.createBufferSource()
          source.buffer = buffer
          source.connect(ctx.destination)
          source.onended = () => { if (currentSource === source) currentSource = null; finish() }
          currentSource = source
          // Schedule a hair ahead of now so the graph is fully live before the
          // buffer begins, rather than racing an "immediate" start.
          source.start(ctx.currentTime + 0.02)
          return
        } catch { /* fall through to HTMLAudio */ }
      }

      // Fallback: HTMLAudioElement, played only once fully ready (canplaythrough)
      // so the first word still isn't clipped on browsers without Web Audio.
      const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }))
      if (seq !== speakSeq) { URL.revokeObjectURL(url); return }
      const audio = new Audio()
      audio.preload = 'auto'
      currentAudio = audio
      const cleanup = () => { URL.revokeObjectURL(url); if (currentAudio === audio) currentAudio = null }
      audio.onended = () => { cleanup(); finish() }
      audio.onerror = () => { cleanup(); if (seq === speakSeq) browserSpeak(text, lang, finish) }
      let started = false
      const start = () => {
        if (started || seq !== speakSeq) return
        started = true
        audio.play().catch(() => { cleanup(); if (seq === speakSeq) browserSpeak(text, lang, finish) })
      }
      audio.addEventListener('canplaythrough', start, { once: true })
      audio.src = url
      audio.load()
      const poll = setInterval(() => {
        if (started || seq !== speakSeq) { clearInterval(poll); return }
        if (audio.readyState >= 4) { clearInterval(poll); start() }
      }, 60)
      setTimeout(() => { if (!started) { clearInterval(poll); start() } }, 2500)
    })
    .catch(() => { if (seq === speakSeq) browserSpeak(text, lang, finish) })
}

function browserSpeak(text: string, lang: 'en' | 'hi', onDone?: () => void): void {
  if (!isSpeechOutputSupported()) { onDone?.(); return }
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const target = lang === 'hi' ? 'hi-IN' : 'en-IN'
  u.lang = target
  const match = synth.getVoices().find(v => v.lang === target) || synth.getVoices().find(v => v.lang.startsWith(lang))
  if (match) u.voice = match
  u.rate = 0.92   // calm, unhurried pace to match the primary voice
  u.pitch = 1
  u.onend = () => onDone?.()
  u.onerror = () => onDone?.()
  synth.speak(u)
}

export function cancelSpeech(): void {
  speakSeq++ // invalidate any in-flight speak() so it can't start playing
  if (currentSource) {
    currentSource.onended = null
    try { currentSource.stop() } catch { /* already stopped */ }
    try { currentSource.disconnect() } catch { /* ignore */ }
    currentSource = null
  }
  if (currentAudio) {
    currentAudio.onended = null
    currentAudio.onerror = null
    currentAudio.pause()
    currentAudio = null
  }
  if (isSpeechOutputSupported()) window.speechSynthesis.cancel()
}

export function toSOAP(text: string, opts: { diagnosis?: string; vitals?: string }): string {
  const t = text.trim()
  return [
    `S (Subjective): ${t || '—'}`,
    `O (Objective): ${opts.vitals ? opts.vitals : 'Examination findings / vitals — to complete.'}`,
    `A (Assessment): ${opts.diagnosis?.trim() || 'Working diagnosis — to complete.'}`,
    `P (Plan): Investigations / medications as ordered above; follow-up and red-flag advice given.`,
  ].join('\n')
}
