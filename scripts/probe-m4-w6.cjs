/* M4-W6 visual capture — S14 Care-Team Presence + Live Handover. */
const puppeteer = require('puppeteer-core')
const path = require('path')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = path.join(__dirname, '..', 'docs', 'specs', 'screens', 'M4-W6')
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

  // ── S14 on Doctor IPD ───────────────────────────────────────────────────
  await clickByText(p, 'Clinical', 'button'); await sleep(500)
  await clickByText(p, 'Doctor', 'button');   await sleep(4500)

  await p.evaluate(() => { window.location.assign('/doctor/ipd') })
  await sleep(7000)
  await p.screenshot({ path: path.join(OUT, 'M4-W6-S14-doctor-ipd-presence.png'), fullPage: true })
  console.log('  shot S14 doctor IPD presence')

  // Open Compose handover and snapshot the SBAR draft
  await clickByText(p, 'Compose handover', 'button')
  await sleep(1500)
  await p.screenshot({ path: path.join(OUT, 'M4-W6-S14-sbar-compose.png'), fullPage: true })
  console.log('  shot S14 SBAR compose')

  // ── S14 on Nurse dashboard ──────────────────────────────────────────────
  await p.evaluate(() => {
    try {
      const raw = localStorage.getItem('agentix-authstore')
      const o = raw ? JSON.parse(raw) : { state: {}, version: 1 }
      o.state = { ...(o.state || {}), activeRole: 'nurse', currentUser: { id: 'NR-402', name: 'Anjali Desai', role: 'nurse', department: 'General Ward' } }
      localStorage.setItem('agentix-authstore', JSON.stringify(o))
    } catch {}
  })
  await p.evaluate(() => { window.location.assign('/nurse/dashboard') })
  await sleep(8000)
  await p.screenshot({ path: path.join(OUT, 'M4-W6-S14-nurse-dashboard-presence.png'), fullPage: true })
  console.log('  shot S14 nurse dashboard presence')

  await b.close()
})()
