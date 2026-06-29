/* M3 verification: patients directory + detail drawer. */
const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function click(page, text, sel = 'button, a', tries = 25) {
  for (let i = 0; i < tries; i++) {
    const ok = await page.evaluate((t, sel) => {
      const el = [...document.querySelectorAll(sel)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t) && !e.disabled)
      if (el) { el.click(); return true }
      return false
    }, text, sel)
    if (ok) { await sleep(250); return true }
    await sleep(200)
  }
  throw new Error('not found: ' + text)
}
;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1500, height: 1100, deviceScaleFactor: 1 })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 160)) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 160)))
  const shot = async (n) => { await sleep(450); await page.screenshot({ path: `${OUT}\\${n}.png` }); console.log('shot', n) }

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' }); await sleep(500)
  await click(page, 'Operations', 'button')
  await click(page, 'Reception', 'button')
  await sleep(2000)
  await click(page, 'Patients', 'a'); await sleep(1200); await shot('m3-patients-today')

  // Open a patient drawer (Kiran Patil)
  await click(page, 'Kiran Patil', 'button'); await sleep(900); await shot('m3-patient-drawer')
  // Close drawer, switch to Upcoming tab
  await page.keyboard.press('Escape'); await sleep(300)
  await click(page, 'Upcoming', 'button'); await sleep(700); await shot('m3-patients-upcoming')

  await browser.close()
  console.log('ERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e))
  console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
