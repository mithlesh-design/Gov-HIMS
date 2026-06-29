// Regression sweep for the final-leg builds:
//  1. Billing v2 — AI duplicate audit + freeze action
//  2. Reception v2 — OPD queue advance (audit emit verified later)
//  3. Patient Bloodbank v2 — live cross-match record for Kiran Patil
//  4. Admin Analytics — operations snapshot from audit trail
const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const has = (page, t) => page.evaluate((x) => document.body.innerText.includes(x), t)
const hasCI = (page, t) => page.evaluate((x) => document.body.innerText.toLowerCase().includes(x.toLowerCase()), t)
async function waitForCI(page, text, timeoutMs = 35000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) { if (await hasCI(page, text)) return true; await sleep(400) }
  return false
}
async function clickMaybe(page, text, sel = 'button, a') {
  return page.evaluate((t, sel) => { const el = [...document.querySelectorAll(sel)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t) && !e.disabled); if (el) { el.click(); return true } return false }, text, sel)
}
async function navClick(page, label, sel = 'a, button', tries = 30) { for (let i = 0; i < tries; i++) { if (await clickMaybe(page, label, sel)) { await sleep(800); return true } await sleep(200) } return false }
async function clickAria(page, label) { return page.evaluate((l) => { const el = [...document.querySelectorAll('button,a')].find(e => e.getAttribute('aria-label') === l); if (el) { el.click(); return true } return false }, label) }
async function selectRole(page, tab, role, confirmText) {
  for (let i = 0; i < 150; i++) { if (tab) await clickMaybe(page, tab, 'button'); await clickMaybe(page, role, 'button'); await sleep(500); if (await hasCI(page, confirmText)) { await sleep(800); return } }
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

  // ═══ Billing v2 ════════════════════════════════════════════════════════
  console.log('\n=== BILLING v2 ===')
  await selectRole(page, 'Finance', 'Billing', 'Outstanding Balance')
  assert('Billing dashboard',           await waitForCI(page, 'Daily Revenue'))
  assert('Outstanding KPI present',     await hasCI(page, 'Outstanding Balance'))
  assert('AI Duplicate Flags KPI',      await hasCI(page, 'AI Duplicate Flags'))
  assert('Kiran Patil bill visible',    await hasCI(page, 'Kiran Patil'))
  // Freeze Kiran's draft bill
  assert('click Freeze',                await clickMaybe(page, 'Freeze', 'button'))
  await sleep(800)
  assert('after freeze — frozen status', await hasCI(page, 'frozen'))
  await shot('final-billing')

  // ═══ Reception v2 ══════════════════════════════════════════════════════
  console.log('\n=== RECEPTION v2 ===')
  await clickAria(page, 'Log out'); await sleep(1500)
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(1800)
  await selectRole(page, 'Operations', 'Reception', 'front desk')
  await navClick(page, 'OPD Queue')
  await sleep(1500)
  assert('OPD queue page',              await waitForCI(page, 'Waiting Room'))
  assert('Triage column present',       await hasCI(page, 'Triage'))
  // Advance a patient through the queue (Send to Vitals on first waiting card)
  assert('click Send to Vitals',        await clickMaybe(page, 'Send to Vitals', 'button'))
  await sleep(800)
  await shot('final-reception-opd')

  // ═══ Patient Bloodbank v2 ═════════════════════════════════════════════
  console.log('\n=== PATIENT BLOODBANK v2 ===')
  await clickAria(page, 'Log out'); await sleep(1500)
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(1800)
  await selectRole(page, 'Patient', 'Patient Portal', 'My Health Story')
  await navClick(page, 'Blood Bank'); await sleep(900)
  assert('Patient blood bank page',     await waitForCI(page, 'Your blood group'))
  // Kiran has a pending request (CMR-001) — should show "Active cross-match" or "Recent transfusion"
  assert('Live cross-match record',     await hasCI(page, 'cross-match') || await hasCI(page, 'transfusion'))
  assert('Pipeline stage labels',       await hasCI(page, 'Cross-match') && await hasCI(page, 'Issued'))
  await shot('final-patient-bloodbank')

  // ═══ Admin Analytics with audit-trail snapshot ═════════════════════════
  console.log('\n=== ADMIN ANALYTICS v2 ===')
  await clickAria(page, 'Log out'); await sleep(1500)
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(1800)
  await selectRole(page, 'Management', 'Admin', 'COO Dashboard')
  await navClick(page, 'Analytics')
  await sleep(2500)
  assert('Admin analytics page',        await waitForCI(page, 'Operations snapshot'))
  assert('live from audit trail tag',   await hasCI(page, 'live from audit trail'))
  assert('Critical follow-ups card',    await hasCI(page, 'Critical follow-ups'))
  assert('NABH chapters KPI on admin',  await hasCI(page, 'NABH chapters'))
  await shot('final-admin-analytics')

  // ═══ Final audit feed — Reception + Billing chips present ══════════════
  console.log('\n=== AUDIT FEED — new chips ═══════════════════════════════')
  await clickAria(page, 'Log out'); await sleep(1500)
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(1800)
  await selectRole(page, 'Support Services', 'Audit', 'Compliance Overview')
  await navClick(page, 'Audit Trail'); await sleep(800)
  assert('audit trail loaded',          await waitForCI(page, 'Full Audit Trail'))
  assert('Reception chip',              await page.evaluate(() => !!document.querySelector('[data-testid="audit-module-chip-reception"]')))
  assert('Billing chip',                await page.evaluate(() => !!document.querySelector('[data-testid="audit-module-chip-billing"]')))
  await shot('final-audit-trail')

  await browser.close()
  const pass = results.filter(r => r.pass).length
  const fail = results.length - pass
  console.log(`\n=== RESULT: ${pass}/${results.length} passed, ${fail} failed ===`)
  if (fail > 0) results.filter(r => !r.pass).forEach(r => console.log('  FAIL: ' + r.label))
  console.log(`=== ERRORS(${errors.length}) ===`)
  errors.forEach(e => console.log('  ', e))
  process.exit(fail > 0 ? 1 : 0)
})().catch((e) => { console.error('ERR', e.message); process.exit(2) })
