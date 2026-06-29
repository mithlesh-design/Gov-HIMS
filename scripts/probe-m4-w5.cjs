/* M4-W5 visual capture — S11 AI Health Summary · S12 Family Invite · S13 Nudges. */
const puppeteer = require('puppeteer-core')
const path = require('path')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = path.join(__dirname, '..', 'docs', 'specs', 'screens', 'M4-W5')
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
  await p.setViewport({ width: 1500, height: 1200 })

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

  // Patient role: click the tab whose text is exactly "Patient", then the
  // Patient Portal tile underneath.
  await p.evaluate(() => {
    const tab = [...document.querySelectorAll('button')]
      .find((b) => /^\s*Patient\s*$/.test(b.textContent || ''))
    if (tab) tab.click()
  })
  await sleep(1500)
  await p.evaluate(() => {
    const btn = [...document.querySelectorAll('button')]
      .find((b) => /Patient Portal/.test(b.textContent || '') && /Track queue/.test(b.textContent || ''))
    if (btn) btn.click()
  })
  await sleep(7000)

  // ── Full-page shot of /patient/dashboard ────────────────────────────────
  await p.evaluate(() => { window.location.assign('/patient/dashboard') })
  await sleep(8000)
  await p.screenshot({ path: path.join(OUT, 'M4-W5-patient-dashboard-full.png'), fullPage: true })
  console.log('  shot patient dashboard (full)')

  // ── S11 close-up: scroll to top then crop top area via viewport screenshot
  await p.evaluate(() => window.scrollTo(0, 0))
  await sleep(800)
  await p.screenshot({ path: path.join(OUT, 'M4-W5-S11-ai-health-summary.png'), fullPage: false })
  console.log('  shot S11 AI Health Summary')

  // ── S12 close-up: scroll to Family Invite card on the right rail
  await p.evaluate(() => {
    const el = [...document.querySelectorAll('h3')].find((h) => /Invite family on WhatsApp/.test(h.textContent || ''))
    if (el) el.scrollIntoView({ block: 'center' })
  })
  await sleep(600)
  // Click the "Send a tracker invite" button to expand the form for the demo
  await clickByText(p, 'Send a tracker invite', 'button')
  await sleep(800)
  await p.screenshot({ path: path.join(OUT, 'M4-W5-S12-family-invite.png'), fullPage: false })
  console.log('  shot S12 Family Invite')

  // ── S13 close-up: scroll to Nudges feed
  await p.evaluate(() => {
    const el = [...document.querySelectorAll('h3')].find((h) => /For you — proactive nudges/.test(h.textContent || ''))
    if (el) el.scrollIntoView({ block: 'center' })
  })
  await sleep(800)
  await p.screenshot({ path: path.join(OUT, 'M4-W5-S13-proactive-nudges.png'), fullPage: false })
  console.log('  shot S13 Proactive Nudges')

  await b.close()
})()
