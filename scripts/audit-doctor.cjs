/* Final doctor sweep: visit every nav page (updated), capture console/runtime errors. */
const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function click(page, text, sel = 'button, a', tries = 30) {
  for (let i = 0; i < tries; i++) {
    const ok = await page.evaluate((t, sel) => {
      const el = [...document.querySelectorAll(sel)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t) && !e.disabled)
      if (el) { el.click(); return true }; return false
    }, text, sel)
    if (ok) { await sleep(250); return true }; await sleep(200)
  }
  return false
}
;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1500, height: 1080, deviceScaleFactor: 1 })
  let label = 'init'
  const errors = []
  page.on('console', (m) => { const t = m.type(); if (t === 'error' || t === 'warning') errors.push(`[${label}] ${t}: ${m.text().slice(0, 160)}`) })
  page.on('pageerror', (e) => errors.push(`[${label}] PAGEERROR: ${e.message.slice(0, 160)}`))
  page.on('requestfailed', (r) => { const u = r.url(); if (!u.includes('favicon')) errors.push(`[${label}] REQFAIL: ${u.slice(0, 100)}`) })
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' }); await sleep(500)
  await click(page, 'Doctor', 'button'); await sleep(2500)
  const nav = ['Patient Records', 'My Schedule', 'Bed Availability', 'Inbox', 'Telemedicine', 'Disease Registries', 'Consultations']
  for (const item of nav) { label = item; const ok = await click(page, item, 'a'); if (!ok) errors.push(`[${item}] NAV-FAIL`); await sleep(1100) }
  await browser.close()
  console.log('===== DOCTOR SWEEP — ERRORS (' + errors.length + ') ====='); errors.forEach(e => console.log(e)); console.log('===== END =====')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
