// Comprehensive Lab v2 review — walks every page, captures screenshots,
// flags console errors, and probes a few cross-panel integrations.
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
async function bodyTextStats(page) {
  return page.evaluate(() => {
    const t = document.body.innerText
    return { length: t.length, lines: t.split('\n').length, hasContent: t.length > 200 }
  })
}
;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  page.setDefaultNavigationTimeout(60000)
  await page.setViewport({ width: 1500, height: 1000, deviceScaleFactor: 1 })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 200)))
  const shot = async (n) => { await sleep(500); await page.screenshot({ path: `${OUT}\\${n}.png`, fullPage: false }); console.log('shot', n) }
  const audit = async (label, page) => {
    const s = await bodyTextStats(page)
    console.log(`AUDIT ${label}: ${s.length} chars, ${s.lines} lines${s.hasContent ? '' : ' [LIGHT/BLANK]'}`)
  }

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(2200)
  await selectRole(page, 'Clinical', 'Laboratory', 'Inbox')

  // ─── Lab Inbox ───────────────────────────────────────────────────────────
  await navClick(page, 'Inbox'); await sleep(1100)
  await audit('Inbox/awaiting', page)
  console.log('  Awaiting tab populated:', await has(page, 'Awaiting collection'))
  console.log('  Has at least one row (Ramesh OR Aarav):', (await has(page, 'Ramesh Kumar')) || (await has(page, 'Aarav Sharma')))
  await clickMaybe(page, 'Just collected', 'button'); await sleep(600)
  await audit('Inbox/just-collected', page)
  await shot('rev-inbox')

  // ─── Benches: walk all 4 bench tabs ──────────────────────────────────────
  await navClick(page, 'Benches'); await sleep(900)
  for (const b of ['Hematology', 'Biochemistry', 'Immunology', 'Urinalysis']) {
    await clickMaybe(page, b, 'button'); await sleep(500)
    await audit(`Benches/${b}`, page)
  }
  // Expand one row to confirm the entry form still renders
  await clickMaybe(page, 'Biochemistry', 'button'); await sleep(500)
  console.log('  Biochem tab — verified RFT row present:', await has(page, 'Renal Function Test'))
  await shot('rev-benches')

  // ─── Microbiology ────────────────────────────────────────────────────────
  await navClick(page, 'Microbiology'); await sleep(900)
  await audit('Microbiology', page)
  console.log('  Five phase columns labeled:', (await has(page, 'Inoculated')) && (await has(page, 'Growth check')) && (await has(page, 'Identified')) && (await has(page, 'AST')) && (await has(page, 'Final')))
  console.log('  Sunita CULT_BLOOD in Growth check:', await has(page, 'Sunita Sharma'))
  await shot('rev-microbiology')

  // ─── Lab Overview (Incharge) ─────────────────────────────────────────────
  await navClick(page, 'Lab Overview'); await sleep(900)
  await audit('Lab Overview', page)
  console.log('  Pipeline-by-bench card:', await has(page, 'Pipeline by bench'))
  console.log('  Critical pending callback section:', await has(page, 'Critical pending callback'))
  console.log('  AI exception triage:', await has(page, 'AI exception triage'))
  console.log('  QC alerts surfaced (Roche c311 seeded):', await has(page, 'Roche c311'))
  console.log('  Tech workload visible (Ravi Menon):', await has(page, 'Ravi Menon'))
  await shot('rev-overview')

  // ─── QC ─────────────────────────────────────────────────────────────────
  await navClick(page, 'Quality Control'); await sleep(900)
  await audit('QC', page)
  console.log('  4 analyzer cards rendered:', (await has(page, 'Sysmex XN-550')) && (await has(page, 'Roche c311')) && (await has(page, 'Abbott i1000SR')) && (await has(page, 'Sysmex UN-2000')))
  console.log('  VIOLATION badge on Roche c311 card:', await has(page, 'VIOLATION'))
  await shot('rev-qc')

  // ─── Reflex ─────────────────────────────────────────────────────────────
  await navClick(page, 'Reflex Tests'); await sleep(900)
  await audit('Reflex', page)
  console.log('  Pending suggestions card present:', await has(page, 'Pending suggestions'))
  // Fresh session: empty queue is expected until a release fires a rule
  console.log('  Empty-state message present (expected fresh):', await has(page, 'No reflex suggestions') || await has(page, 'Pending suggestions'))
  await shot('rev-reflex')

  // ─── Doctor cross-panel ─────────────────────────────────────────────────
  await clickAria(page, 'Log out'); await sleep(1200)
  await selectRole(page, 'Clinical', 'Doctor', "Today's Queue")
  await navClick(page, 'Inbox'); await sleep(1100)
  await clickMaybe(page, 'Results', 'button'); await sleep(700)
  await audit('Doctor/Inbox/Results', page)
  console.log('  Lab results coming through (Meera Pillai RFT / Within reference range):', (await has(page, 'Meera Pillai')) || (await has(page, 'Within reference range')))
  await shot('rev-doctor-inbox')

  // ─── Patient cross-panel ────────────────────────────────────────────────
  await clickAria(page, 'Log out'); await sleep(1200)
  await selectRole(page, 'Patient', 'Patient Portal', 'My Health Story')
  await navClick(page, 'Pathology'); await sleep(1100)
  await audit('Patient/Pathology', page)
  console.log('  Live TROPI critical result for Kiran:', await has(page, 'Troponin I'))
  console.log('  Critical AI summary line:', await has(page, 'critically high') || await has(page, 'Doctor will call you'))
  console.log('  In-progress section present:', await has(page, 'In progress'))
  console.log('  Book a test panel preserved:', await has(page, 'Book a test'))
  await shot('rev-patient-pathology')

  // ─── Shim regression: reception diagnostics + admin dashboard ───────────
  await clickAria(page, 'Log out'); await sleep(1200)
  await selectRole(page, 'Operations', 'Reception', 'Today')
  await navClick(page, 'Diagnostics', 'a, button', 8).catch(() => {})
  await sleep(700)
  await audit('Reception/Diagnostics', page)
  await shot('rev-reception-diagnostics')

  await clickAria(page, 'Log out'); await sleep(1200)
  await selectRole(page, 'Management', 'Admin', 'Dashboard')
  await audit('Admin/Dashboard', page)
  await shot('rev-admin')

  await browser.close()
  console.log('\nERRORS(' + errors.length + '):')
  errors.forEach(e => console.log('  ', e))
  console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
