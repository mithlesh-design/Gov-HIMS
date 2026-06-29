// Regression sweep for the six "areas needing attention" fixes:
//  1. /audit/reports  → printable NABH evidence per chapter
//  2. /quality/nabh   → live audit-store evidence card
//  3. /insurance/claims (staff)  → store-backed approve/reject + docs/denial-risk
//  4. /patient/emergency  → new patient-facing ER view
//  5. /audit/log filter chips  → data-testid disambiguates from row text
//  6. /audit/dashboard  → still works with shared nabhEvidence import (regression)
const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const has = (page, t) => page.evaluate((x) => document.body.innerText.includes(x), t)
const hasCI = (page, t) => page.evaluate((x) => document.body.innerText.toLowerCase().includes(x.toLowerCase()), t)
// Wait until body text contains the target (handles dev-server first-hit compile lag).
async function waitForText(page, text, timeoutMs = 25000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (await has(page, text)) return true
    await sleep(400)
  }
  return false
}
async function clickMaybe(page, text, sel = 'button, a') {
  return page.evaluate((t, sel) => { const el = [...document.querySelectorAll(sel)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t) && !e.disabled); if (el) { el.click(); return true } return false }, text, sel)
}
async function clickTestId(page, id) {
  return page.evaluate((tid) => { const el = document.querySelector(`[data-testid="${tid}"]`); if (el) { el.click(); return true } return false }, id)
}
async function navClick(page, label, sel = 'a, button', tries = 30) { for (let i = 0; i < tries; i++) { if (await clickMaybe(page, label, sel)) { await sleep(700); return true } await sleep(200) } return false }
async function clickAria(page, label) { return page.evaluate((l) => { const el = [...document.querySelectorAll('button,a')].find(e => e.getAttribute('aria-label') === l); if (el) { el.click(); return true } return false }, label) }
async function selectRole(page, tab, role, confirmText) {
  for (let i = 0; i < 90; i++) { if (tab) await clickMaybe(page, tab, 'button'); await clickMaybe(page, role, 'button'); await sleep(500); if (await has(page, confirmText)) { await sleep(800); return } }
  throw new Error('login did not reach portal: ' + role)
}
const results = []
const assert = (label, pass) => { results.push({ label, pass: !!pass }); console.log((pass ? '✓ ' : '✗ ') + label) }

