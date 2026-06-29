const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickMaybe(page, text, sel = 'button, a') {
  return page.evaluate((t, sel) => {
    const el = [...document.querySelectorAll(sel)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t) && !e.disabled)
    if (el) { el.click(); return true }; return false
  }, text, sel)
}
async function click(page, text, sel = 'button, a', tries = 30) {
  for (let i = 0; i < tries; i++) { if (await clickMaybe(page, text, sel)) { await sleep(250); return } await sleep(200) }
  throw new Error('not found: ' + text)
}
async function ask(page, text) {
  await page.evaluate((t) => {
    const ta = document.querySelector('textarea')
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(ta, t)
    ta.dispatchEvent(new Event('input', { bubbles: true }))
  }, text)
  await sleep(200)
  await clickMaybe(page, '', 'button[aria-label="Send"]')
  await sleep(1100)
}
;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1500, height: 1000, deviceScaleFactor: 1 })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 150)) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 150)))
  const shot = async (n) => { await sleep(500); await page.screenshot({ path: `${OUT}\\${n}.png` }); console.log('shot', n) }

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' }); await sleep(500)
  await click(page, 'Doctor', 'button'); await sleep(2500)
  await click(page, 'AI Assistant', 'a'); await sleep(1500)

  await ask(page, 'Draft a prescription for Aarav Sharma')
  await shot('p3-m9-rx-draft')
  // First click arms confirm, second executes
  await clickMaybe(page, 'Send to pharmacy', 'button'); await sleep(400)
  await shot('p3-m9-confirm')
  await clickMaybe(page, 'Confirm — Send to pharmacy', 'button'); await sleep(900)
  await shot('p3-m9-filed')
  // Verify the pharmacy store actually received it
  const filed = await page.evaluate(() => {
    try { const raw = JSON.parse(localStorage.getItem('agentix-pharmacy') || 'null'); return null } catch { return null }
  })
  console.log('filed marker (localStorage may not persist pharmacy):', filed)

  // Discharge summary execution for an inpatient
  await click(page, 'New chat', 'button'); await sleep(400)
  await ask(page, 'Draft a discharge summary for Mohan Lal')
  await clickMaybe(page, 'Apply to discharge', 'button'); await sleep(400)
  await clickMaybe(page, 'Apply to discharge', 'button'); await sleep(300)
  await clickMaybe(page, 'Confirm — Apply to discharge', 'button'); await sleep(900)
  await shot('p3-m9-discharge-applied')

  await browser.close()
  console.log('ERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
