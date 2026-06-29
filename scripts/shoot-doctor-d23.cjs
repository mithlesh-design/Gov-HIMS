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
  await page.setViewport({ width: 1500, height: 1150, deviceScaleFactor: 1 })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 160)) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 160)))
  const shot = async (n) => { await sleep(650); await page.screenshot({ path: `${OUT}\\${n}.png` }); console.log('shot', n) }
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' }); await sleep(500)
  await click(page, 'Doctor', 'button'); await sleep(2500)

  await click(page, 'Bed Availability', 'a'); await sleep(1500); await shot('d3-beds-current')
  // Switch to a full ward branch view: select Whitefield
  await click(page, 'Whitefield', 'button'); await sleep(800); await shot('d3-beds-whitefield')

  await click(page, 'My Schedule', 'a'); await sleep(1500); await shot('d2-schedule')
  await click(page, 'Patient Records', 'a'); await sleep(1500)
  await click(page, 'Kiran Patil', 'button'); await sleep(1000); await shot('d2-records-drawer')
  await page.keyboard.press('Escape'); await sleep(300)
  await click(page, 'Inbox', 'a'); await sleep(1200); await shot('d2-inbox')
  await click(page, 'Telemedicine', 'a'); await sleep(1300)
  await click(page, 'Join Session', 'button'); await sleep(1000); await shot('d2-telemed-call')
  await click(page, 'End call', 'button'); await sleep(500)

  // Admission modal bed-availability integration
  await click(page, 'Consultations', 'a'); await sleep(1000)
  await click(page, 'Kiran Patil', 'button'); await sleep(1200)
  await click(page, 'Admit Patient', 'button'); await sleep(500)
  await click(page, 'Create Admission Card', 'button'); await sleep(800); await shot('d3-admit-modal')

  await browser.close()
  console.log('ERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
