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
  throw new Error('not found: ' + text)
}
;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1500, height: 1100, deviceScaleFactor: 1 })
  const shot = async (n) => { await sleep(700); await page.screenshot({ path: `${OUT}\\${n}.png` }); console.log('shot', n) }
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' }); await sleep(500)
  await click(page, 'Doctor', 'button'); await sleep(2500)
  for (const [navText, name] of [['Patient Records', 'dr2-records'], ['My Schedule', 'dr2-schedule'], ['Inbox', 'dr2-inbox'], ['Telemedicine', 'dr2-telemedicine'], ['Disease Registries', 'dr2-registries']]) {
    await click(page, navText, 'a'); await sleep(1600); await shot(name)
  }
  // Also select a patient on the dashboard to see the consultation workspace
  await click(page, 'Consultations', 'a'); await sleep(1200)
  await click(page, 'Kiran Patil', 'div'); await sleep(1200); await shot('dr2-consult-open')
  await browser.close(); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
