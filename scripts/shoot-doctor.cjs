/* Doctor panel review: visit every nav page, capture console/runtime errors. */
const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function click(page, text, sel = 'button, a', tries = 25) {
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
  await page.setViewport({ width: 1500, height: 1150, deviceScaleFactor: 1 })
  let label = 'init'
  const errors = []
  page.on('console', (m) => { const t = m.type(); if (t === 'error' || t === 'warning') errors.push(`[${label}] ${t}: ${m.text().slice(0, 170)}`) })
  page.on('pageerror', (e) => errors.push(`[${label}] PAGEERROR: ${e.message.slice(0, 170)}`))
  page.on('requestfailed', (r) => { const u = r.url(); if (!u.includes('favicon')) errors.push(`[${label}] REQFAIL: ${u.slice(0, 100)}`) })
  const shot = async (n) => { await sleep(450); await page.screenshot({ path: `${OUT}\\${n}.png` }); console.log('shot', n) }

  label = 'landing'
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' }); await sleep(500)
  await click(page, 'Doctor', 'button')          // Clinical tab is default; Doctor card
  await sleep(2500)
  label = 'dashboard'; await shot('dr-dashboard')

  const nav = [
    ['Patient Records', 'dr-records'],
    ['My Schedule', 'dr-schedule'],
    ['Consultation', 'dr-consultation'],
    ['Inbox', 'dr-inbox'],
    ['Telemedicine', 'dr-telemedicine'],
    ['Disease Registries', 'dr-registries'],
    ['Consultations', 'dr-dashboard2'],   // back to dashboard (nav label)
  ]
  for (const [navText, name] of nav) {
    label = name
    const ok = await click(page, navText, 'a')
    if (!ok) { errors.push(`[${name}] NAV-FAIL: ${navText}`); continue }
    await sleep(1100); await shot(name)
  }
  await browser.close()
  console.log('===== DOCTOR SWEEP — ERRORS (' + errors.length + ') =====')
  errors.forEach(e => console.log(e))
  console.log('===== END =====')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