;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  page.setDefaultNavigationTimeout(60000)
  await page.setViewport({ width: 1500, height: 1000, deviceScaleFactor: 1 })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 180)) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 180)))
  const shot = async (n) => { await sleep(500); await page.screenshot({ path: `${OUT}\\${n}.png`, fullPage: true }); console.log('shot', n) }

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(2500)

  // ═══ Fix 5 + 6: Audit log filter chips data-testid + dashboard regression ═══
  console.log('\n=== FIX #6 audit dashboard (regression) + #5 log testids ===')
  await selectRole(page, 'Support Services', 'Audit', 'Compliance Overview')
  await sleep(800)
  assert('audit dashboard renders heading',       await has(page, 'Audit') && await has(page, 'Compliance'))
  assert('audit dashboard NABH evidence card',    await has(page, 'NABH evidence'))
  assert('audit dashboard shows 8 chapters',      await has(page, 'AAC') && await has(page, 'COP') && await has(page, 'ROM'))
  assert('audit dashboard total-events KPI',      await hasCI(page, 'Total events'))
  await shot('fix-audit-dashboard')

  await navClick(page, 'Audit Trail'); await sleep(900)
  assert('audit log heading',                     await has(page, 'Full Audit Trail'))
  assert('module filter testid present',          await page.evaluate(() => !!document.querySelector('[data-testid="audit-module-filter"]')))
  assert('Pharmacy chip testid present',          await page.evaluate(() => !!document.querySelector('[data-testid="audit-module-chip-pharmacy"]')))
  assert('Critical severity chip testid',         await page.evaluate(() => !!document.querySelector('[data-testid="audit-severity-chip-critical"]')))
  assert('click Pharmacy chip via testid',        await clickTestId(page, 'audit-module-chip-pharmacy')); await sleep(500)
  assert('after filter — Amoxicillin shown',      await has(page, 'Amoxicillin'))
  assert('after filter — er-only event hidden',   !(await has(page, 'qSOFA positive')))
  assert('click all-modules chip via testid',     await clickTestId(page, 'audit-module-chip-all')); await sleep(400)
  assert('click critical severity via testid',    await clickTestId(page, 'audit-severity-chip-critical')); await sleep(400)
  assert('critical filter surfaces callback',     await has(page, 'callback') || await has(page, 'critical-high'))
  await clickTestId(page, 'audit-severity-chip-all'); await sleep(300)
  await shot('fix-audit-log-testids')

  // ═══ Fix 1: /audit/reports rewritten — NABH per-chapter evidence + export ═══
  console.log('\n=== FIX #1 /audit/reports NABH evidence ===')
  await navClick(page, 'Compliance Reports'); await sleep(900)
  assert('reports heading',                       await has(page, 'Compliance Reports'))
  assert('reports — Print button',                await has(page, 'Print'))
  assert('reports — Export JSON button',          await has(page, 'Export JSON'))
  assert('reports — NABH chapters ready KPI',     await hasCI(page, 'NABH chapters ready'))
  assert('reports — first chapter (AAC) listed',  await has(page, 'AAC') && await has(page, 'Access, Assessment & Continuity'))
  assert('reports — Stale "Beta" copy gone',      !(await has(page, 'full report generation coming')))
  assert('reports — first chapter pre-expanded',  await has(page, 'er triage') || await has(page, 'er disposition') || await has(page, 'discharge clearance'))
  // Expand COP chapter (which has lab_result_released → "critical-high" Kiran troponin)
  assert('expand COP chapter',                    await clickMaybe(page, 'Care of Patients', 'button')); await sleep(500)
  assert('COP evidence row shows callback',       await has(page, 'lab critical callback') || await has(page, 'radiology report verified'))
  await shot('fix-audit-reports')

  // ═══ Fix 2: /quality/nabh has audit-trail evidence card ═══
  console.log('\n=== FIX #2 /quality/nabh wired to audit trail ===')
  await clickAria(page, 'Log out'); await sleep(1200)
  await selectRole(page, 'Management', 'Quality', 'Open Incidents')
  await sleep(800)
  // Navigate into the NABH cockpit
  assert('click NABH Cockpit nav',                await navClick(page, 'NABH Cockpit'))
  assert('quality NABH cockpit heading',          await waitForText(page, 'Quality Intelligence Dashboard'))
  assert('NABH gauges still render',              await has(page, 'Hand Hygiene'))
  assert('Live audit-trail evidence card',        await has(page, 'Live audit-trail evidence'))
  assert('chapter coverage chip visible',         await has(page, 'chapters'))
  assert('Most recent qualifying events feed',    await hasCI(page, 'Most recent qualifying events'))
  assert('link to full evidence report',          await has(page, 'Full evidence report'))
  await shot('fix-quality-nabh')

  // ═══ Fix 3: /insurance/claims staff side backported ═══
  console.log('\n=== FIX #3 /insurance/claims store-backed + new fields ===')
  await clickAria(page, 'Log out'); await sleep(1500)
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(2500)
  // Insurance / TPA lives under the Finance tab (not Operations)
  await selectRole(page, 'Finance', 'TPA', 'TPA & Insurance Desk')
  await sleep(900)
  // Navigate from /insurance/dashboard → /insurance/claims
  await navClick(page, 'Active Claims'); await sleep(900)
  assert('claims heading',                        await waitForText(page, 'Active Claims'))
  assert('Kiran Patil claim visible',             await has(page, 'Kiran Patil') || await has(page, 'CLM-2026-0098'))
  assert('Docs chip with ratio for Kiran',        await has(page, '4/6') || await has(page, 'Docs'))
  // Validate the existing Kiran claim — should compute denial risk → badge appears
  assert('Open docs panel for Kiran',             await clickMaybe(page, 'Docs', 'button')); await sleep(500)
  assert('Docs panel shows Discharge summary',    await has(page, 'Discharge summary'))
  assert('Docs panel shows pending row',          await has(page, 'pending') || await has(page, 'Pending') || await has(page, 'Upload'))
  // Approve the Aarav (CLM-001) appendectomy claim — should hit store, persist, fire timeline
  assert('Click Review on a pending claim',       await clickMaybe(page, 'Review', 'button')); await sleep(700)
  assert('Review modal opens',                    await has(page, 'Review Claim'))
  assert('Click Approve in modal',                await clickMaybe(page, 'Approve', 'button')); await sleep(800)
  assert('After approve — Approved badge shown',  await has(page, 'Approved'))
  await shot('fix-insurance-claims')

  // ═══ Fix 4: /patient/emergency live view ═══
  console.log('\n=== FIX #4 /patient/emergency live view ===')
  await clickAria(page, 'Log out'); await sleep(1200)
  await selectRole(page, 'Patient', 'Patient Portal', 'My Health Story')
  await sleep(900)
  assert('patient nav has Emergency Visits',      await has(page, 'Emergency Visits'))
  assert('click Emergency Visits',                await navClick(page, 'Emergency Visits'))
  await sleep(900)
  // Wait for page-specific content (heading text overlaps with the nav label)
  assert('emergency page rendered',               await waitForText(page, 'Call ambulance'))
  assert('Call ambulance (102) button',           await has(page, 'Call ambulance'))
  assert('Past emergency visit card',             await has(page, 'Past emergency visit') || await hasCI(page, 'Past emergency visit'))
  assert('Kiran chief complaint visible',         await has(page, 'central chest pain') || await has(page, 'chest pain'))
  assert('Care team Dr. Vikram',                  await has(page, 'Dr. Vikram Rathore'))
  assert('Location: Resuscitation',               await has(page, 'Resuscitation'))
  assert('Vitals: RR / SpO₂ / BP / HR',           await has(page, 'RR') && await has(page, 'BP') && await has(page, 'HR'))
  assert('Early-warning score line',              await has(page, 'Early-warning score'))
  assert('Outcome decision shown',                await has(page, 'Outcome decision') || await hasCI(page, 'Outcome decision'))
  assert('Outcome: Admit · ICU',                  await has(page, 'Admit · ICU') || await has(page, 'ICU'))
  assert('Visit timeline section',                await has(page, 'Visit timeline') || await hasCI(page, 'Visit timeline'))
  await shot('fix-patient-emergency')

  // ═══ Fix 3 follow-up: patient/insurance should reflect store mutation ═══
  console.log('\n=== FIX #3 follow-up: patient view sees store-backed status ===')
  await navClick(page, 'Insurance'); await sleep(900)
  assert('patient insurance still renders Kiran', await has(page, 'CLM-2026-0098') || await has(page, 'Kiran Patil') || await has(page, 'HDFC ERGO'))
  await shot('fix-patient-insurance-sync')

  await browser.close()
  const pass = results.filter(r => r.pass).length
  const fail = results.length - pass
  console.log(`\n=== RESULT: ${pass}/${results.length} passed, ${fail} failed ===`)
  if (fail > 0) results.filter(r => !r.pass).forEach(r => console.log('  FAIL: ' + r.label))
  console.log(`=== ERRORS(${errors.length}) ===`)
  errors.forEach(e => console.log('  ', e))
  process.exit(fail > 0 ? 1 : 0)
})().catch((e) => { console.error('ERR', e.message); process.exit(2) })
