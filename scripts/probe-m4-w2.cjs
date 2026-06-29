/* M4-W2 visual capture — S4 Copilot · S5 Voice Scribe · S6 OCR Intake. */
const puppeteer = require('puppeteer-core')
const path = require('path')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = path.join(__dirname, '..', 'docs', 'specs', 'screens', 'M4-W2')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function clickByText(page, text, sel = 'button') {
  return page.evaluate((t, s) => {
    const el = [...document.querySelectorAll(s)].find((e) => (e.textContent || '').includes(t) && !e.disabled)
    if (el) { el.click(); return true } return false
  }, text, sel)
}

;(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const p = await b.newPage()
  await p.setViewport({ width: 1500, height: 1000 })

  // Fresh seed
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })
  await p.evaluate(() => { try { localStorage.clear() } catch {} })
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })
  for (let i = 0; i < 60; i++) {
    const ready = await p.evaluate(() =>
      localStorage.getItem('agentix.api.v1.__bootstrap__') !== null &&
      Object.keys(localStorage).some((k) => k.startsWith('agentix.legacy-seed.anil-')))
    if (ready) break
    await sleep(500)
  }
  await sleep(2500)
  await clickByText(p, 'Clinical'); await sleep(400)
  await clickByText(p, 'Doctor');   await sleep(4000)

  // ── S4 Copilot — open palette and type an NL query ──────────────────────
  await p.goto('http://localhost:3000/doctor/dashboard', { waitUntil: 'domcontentloaded' })
  await sleep(2500)
  // Fire Cmd/Ctrl+K
  await p.keyboard.down('Control')
  await p.keyboard.press('K')
  await p.keyboard.up('Control')
  await sleep(800)
  await p.keyboard.type('schedule MRI for Anil Tuesday 10am', { delay: 30 })
  await sleep(900)
  await p.screenshot({ path: path.join(OUT, 'M4-W2-S4-copilot-intent-preview.png'), fullPage: false })
  console.log('  shot S4 copilot')
  await p.keyboard.press('Escape')
  await sleep(400)

  // ── S5 Voice Scribe — Doctor IPD page mounts the button at top ──────────
  await p.goto('http://localhost:3000/doctor/ipd', { waitUntil: 'domcontentloaded' })
  await sleep(3000)
  // Click the Voice scribe button
  await clickByText(p, 'Voice scribe', 'button')
  // Wait for the mock fallback to fill the transcript (1200 ms) and SOAP card
  await sleep(2000)
  await p.screenshot({ path: path.join(OUT, 'M4-W2-S5-voice-scribe-ipd.png'), fullPage: true })
  console.log('  shot S5 voice scribe')

  // ── S6 OCR Intake — Reception walk-in modal ─────────────────────────────
  // Mutate persisted activeRole in the zustand store before navigation.
  await p.evaluate(() => {
    try {
      const raw = localStorage.getItem('agentix-authstore')
      const o = raw ? JSON.parse(raw) : { state: {}, version: 1 }
      o.state = { ...(o.state || {}), activeRole: 'reception' }
      localStorage.setItem('agentix-authstore', JSON.stringify(o))
    } catch {}
  })
  // Hard-navigate to the OPD board (Next client routing intercepts the goto).
  await p.evaluate(() => { window.location.assign('http://localhost:3000/reception/opd') })
  await sleep(4500)
  // If we landed elsewhere (Reception dashboard default), click the OPD Queue
  // sidebar link to actually open the queue board where the walk-in lives.
  const onOpd = await p.evaluate(() => location.pathname.includes('/reception/opd'))
  if (!onOpd) {
    await p.evaluate(() => {
      const a = [...document.querySelectorAll('a')].find(x => /opd queue/i.test(x.textContent || '') && (x.getAttribute('href') || '').includes('/reception/opd'))
      if (a) a.click()
    })
    await sleep(3500)
  }
  // Click "Register Walk-in" — opens modal containing OcrIntakeCard
  await clickByText(p, 'Register Walk-in', 'button')
  await sleep(1200)
  // Click "Demo scan" inside the OCR card — waits 800 ms then renders fields
  await clickByText(p, 'Demo scan', 'button')
  await sleep(1600)
  await p.screenshot({ path: path.join(OUT, 'M4-W2-S6-ocr-intake.png'), fullPage: true })
  console.log('  shot S6 OCR intake')

  await b.close()
})()
