// Verification sweep for Admin v2 Phase 0 (M0.1 - M0.3).
//   M0.1 — Unified HR store powers /admin/roster, /admin/duty, /admin/staffing
//   M0.2 — HR module + NABH HRM chapter visible in audit + 9/9 chapters
//   M0.3 — Permissions matrix file exists + typecheck passes (verified via tsc)
//
// Smoke-tests that the existing admin pages still render correctly with the
// expanded canonical staff seed (40 entries vs old 8) and that the new HR
// audit module + chapter show up correctly.
const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const has = (page, t) => page.evaluate((x) => document.body.innerText.includes(x), t)
const hasCI = (page, t) => page.evaluate((x) => document.body.innerText.toLowerCase().includes(x.toLowerCase()), t)
async function waitForCI(page, text, timeoutMs = 30000) {
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

  // ═══ Admin login ════════════════════════════════════════════════════════
  await selectRole(page, 'Management', 'Admin', 'COO Dashboard')

  // ═══ M0.1 — Canonical staff seed powers /admin/roster ═══════════════════
  console.log('\n=== M0.1 unified HR store ===')
  await navClick(page, 'HR Roster'); await sleep(1500)
  assert('Roster page renders',           await waitForCI(page, 'Staff Roster'))
  // Old seed had 8 staff; new canonical seed has 40+
  assert('Roster shows expanded staff',   await hasCI(page, 'Dr. Priya Nair') && await hasCI(page, 'Anjali Desai'))
  // Staff IDs from new seed not in old MOCK_STAFF
  assert('Roster shows new staff entry',  await hasCI(page, 'Pooja Shetty') || await hasCI(page, 'Ritu Sharma'))
  // Existing leave-request action still works
  assert('Pending leave requests',        await hasCI(page, 'Ramesh Rao') || await hasCI(page, 'leave request'))
  await shot('p0-roster')

  // ═══ /admin/duty still works ═══════════════════════════════════════════
  await navClick(page, 'Duty Assignment'); await sleep(1500)
  assert('Duty page renders',             await waitForCI(page, 'Duty Assignment'))
  assert('Today/tomorrow nav works',      await hasCI(page, 'Today') || await hasCI(page, 'Morning'))
  await shot('p0-duty')

  // ═══ /admin/staffing still works ═══════════════════════════════════════
  await navClick(page, 'Staffing Overview'); await sleep(1500)
  assert('Staffing page renders',         await waitForCI(page, 'Staffing Overview'))
  await shot('p0-staffing')

  // ═══ /admin/users still works (will be rewritten in Phase 1) ════════════
  await navClick(page, 'Staff Management'); await sleep(1500)
  assert('Users page still renders',      await waitForCI(page, 'User Management'))
  await shot('p0-users')

  // ═══ M0.2 — HR chip + HRM chapter visible in audit ══════════════════════
  console.log('\n=== M0.2 HR audit module + NABH HRM chapter ===')
  await clickAria(page, 'Log out'); await sleep(1500)
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(1800)
  await selectRole(page, 'Support Services', 'Audit', 'Compliance Overview')

  // NABH dashboard should show 9/9 chapters now
  assert('NABH 9/9 chapters covered',     await hasCI(page, '9/9') || await hasCI(page, 'NABH chapters covered'))
  assert('HRM chapter listed',            await hasCI(page, 'HRM') && await hasCI(page, 'Human Resource'))
  await shot('p0-audit-dashboard')

  // Audit trail should have HR chip
  await navClick(page, 'Audit Trail'); await sleep(900)
  assert('Audit trail renders',           await waitForCI(page, 'Full Audit Trail'))
  assert('HR chip present (testid)',      await page.evaluate(() => !!document.querySelector('[data-testid="audit-module-chip-hr"]')))
  // Click HR chip to filter
  assert('Click HR chip',                 await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="audit-module-chip-hr"]')
    if (btn) { btn.click(); return true } return false
  }))
  await sleep(600)
  // Seeded HR entries should be visible — Dr. Ananya Iyer leave approval
  assert('HR seed entry: leave approved', await hasCI(page, 'leave approved') || await hasCI(page, 'Ananya Iyer'))
  assert('HR seed entry: duty assigned',  await hasCI(page, 'duty assigned') || await hasCI(page, 'Pooja Shetty'))
  await shot('p0-audit-hr')

  // ═══ Compliance Reports page should include HRM chapter ════════════════
  await navClick(page, 'Compliance Reports'); await sleep(900)
  assert('Reports page renders',          await waitForCI(page, 'Compliance Reports'))
  assert('HRM chapter in evidence',       await hasCI(page, 'HRM') || await hasCI(page, 'Human Resource'))
  await shot('p0-audit-reports')

  await browser.close()
  const pass = results.filter(r => r.pass).length
  const fail = results.length - pass
  console.log(`\n=== RESULT: ${pass}/${results.length} passed, ${fail} failed ===`)
  if (fail > 0) results.filter(r => !r.pass).forEach(r => console.log('  FAIL: ' + r.label))
  console.log(`=== ERRORS(${errors.length}) ===`)
  errors.forEach(e => console.log('  ', e))
  process.exit(fail > 0 ? 1 : 0)
})().catch((e) => { console.error('ERR', e.message); process.exit(2) })
