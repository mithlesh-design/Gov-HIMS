/* E1-E6 verification: doctor nav sweep + key new flows + console errors. */
const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
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
  page.on('console', (m) => { const t = m.type(); if (t === 'error' || t === 'warning') errors.push(`[${label}] ${t}: ${m.text().slice(0, 150)}`) })
  page.on('pageerror', (e) => errors.push(`[${label}] PAGEERROR: ${e.message.slice(0, 150)}`))
  page.on('requestfailed', (r) => { const u = r.url(); if (!u.includes('favicon')) errors.push(`[${label}] REQFAIL: ${u.slice(0, 90)}`) })
  const shot = async (n) => { await sleep(600); await page.screenshot({ path: `${OUT}\\${n}.png` }); console.log('shot', n) }

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' }); await sleep(500)
  await click(page, 'Doctor', 'button'); await sleep(2500)

  // Nav sweep (console)
  for (const item of ['Online Consultation', 'Emergencies', 'Patient Records', 'My Schedule', 'Bed Availability', 'Inbox', 'My Activity', 'Disease Registries']) {
    label = item; await click(page, item, 'a'); await sleep(1100)
  }

  // E4: Online consultation flow
  label = 'online'; await click(page, 'Online Consultation', 'a'); await sleep(1200); await shot('e-online')
  await click(page, 'Start consultation', 'button'); await sleep(1500); await shot('e-online-call')   // dashboard + floating video
  await click(page, 'Complete consultation', 'button'); await sleep(800)

  // E5: Emergencies
  label = 'emerg'; await click(page, 'Emergencies', 'a'); await sleep(1200); await shot('e-emergencies')

  // E6: My Activity (doctor)
  label = 'analytics'; await click(page, 'My Activity', 'a'); await sleep(1200)
  await click(page, 'This month', 'button'); await sleep(500); await shot('e-analytics')

  // E3: Records (All patients) + drawer
  label = 'records'; await click(page, 'Patient Records', 'a'); await sleep(1200); await shot('e-records')

  // E2: Consultation history AI brief + view more
  label = 'history'; await click(page, 'Consultations', 'a'); await sleep(1000)
  await click(page, 'Kiran Patil', 'button'); await sleep(1000)
  await click(page, 'View detailed history', 'button'); await sleep(700); await shot('e-history')

  await browser.close()
  console.log('===== ERRORS (' + errors.length + ') ====='); errors.forEach(e => console.log(e)); console.log('===== END =====')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
