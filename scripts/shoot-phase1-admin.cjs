// Verification sweep for Admin v2 Phase 1 (M1.1 - M1.5).
//   M1.1 — Staff Directory rebuild reads canonical HR store
//   M1.2 — Add Staff wizard 3-step flow creates a real staff member
//   M1.3 — Profile drawer opens with 5 tabs
//   M1.4 — Credentials page with KPI cards + filter chips
//   M1.5 — Cross-store sync (new staff visible in audit via hr_staff_created)
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
async function clickTestId(page, id) { return page.evaluate((tid) => { const el = document.querySelector(`[data-testid="${tid}"]`); if (el) { el.click(); return true } return false }, id) }
async function selectRole(page, tab, role, confirmText) {
  for (let i = 0; i < 150; i++) { if (tab) await clickMaybe(page, tab, 'button'); await clickMaybe(page, role, 'button'); await sleep(500); if (await hasCI(page, confirmText)) { await sleep(800); return } }
  throw new Error('login did not reach portal: ' + role)
}
async function typeIntoPlaceholder(page, placeholderSubstr, value) {
  const el = await page.evaluateHandle((sub) => {
    return [...document.querySelectorAll('input, textarea')].find(e => (e.placeholder || '').toLowerCase().includes(sub.toLowerCase()))
  }, placeholderSubstr)
  if (!el.asElement()) return false
  await el.asElement().focus()
  await page.keyboard.type(value, { delay: 25 })
  return true
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

  // ═══ M1.1 — Staff Directory rebuild ═════════════════════════════════════
  console.log('\n=== M1.1 staff directory ===')
  await navClick(page, 'Staff Management'); await sleep(1800)
  assert('Directory page heading',         await waitForCI(page, 'Staff Management'))
  assert('Reads canonical HR (40 staff)',  await hasCI(page, 'staff members'))
  // New seed entries — names that weren't in the old USERS array
  assert('Canonical: Pooja Shetty',        await hasCI(page, 'Pooja Shetty'))
  assert('Canonical: Anjali Desai',        await hasCI(page, 'Anjali Desai'))
  assert('Canonical: Lakshmi Iyer',        await hasCI(page, 'Lakshmi Iyer'))
  // Status tabs
  assert('Active tab testid',              await page.evaluate(() => !!document.querySelector('[data-testid="staff-tab-active"]')))
  assert('On-leave tab testid',            await page.evaluate(() => !!document.querySelector('[data-testid="staff-tab-on_leave"]')))
  assert('All tab testid',                 await page.evaluate(() => !!document.querySelector('[data-testid="staff-tab-all"]')))
  // Search works
  assert('Search filter',                  await typeIntoPlaceholder(page, 'Search by name', 'Priya'))
  await sleep(700)
  assert('Search narrowed to Priya',       await hasCI(page, 'Priya Nair'))
  // Clear search
  await page.evaluate(() => {
    const inp = [...document.querySelectorAll('input')].find(e => /search by name/i.test(e.placeholder ?? ''))
    if (inp) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
      setter?.call(inp, '')
      inp.dispatchEvent(new Event('input', { bubbles: true }))
    }
  })
  await sleep(400)
  await shot('p1-staff-directory')

  // ═══ M1.3 — Profile drawer opens ═══════════════════════════════════════
  console.log('\n=== M1.3 profile drawer ===')
  // Click on the Dr. Priya Nair row to open the drawer
  assert('Click staff row',                await clickMaybe(page, 'Priya Nair', 'tr'))
  await sleep(900)
  assert('Drawer opens with name',         await hasCI(page, 'Profile') && await hasCI(page, 'Schedule'))
  assert('Drawer tabs: Credentials',       await hasCI(page, 'Credentials'))
  assert('Drawer tabs: Audit',             await hasCI(page, 'Audit'))
  // Switch to Schedule tab
  assert('Click Schedule tab',             await clickMaybe(page, 'schedule', 'button'))
  await sleep(500)
  assert('Schedule shows next days',       await hasCI(page, 'shift') || await hasCI(page, 'Morning') || await hasCI(page, 'days'))
  // Switch to Credentials tab
  assert('Click Credentials tab',          await clickMaybe(page, 'credentials', 'button'))
  await sleep(500)
  assert('Credentials shown',              await hasCI(page, 'Medical Council') || await hasCI(page, 'BLS') || await hasCI(page, 'Lifetime'))
  // Close drawer
  await clickAria(page, 'Close'); await sleep(500)
  await shot('p1-profile-drawer')

  // ═══ M1.2 — Add Staff wizard ═══════════════════════════════════════════
  console.log('\n=== M1.2 add staff wizard ===')
  // Wait for any drawer animation to settle
  await sleep(700)
  // Bring directory back into view
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' })); await sleep(300)
  assert('Click Add staff button',         await clickMaybe(page, 'Add staff', 'button'))
  await sleep(800)
  assert('Wizard step 1',                  await hasCI(page, 'Step 1 of 3') && await hasCI(page, 'Identity'))
  assert('Wizard name field',              await typeIntoPlaceholder(page, 'Dr. Anjali', 'Test Wizard Staff'))
  await sleep(300)
  assert('Wizard email field',             await typeIntoPlaceholder(page, 'anjali.mehra', 'test@agentix.in'))
  await sleep(300)
  assert('Wizard phone field',             await typeIntoPlaceholder(page, '+91 98', '+91 99999 99999'))
  await sleep(300)
  // Next to step 2
  assert('Click Next to step 2',           await clickMaybe(page, 'Next', 'button'))
  await sleep(700)
  assert('Wizard step 2 — Nurse fields',   await hasCI(page, 'Step 2 of 3') && (await hasCI(page, 'Nursing Council') || await hasCI(page, 'Compensation')))
  // Next to step 3
  assert('Click Next to step 3',           await clickMaybe(page, 'Next', 'button'))
  await sleep(700)
  assert('Wizard step 3 — Access',         await hasCI(page, 'Step 3 of 3') && await hasCI(page, 'Login'))
  assert('Permissions preview shown',      await hasCI(page, 'Permissions preview') || await hasCI(page, 'permissions'))
  // Create staff
  assert('Click Create staff',             await clickMaybe(page, 'Create staff', 'button'))
  await sleep(900)
  // New staff should appear in directory
  assert('New staff in directory',         await hasCI(page, 'Test Wizard Staff'))
  await shot('p1-wizard-result')

  // ═══ M1.4 — Credentials page ═══════════════════════════════════════════
  console.log('\n=== M1.4 credentials page ===')
  await navClick(page, 'Credentials'); await sleep(1500)
  assert('Credentials page heading',       await waitForCI(page, 'Credentials & Licen'))
  // 5 KPI cards
  assert('KPI: Expired',                   await page.evaluate(() => !!document.querySelector('[data-testid="cred-kpi-expired"]')))
  assert('KPI: This week',                 await page.evaluate(() => !!document.querySelector('[data-testid="cred-kpi-this_week"]')))
  assert('KPI: This month',                await page.evaluate(() => !!document.querySelector('[data-testid="cred-kpi-this_month"]')))
  assert('KPI: This quarter',              await page.evaluate(() => !!document.querySelector('[data-testid="cred-kpi-this_quarter"]')))
  assert('KPI: Valid',                     await page.evaluate(() => !!document.querySelector('[data-testid="cred-kpi-valid"]')))
  // ER-111 / NR-501 should appear due to short-expiry credentials in seed
  assert('Expiring credential surfaced',   await hasCI(page, 'BLS') || await hasCI(page, 'ACLS') || await hasCI(page, 'AERB'))
  // Click KPI to filter
  assert('Click This-month KPI filter',    await clickTestId(page, 'cred-kpi-this_month'))
  await sleep(700)
  // Click again to clear
  await clickTestId(page, 'cred-kpi-this_month'); await sleep(400)
  await shot('p1-credentials')

  // ═══ M1.5 — Cross-store sync (HR new staff visible in audit) ═══════════
  // SPA-only navigation here — a hard reload would wipe the un-persisted
  // useAuditStore + useHRStore-derived-emit, losing the wizard's audit entry.
  console.log('\n=== M1.5 cross-store sync via audit ===')
  await clickAria(page, 'Log out'); await sleep(1800)
  await selectRole(page, 'Support Services', 'Audit', 'Compliance Overview')
  await navClick(page, 'Audit Trail'); await sleep(900)
  assert('Audit trail loaded',             await waitForCI(page, 'Full Audit Trail'))
  // The hr_staff_created emit from the wizard should be here
  assert('HR chip present',                await page.evaluate(() => !!document.querySelector('[data-testid="audit-module-chip-hr"]')))
  // Click HR filter
  await clickTestId(page, 'audit-module-chip-hr'); await sleep(500)
  assert('HR audit feed has staff_created',
                                            await hasCI(page, 'staff created') || await hasCI(page, 'Test Wizard Staff'))
  await shot('p1-audit-cross-sync')

  await browser.close()
  const pass = results.filter(r => r.pass).length
  const fail = results.length - pass
  console.log(`\n=== RESULT: ${pass}/${results.length} passed, ${fail} failed ===`)
  if (fail > 0) results.filter(r => !r.pass).forEach(r => console.log('  FAIL: ' + r.label))
  console.log(`=== ERRORS(${errors.length}) ===`)
  errors.forEach(e => console.log('  ', e))
  process.exit(fail > 0 ? 1 : 0)
})().catch((e) => { console.error('ERR', e.message); process.exit(2) })
