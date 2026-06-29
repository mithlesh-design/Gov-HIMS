const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickMaybe(page, text, sel = 'button, a') {
  return page.evaluate((t, sel) => { const el = [...document.querySelectorAll(sel)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t) && !e.disabled); if (el) { el.click(); return true } return false }, text, sel)
}
async function navClick(page, label, sel = 'a, button', tries = 30) { for (let i = 0; i < tries; i++) { if (await clickMaybe(page, label, sel)) { await sleep(800); return } await sleep(200) } throw new Error('nav not found: ' + label) }
const has = (page, t) => page.evaluate((x) => document.body.innerText.includes(x), t)
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
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 150)) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 150)))
  const shot = async (n) => { await sleep(500); await page.screenshot({ path: `${OUT}\\${n}.png` }); console.log('shot', n) }

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(2200)
  await selectRole(page, null, 'Nurse', 'Ward Dashboard')

  // Handover — auto-compiled from the real ward
  await navClick(page, 'Handover Brief'); await sleep(1500)
  console.log('handover references real ward (Sunita Devi):', await has(page, 'Sunita Devi'))
  console.log('handover references Kiran Patil:', await has(page, 'Kiran Patil'))
  console.log('handover SBAR format (S:/B:/A:/R:):', await has(page, 'S:') && await has(page, 'R:'))
  console.log('handover diagnosis grounded (Sepsis):', await has(page, 'Sepsis'))
  await shot('nurse-m9-handover')
  await clickMaybe(page, 'Sign & save handover', 'button'); await sleep(800)
  console.log('handover signed + audited:', await has(page, 'audited'))

  // Patient detail — roster card opens detail view
  await navClick(page, 'My Patients'); await sleep(1200)
  await clickMaybe(page, 'Sunita Devi', 'a'); await sleep(1500)
  console.log('detail: vitals trend section:', await has(page, 'Vitals trend'))
  console.log('detail: medication section:', await has(page, 'Medication (today)'))
  console.log('detail: fluid balance section:', await has(page, 'Fluid balance'))
  console.log('detail: notes & events section:', await has(page, 'Recent notes & events'))
  console.log('detail: shows NEWS:', await has(page, 'NEWS'))
  console.log('detail: shows diagnosis (Sepsis):', await has(page, 'Sepsis'))
  await shot('nurse-m9-detail')

  // Responsive — 390px on the detail page, no horizontal overflow
  await page.setViewport({ width: 390, height: 850, deviceScaleFactor: 1 })
  await sleep(1000)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  console.log('no horizontal overflow at 390px (overflow px):', overflow, '→', overflow <= 3)
  await shot('nurse-m9-mobile')

  await browser.close()
  console.log('ERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
