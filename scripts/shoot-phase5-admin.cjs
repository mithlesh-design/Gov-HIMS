// Verification sweep for Admin v2 Phase 5 (M5.1 - M5.6).
//   M5.1+M5.2 — /admin/finance P&L + reconciliation dashboard
//   M5.3 — /admin/disputes patient + vendor + AI flags queue
//   M5.4 — /admin/payroll preview with lock-period action
//   M5.5 — /admin/vendors directory + invoices + MoU expiry
//   M5.6 — Cash Position widget on COO dashboard
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
async function clickTestId(page, id) { return page.evaluate((tid) => { const el = document.querySelector(`[data-testid="${tid}"]`); if (el) { el.click(); return true } return false }, id) }
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
  page.on('dialog', async (d) => { await d.accept() })
  const shot = async (n) => { await sleep(500); await page.screenshot({ path: `${OUT}\\${n}.png`, fullPage: true }); console.log('shot', n) }

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(2500)
  await selectRole(page, 'Management', 'Admin', 'Hospital Analytics')

  // ═══ M5.6 — Cash Position widget on COO dashboard ═════════════════════
  console.log('\n=== M5.6 Cash Position widget ===')
  await sleep(2500)
  assert('Cash position widget',          await hasCI(page, 'Cash position'))
  assert('Cash on hand KPI',              await hasCI(page, 'Cash on hand'))
  assert('A/R outstanding KPI',           await hasCI(page, 'A/R outstanding'))
  assert('A/P payable KPI',               await hasCI(page, 'A/P payable'))
  assert('Payroll due KPI',               await hasCI(page, 'Payroll due'))
  assert('Runway days badge',             await hasCI(page, 'runway'))
  await shot('p5-dashboard')

  // ═══ M5.1 — Hospital P&L ═════════════════════════════════════════════
  console.log('\n=== M5.1 Hospital P&L ===')
  await navClick(page, 'Hospital P&L'); await sleep(3500)
  assert('Finance page heading',          await waitForCI(page, 'Hospital P&L', 30000))
  assert('Revenue KPI',                   await hasCI(page, 'Revenue'))
  assert('Collected KPI',                 await hasCI(page, 'Collected'))
  assert('Net P&L KPI',                   await hasCI(page, 'Net P&L'))
  assert('Revenue by source',             await hasCI(page, 'Revenue by source'))
  assert('Payer mix',                     await hasCI(page, 'Payer mix'))
  assert('Insurance claim aging',         await hasCI(page, 'claim aging'))
  assert('Daily reconciliation',          await hasCI(page, 'Daily reconciliation'))
  await shot('p5-finance')

  // ═══ M5.4 — Payroll Preview ══════════════════════════════════════════
  console.log('\n=== M5.4 Payroll ===')
  await navClick(page, 'Payroll'); await sleep(3500)
  assert('Payroll page heading',          await waitForCI(page, 'Payroll Preview', 30000))
  assert('Lock period button',            await hasCI(page, 'Lock period') || await hasCI(page, 'Period locked'))
  assert('Cost by department',            await hasCI(page, 'Cost by department'))
  assert('Net payable KPI',               await hasCI(page, 'Net payable'))
  // Click lock period
  if (await hasCI(page, 'Lock period')) {
    assert('Click lock period',           await clickMaybe(page, 'Lock period', 'button'))
    await sleep(1200)
    assert('After lock — period locked',  await hasCI(page, 'Period locked') || await hasCI(page, 'Locked periods'))
  }
  await shot('p5-payroll')

  // ═══ M5.5 — Vendors ══════════════════════════════════════════════════
  console.log('\n=== M5.5 Vendors ===')
  await navClick(page, 'Vendors'); await sleep(3500)
  assert('Vendors page heading',          await waitForCI(page, 'Vendor & Payments', 30000))
  assert('Active vendors KPI',            await hasCI(page, 'Active vendors'))
  assert('Open invoices KPI',             await hasCI(page, 'Open invoices'))
  assert('Tab: overview',                 await page.evaluate(() => !!document.querySelector('[data-testid="vendor-tab-overview"]')))
  assert('Tab: invoices',                 await page.evaluate(() => !!document.querySelector('[data-testid="vendor-tab-invoices"]')))
  assert('Tab: vendors',                  await page.evaluate(() => !!document.querySelector('[data-testid="vendor-tab-vendors"]')))
  // Overdue invoices visible
  assert('Overdue invoices section',      await hasCI(page, 'Overdue invoices'))
  assert('MoUs expiring',                 await hasCI(page, 'MoUs expiring'))
  // Switch to invoices tab
  assert('Switch to invoices tab',        await clickTestId(page, 'vendor-tab-invoices'))
  await sleep(700)
  assert('Vendor invoice rows',           await hasCI(page, 'EcoBiomed') || await hasCI(page, 'Linde') || await hasCI(page, 'invoice'))
  await shot('p5-vendors')

  // ═══ M5.3 — Disputes ════════════════════════════════════════════════
  console.log('\n=== M5.3 Disputes ===')
  await navClick(page, 'Disputes'); await sleep(3500)
  assert('Disputes page heading',         await waitForCI(page, 'Disputes & AI Flags', 30000))
  assert('Patient disputes KPI',          await hasCI(page, 'Patient disputes'))
  assert('Vendor disputes KPI',           await hasCI(page, 'Vendor disputes'))
  assert('AI flags KPI',                  await hasCI(page, 'AI flags'))
  assert('Tab: patient',                  await page.evaluate(() => !!document.querySelector('[data-testid="dispute-tab-patient"]')))
  assert('Tab: vendor',                   await page.evaluate(() => !!document.querySelector('[data-testid="dispute-tab-vendor"]')))
  assert('Tab: ai_flags',                 await page.evaluate(() => !!document.querySelector('[data-testid="dispute-tab-ai_flags"]')))
  // Switch to vendor tab
  assert('Switch to vendor tab',          await clickTestId(page, 'dispute-tab-vendor'))
  await sleep(700)
  assert('Clean Linen Co. disputed',      await hasCI(page, 'Clean Linen') || await hasCI(page, 'weight discrepancy'))
  await shot('p5-disputes')

  // ═══ Audit confirms Finance module chips ════════════════════════════
  console.log('\n=== Audit cross-check: Finance module ===')
  await clickAria(page, 'Log out'); await sleep(1800)
  await selectRole(page, 'Support Services', 'Audit', 'Compliance Overview')
  await navClick(page, 'Audit Trail'); await sleep(900)
  assert('Audit trail loaded',            await waitForCI(page, 'Full Audit Trail'))
  assert('Finance chip present',          await page.evaluate(() => !!document.querySelector('[data-testid="audit-module-chip-finance"]')))
  await clickTestId(page, 'audit-module-chip-finance'); await sleep(500)
  assert('Finance audit events',          await hasCI(page, 'finance ') || await hasCI(page, 'Sodexo') || await hasCI(page, 'dispute'))
  await shot('p5-audit')

  await browser.close()
  const pass = results.filter(r => r.pass).length
  const fail = results.length - pass
  console.log(`\n=== RESULT: ${pass}/${results.length} passed, ${fail} failed ===`)
  if (fail > 0) results.filter(r => !r.pass).forEach(r => console.log('  FAIL: ' + r.label))
  console.log(`=== ERRORS(${errors.length}) ===`)
  errors.forEach(e => console.log('  ', e))
  process.exit(fail > 0 ? 1 : 0)
})().catch((e) => { console.error('ERR', e.message); process.exit(2) })
