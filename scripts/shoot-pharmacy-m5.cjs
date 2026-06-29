const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const has = (page, t) => page.evaluate((x) => document.body.innerText.includes(x), t)
async function clickMaybe(page, text, sel = 'button, a') {
  return page.evaluate((t, sel) => { const el = [...document.querySelectorAll(sel)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t) && !e.disabled); if (el) { el.click(); return true } return false }, text, sel)
}
async function navClick(page, label, sel = 'a, button', tries = 30) { for (let i = 0; i < tries; i++) { if (await clickMaybe(page, label, sel)) { await sleep(700); return true } await sleep(200) } throw new Error('nav not found: ' + label) }
async function clickAria(page, label) { return page.evaluate((l) => { const el = [...document.querySelectorAll('button,a')].find(e => e.getAttribute('aria-label') === l); if (el) { el.click(); return true } return false }, label) }
async function selectRole(page, tab, role, confirmText) {
  for (let i = 0; i < 60; i++) { if (tab) await clickMaybe(page, tab, 'button'); await clickMaybe(page, role, 'button'); await sleep(450); if (await has(page, confirmText)) { await sleep(800); return } }
  throw new Error('login did not reach portal: ' + role)
}
async function clickFirstQueuePatient(page) {
  return page.evaluate(() => { const btn = [...document.querySelectorAll('button')].find(b => /^#\d/.test((b.textContent || '').trim())); if (btn) { btn.click(); return (btn.textContent || '').trim().slice(0, 30) } return false })
}
;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  page.setDefaultNavigationTimeout(60000)
  await page.setViewport({ width: 1500, height: 1000, deviceScaleFactor: 1 })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 160)) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 160)))
  const shot = async (n) => { await sleep(500); await page.screenshot({ path: `${OUT}\\${n}.png` }); console.log('shot', n) }

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(2200)

  // 1) Pharmacy KPI overview
  await selectRole(page, null, 'Pharmacy', 'Prescription Queue')
  await navClick(page, 'Overview'); await sleep(1100)
  console.log('overview KPI Unclaimed:', await has(page, 'Unclaimed'))
  console.log('overview KPI Out of stock:', await has(page, 'Out of stock'))
  console.log('overview Collected today:', await has(page, 'Collected today'))
  console.log('overview Queue by source:', await has(page, 'Queue by source'))
  console.log('overview Stock & procurement:', await has(page, 'Stock & procurement'))
  await shot('m5-overview')

  // 2) Patient panel — out-of-stock badge on own order
  await clickAria(page, 'Log out'); await sleep(1200)
  await selectRole(page, 'Patient', 'Patient Portal', 'My Health Story')
  await navClick(page, 'Pharmacy'); await sleep(1200)
  console.log('patient: your pharmacy orders:', await has(page, 'Your pharmacy orders'))
  console.log('patient: out-of-stock badge (not in stock):', await has(page, 'not in stock'))
  console.log('patient: unavailable note:', await has(page, 'aren’t stocked') || await has(page, "aren't stocked"))
  await shot('m5-patient')

  // 3) Doctor panel — stock alerts + advise buy outside
  await clickAria(page, 'Log out'); await sleep(1200)
  await selectRole(page, null, 'Doctor', "Today's Queue")
  console.log('selected queue patient:', await clickFirstQueuePatient(page)); await sleep(1200)
  console.log('doctor: Pharmacy stock alerts card:', await has(page, 'Pharmacy stock alerts'))
  console.log('doctor: lists OOS drug (Amoxicillin):', await has(page, 'Amoxicillin'))
  console.log('advise buy outside:', await clickMaybe(page, 'Advise buy outside', 'button')); await sleep(800)
  console.log('doctor: recorded (Advised — buy outside):', await has(page, 'Advised'))
  await shot('m5-doctor')

  await browser.close()
  console.log('ERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
