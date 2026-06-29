const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickMaybe(page, text, sel = 'button, a') {
  return page.evaluate((t, sel) => { const el = [...document.querySelectorAll(sel)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t) && !e.disabled); if (el) { el.click(); return true } return false }, text, sel)
}
async function click(page, text, sel = 'button, a', tries = 30) { for (let i = 0; i < tries; i++) { if (await clickMaybe(page, text, sel)) { await sleep(250); return } await sleep(200) } throw new Error('not found: ' + text) }
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
// Is the "Bed Availability" nav link on-screen (sidebar open) or off-canvas (closed)?
const navOnScreen = (page) => page.evaluate(() => { const a = [...document.querySelectorAll('a')].find(e => (e.textContent || '').includes('Bed Availability')); if (!a) return false; const r = a.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth })
;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 150)) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 150)))
  const shot = async (n) => { await sleep(500); await page.screenshot({ path: `${OUT}\\${n}.png` }); console.log('shot', n) }

  // Login at desktop, then shrink to phone
  await page.setViewport({ width: 1400, height: 1000, deviceScaleFactor: 1 })
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' }); await sleep(500)
  await click(page, 'Doctor', 'button'); await sleep(2500)

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 })
  await sleep(800)
  console.log('phone h-overflow:', await overflow(page))
  console.log('sidebar off-canvas when closed (nav hidden):', !(await navOnScreen(page)))
  await shot('v3-m8-phone-closed')

  // Open the drawer via hamburger
  await clickMaybe(page, '', 'button[aria-label="Open menu"]'); await sleep(600)
  console.log('drawer opens (nav on-screen):', await navOnScreen(page))
  await shot('v3-m8-phone-open')

  await browser.close()
  console.log('ERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
