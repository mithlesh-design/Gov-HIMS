/* Confirms the audit fixes fire at runtime: pathology Download toast, blood-bank request disable. */
const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function click(page, text, sel = 'button, a', tries = 20) {
  for (let i = 0; i < tries; i++) {
    const ok = await page.evaluate((t, sel) => {
      const el = [...document.querySelectorAll(sel)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t) && !e.disabled)
      if (el) { el.click(); return true }
      return false
    }, text, sel)
    if (ok) { await sleep(250); return true }
    await sleep(200)
  }
  return false
}
;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1366, height: 1700, deviceScaleFactor: 1 })
  const shot = async (n) => { await sleep(400); await page.screenshot({ path: `${OUT}\\${n}.png` }); console.log('shot', n) }
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' }); await sleep(500)
  await click(page, 'Patient', 'button'); await click(page, 'Patient Portal', 'button'); await sleep(2500)

  await click(page, 'Pathology', 'a'); await sleep(900)
  await click(page, 'Download', 'button'); await sleep(500); await shot('x-fix-pathology-toast')

  await click(page, 'Blood Bank', 'a'); await sleep(900)
  await click(page, 'Request blood', 'button'); await sleep(500); await shot('x-fix-bloodbank-requested')

  await browser.close(); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
