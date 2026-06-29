// Comprehensive review walk over everything built this session:
// Radiology v2 · Emergency v2 · OT v2 · Discharge v2 · Insurance v2 · Audit v2
// Pure read-only walk — no actions; checks rendering + content + console-error sweep.
const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const has = (page, t) => page.evaluate((x) => document.body.innerText.includes(x), t)
async function clickMaybe(page, text, sel = 'button, a') {
  return page.evaluate((t, sel) => { const el = [...document.querySelectorAll(sel)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t) && !e.disabled); if (el) { el.click(); return true } return false }, text, sel)
}
async function navClick(page, label, sel = 'a, button', tries = 30) { for (let i = 0; i < tries; i++) { if (await clickMaybe(page, label, sel)) { await sleep(700); return true } await sleep(200) } return false }
async function clickAria(page, label) { return page.evaluate((l) => { const el = [...document.querySelectorAll('button,a')].find(e => e.getAttribute('aria-label') === l); if (el) { el.click(); return true } return false }, label) }
async function selectRole(page, tab, role, confirmText) {
  for (let i = 0; i < 60; i++) { if (tab) await clickMaybe(page, tab, 'button'); await clickMaybe(page, role, 'button'); await sleep(450); if (await has(page, confirmText)) { await sleep(800); return } }
  throw new Error('login did not reach portal: ' + role)
}
async function bodyStats(page) {
  return page.evaluate(() => { const t = document.body.innerText; return { length: t.length, lines: t.split('\n').length } })
}

;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  page.setDefaultNavigationTimeout(60000)
  await page.setViewport({ width: 1500, height: 1000, deviceScaleFactor: 1 })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 180)) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 180)))
  const shot = async (n) => { await sleep(500); await page.screenshot({ path: `${OUT}\\${n}.png` }); console.log('shot', n) }
  const audit = async (label) => { const s = await bodyStats(page); console.log(`AUDIT ${label}: ${s.length} chars · ${s.lines} lines`) }

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(2500)

  // ── Radiology v2 ──────────────────────────────────────────────────────
  console.log('\n=== RADIOLOGY v2 ===')
  await selectRole(page, 'Clinical', 'Radiology', 'Inbox')
  await navClick(page, 'Inbox'); await sleep(1000); await audit('rad/inbox'); await shot('sess-rad-inbox')
  await navClick(page, 'Modality Bench'); await sleep(1000); await audit('rad/bench'); await shot('sess-rad-bench')
  await navClick(page, 'Reading Room'); await sleep(1000); await audit('rad/reading'); await shot('sess-rad-reading')
  await navClick(page, 'Verification'); await sleep(1000); await audit('rad/verification'); await shot('sess-rad-verification')
  await navClick(page, 'RIS Overview'); await sleep(1000); await audit('rad/dashboard'); await shot('sess-rad-overview')

  // ── Emergency v2 ──────────────────────────────────────────────────────
  console.log('\n=== EMERGENCY v2 ===')
  await clickAria(page, 'Log out'); await sleep(1200)
  await selectRole(page, 'Clinical', 'Emergency', 'Triage')
  await navClick(page, 'Triage'); await sleep(1000); await audit('er/triage'); await shot('sess-er-triage')
  await navClick(page, 'ER Floor'); await sleep(1000); await audit('er/floor'); await shot('sess-er-floor')
  await navClick(page, 'ER Overview'); await sleep(1000); await audit('er/dashboard'); await shot('sess-er-overview')

  // ── OT v2 ─────────────────────────────────────────────────────────────
  console.log('\n=== OT v2 ===')
  await clickAria(page, 'Log out'); await sleep(1200)
  await selectRole(page, 'Operations', 'Operation Theater', 'Pre-Op Checklist')
  await navClick(page, 'Pre-Op Checklist'); await sleep(1000); await audit('ot/checklist'); await shot('sess-ot-checklist')

  // ── Discharge + Patient cross-panel ───────────────────────────────────
  console.log('\n=== DISCHARGE v2 ===')
  await clickAria(page, 'Log out'); await sleep(1200)
  await selectRole(page, 'Operations', 'Discharge', 'Discharge Queue')
  await navClick(page, 'Discharge Queue'); await sleep(1000); await audit('discharge/dashboard'); await shot('sess-dc-dashboard')
  // Patient view
  await clickAria(page, 'Log out'); await sleep(1200)
  await selectRole(page, 'Patient', 'Patient Portal', 'My Health Story')
  await navClick(page, 'My Discharge'); await sleep(1000); await audit('patient/discharge'); await shot('sess-patient-discharge')
  await navClick(page, 'Insurance'); await sleep(1000); await audit('patient/insurance'); await shot('sess-patient-insurance')
  await navClick(page, 'Radiology'); await sleep(1000); await audit('patient/radiology'); await shot('sess-patient-radiology')

  // ── Audit v2 ──────────────────────────────────────────────────────────
  console.log('\n=== AUDIT v2 ===')
  await clickAria(page, 'Log out'); await sleep(1200)
  await selectRole(page, 'Support Services', 'Audit', 'Compliance Overview')
  await audit('audit/dashboard'); await shot('sess-audit-dashboard')
  await navClick(page, 'Audit Trail'); await sleep(1000); await audit('audit/log'); await shot('sess-audit-log')
  await navClick(page, 'Compliance Reports'); await sleep(1000); await audit('audit/reports'); await shot('sess-audit-reports')

  await browser.close()
  console.log('\n=== ERRORS(' + errors.length + ') ===')
  errors.forEach(e => console.log('  ', e))
  console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
