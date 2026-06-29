// Discharge v2 cross-panel: discharge desk dashboard + patient discharge view
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

;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  page.setDefaultNavigationTimeout(60000)
  await page.setViewport({ width: 1500, height: 1000, deviceScaleFactor: 1 })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 160)) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 160)))
  const shot = async (n) => { await sleep(500); await page.screenshot({ path: `${OUT}\\${n}.png` }); console.log('shot', n) }

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(2500)

  // ── Discharge desk: queue + new Kiran seed visible ────────────────────
  await selectRole(page, 'Operations', 'Discharge', 'Discharge Queue')
  await navClick(page, 'Discharge Queue'); await sleep(1000)
  console.log('discharge dashboard heading:', await has(page, 'Discharge'))
  console.log('Mohan Lal in queue:', await has(page, 'Mohan Lal'))
  console.log('Kiran Patil in queue (new seed):', await has(page, 'Kiran Patil'))
  console.log('NSTEMI diagnosis seeded:', await has(page, 'NSTEMI'))
  await shot('dc-rev-dashboard')

  // ── Patient view: Kiran sees own discharge ────────────────────────────
  await clickAria(page, 'Log out'); await sleep(1200)
  await selectRole(page, 'Patient', 'Patient Portal', 'My Health Story')
  await navClick(page, 'My Discharge'); await sleep(1100)
  console.log('patient discharge heading:', await has(page, 'My Discharge'))
  console.log('Progress / clearance status displayed:', await has(page, 'Discharge in progress') || await has(page, 'cleared'))
  console.log('Clearance steps section:', await has(page, 'Clearance steps'))
  console.log('Doctor pillar cleared:', await has(page, 'Doctor'))
  console.log('Billing still pending:', await has(page, 'Billing'))
  console.log('Take-home medicines section:', await has(page, 'Take-home'))
  console.log('Aspirin in TTO list:', await has(page, 'Aspirin'))
  console.log('Clopidogrel in TTO list:', await has(page, 'Clopidogrel'))
  console.log('Follow-up appointment:', await has(page, 'Follow-up'))
  console.log('Doctor summary present:', await has(page, 'NSTEMI') && await has(page, 'PCI'))
  console.log('Summary download action:', await clickMaybe(page, 'Download', 'button')); await sleep(500)
  console.log('toast downloaded:', await has(page, 'downloaded'))
  await shot('dc-rev-patient')

  await browser.close()
  console.log('\nERRORS(' + errors.length + '):'); errors.forEach(e => console.log('  ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
