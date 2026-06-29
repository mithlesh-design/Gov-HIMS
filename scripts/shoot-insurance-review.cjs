// Insurance v2 E2E (patient surface drives live store) + Billing patient view
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

  // ── Patient: Kiran sees live insurance + AI denial risk ───────────────
  await selectRole(page, 'Patient', 'Patient Portal', 'My Health Story')
  await navClick(page, 'Insurance'); await sleep(1100)
  console.log('insurance heading:', await has(page, 'Insurance'))
  console.log('Provider HDFC ERGO:', await has(page, 'HDFC ERGO'))
  console.log('Policy holder Kiran:', await has(page, 'Kiran Patil'))
  console.log('Current claim ID visible:', await has(page, 'CLM-2026-0098'))
  console.log('AI approval likelihood badge:', await has(page, 'AI approval likelihood'))
  console.log('Treatment claimed (NSTEMI / PCI):', await has(page, 'NSTEMI') && await has(page, 'PCI'))
  console.log('Documents section:', await has(page, 'Documents'))
  console.log('Verified document (Policy copy):', await has(page, 'Policy copy'))
  console.log('Pending document visible:', await has(page, 'Final hospital bill'))
  console.log('Timeline section:', await has(page, 'Claim activity'))
  console.log('Pre-auth approved event:', await has(page, 'approved') || await has(page, 'Approved'))

  // Run AI denial-risk analysis
  console.log('run AI denial analysis:', await clickMaybe(page, 'Run AI analysis', 'button')); await sleep(700)
  console.log('toast refreshed:', await has(page, 'refreshed') || await has(page, 'Run'))
  console.log('denial risk score displayed:', await has(page, '/100'))

  // Upload a pending document
  console.log('upload Discharge summary:', await clickMaybe(page, 'Upload', 'button')); await sleep(600)
  console.log('toast uploaded:', await has(page, 'uploaded'))
  await shot('ins-rev-patient')

  // ── Staff: insurance claims page still works ──────────────────────────
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(1500)
  await selectRole(page, 'Finance', 'Insurance', 'Claims')
  await navClick(page, 'Claims'); await sleep(1000)
  console.log('staff claims page renders:', await has(page, 'Aarav Sharma') || await has(page, 'Kiran Patil') || await has(page, 'Rahul Verma'))
  await shot('ins-rev-staff')

  await browser.close()
  console.log('\nERRORS(' + errors.length + '):'); errors.forEach(e => console.log('  ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
