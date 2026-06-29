const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickMaybe(page, text, sel = 'button, a') {
  return page.evaluate((t, sel) => { const el = [...document.querySelectorAll(sel)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t) && !e.disabled); if (el) { el.click(); return true } return false }, text, sel)
}
async function click(page, text, sel = 'button, a', tries = 30) { for (let i = 0; i < tries; i++) { if (await clickMaybe(page, text, sel)) { await sleep(250); return } await sleep(200) } throw new Error('not found: ' + text) }
async function ask(page, text) {
  await page.evaluate((t) => { const ta = document.querySelector('textarea'); Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(ta, t); ta.dispatchEvent(new Event('input', { bubbles: true })) }, text)
  await sleep(200); await clickMaybe(page, '', 'button[aria-label="Send"]'); await sleep(1100)
}
;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1500, height: 1000, deviceScaleFactor: 1 })
  // Intercept window.open so we can capture the generated print document.
  await page.evaluateOnNewDocument(() => {
    window.__printed = ''
    window.open = function () { return { document: { write: (h) => { window.__printed = h }, close() {} }, focus() {}, print() {} } }
  })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 150)) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 150)))
  const shot = async (n) => { await sleep(500); await page.screenshot({ path: `${OUT}\\${n}.png` }); console.log('shot', n) }

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' }); await sleep(500)
  await click(page, 'Doctor', 'button'); await sleep(2500)
  await click(page, 'AI Assistant', 'a'); await sleep(1500)
  await ask(page, 'Draft a prescription for Aarav Sharma')
  await shot('v3-m1-draft')
  await clickMaybe(page, 'Print', 'button'); await sleep(500)
  const html = await page.evaluate(() => window.__printed || '')
  console.log('printed doc length:', html.length)
  console.log('has Prescription header:', html.includes('Prescription'))
  console.log('has patient (Aarav):', html.includes('Aarav'))
  console.log('has e-signature:', html.includes('Dr. Priya Nair, MBBS MD'))
  await browser.close()
  console.log('ERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
