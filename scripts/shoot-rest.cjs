/* Captures the 3 static pages the audit loop missed + verifies the reschedule fix. */
const puppeteer = require('puppeteer-core')
const fs = require('fs')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Retrying click — polls for the element so we never race the SPA mount.
async function click(page, text, sel = 'button, a', tries = 20) {
  for (let i = 0; i < tries; i++) {
    const ok = await page.evaluate((t, sel) => {
      const el = [...document.querySelectorAll(sel)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t) && !e.disabled)
      if (el) { el.click(); return true }
      return false
    }, text, sel)
    if (ok) { await sleep(250); return }
    await sleep(200)
  }
  throw new Error('not found: ' + text)
}

;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1366, height: 1700, deviceScaleFactor: 1 })
  const shot = async (n) => { await sleep(450); await page.screenshot({ path: `${OUT}\\${n}.png` }); console.log('shot', n) }

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' }); await sleep(500)
  await click(page, 'Patient', 'button')
  await click(page, 'Patient Portal', 'button')
  await sleep(2500)

  for (const [navText, name] of [['My Health Story', 'a-health-story'], ['Insurance', 'a-insurance'], ['Profile & Privacy', 'a-profile']]) {
    await click(page, navText, 'a'); await sleep(1100); await shot(name)
  }

  // Verify reschedule opens the booking panel (in-person tab, Dr. Priya Nair upcoming)
  await click(page, 'My Consultations', 'a'); await sleep(900)
  await click(page, 'Reschedule', 'button'); await sleep(800); await shot('x-reschedule')

  await browser.close()
  console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
