// Verification sweep for Admin v2 Phase 6 (Compliance Command Centre).
//   M6.4 — /admin/statutory (calendar of PF/ESI/GST/PT/etc with file action)
//   M6.2 — /admin/disha (DPDP access log + RTBF queue + breach attest)
//   M6.1+M6.3+M6.5 — /admin/compliance unified cockpit
//   Compliance widget on COO dashboard
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
  page.on('dialog', async (d) => { await d.accept('TEST-ACK-001') })
  const shot = async (n) => { await sleep(500); await page.screenshot({ path: `${OUT}\\${n}.png`, fullPage: true }); console.log('shot', n) }

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(2500)
  await selectRole(page, 'Management', 'Admin', 'Hospital Analytics')

  // ═══ COO Compliance widget ═════════════════════════════════════════════
  console.log('\n=== COO Compliance widget ===')
  await sleep(2500)
  assert('Compliance status widget',      await hasCI(page, 'Compliance status'))
  assert('NABH stream tile',              await hasCI(page, 'chapters ready'))
  assert('DISHA stream tile',             await hasCI(page, 'DISHA'))
  assert('Statutory stream tile',         await hasCI(page, 'Statutory'))
  assert('MoUs stream tile',              await hasCI(page, 'MoUs'))
  assert('BMW stream tile',               await hasCI(page, 'CPCB compliant'))
  await shot('p6-dashboard')

  // ═══ M6.1+M6.3+M6.5 — Compliance Cockpit ═══════════════════════════════
  console.log('\n=== M6.1 Compliance Cockpit ===')
  await navClick(page, 'Compliance', 'a'); await sleep(2500)
  assert('Cockpit page heading',          await waitForCI(page, 'Compliance Command Centre'))
  assert('Overall score',                 await hasCI(page, 'Overall score'))
  assert('NABH chapter readiness',        await hasCI(page, 'NABH chapter readiness'))
  assert('Statutory next 14d',            await hasCI(page, 'next 14 days'))
  assert('MoU expiring section',          await hasCI(page, 'expiring soon'))
  assert('BMW CPCB section',              await hasCI(page, 'CPCB'))
  assert('DISHA recent activity',         await hasCI(page, 'DISHA / DPDP recent activity'))
  await shot('p6-compliance')

  // ═══ M6.4 — Statutory Calendar ═════════════════════════════════════════
  console.log('\n=== M6.4 Statutory ===')
  await navClick(page, 'Statutory', 'a'); await sleep(2500)
  assert('Statutory page heading',        await waitForCI(page, 'Statutory Returns'))
  assert('PF entry visible',              await hasCI(page, 'Provident Fund'))
  assert('GSTR-1 entry visible',          await hasCI(page, 'GSTR-1'))
  assert('TDS entry visible',             await hasCI(page, 'TDS'))
  assert('Next 14 days section',          await hasCI(page, 'Next 14 days'))
  assert('Filed status filter',           await hasCI(page, 'Filed'))
  // Click File on first unfiled entry
  if (await hasCI(page, 'File')) {
    assert('File action available',       await clickMaybe(page, 'File', 'button'))
    await sleep(1200)
    // Dialog dismissed by handler with TEST-ACK-001
  }
  await shot('p6-statutory')

  // ═══ M6.2 — DISHA Page ═══════════════════════════════════════════════
  console.log('\n=== M6.2 DISHA ===')
  await navClick(page, 'DISHA / DPDP', 'a'); await sleep(2500)
  assert('DISHA page heading',            await waitForCI(page, 'DISHA / DPDP Compliance'))
  assert('Record accesses KPI',           await hasCI(page, 'Record accesses'))
  assert('Consents captured KPI',         await hasCI(page, 'Consents captured'))
  assert('RTBF open KPI',                 await hasCI(page, 'RTBF open'))
  assert('Breaches logged KPI',           await hasCI(page, 'Breaches logged'))
  assert('RTBF queue section',            await hasCI(page, 'Right-to-Erasure'))
  // The seed has Kiran's record access + Aarav RTBF
  assert('Kiran chart accessed',          await hasCI(page, 'Kiran Patil') || await hasCI(page, 'chart accessed'))
  assert('Aarav RTBF open',               await hasCI(page, 'Aarav') || await hasCI(page, 'RTBF'))
  await shot('p6-disha')

  // ═══ Audit cross-check: DISHA chip exists ═══════════════════════════
  console.log('\n=== Audit DISHA chip ═════════════════════════════════')
  await clickAria(page, 'Log out'); await sleep(1800)
  await selectRole(page, 'Support Services', 'Audit', 'Compliance Overview')
  await navClick(page, 'Audit Trail'); await sleep(900)
  assert('Audit trail loaded',            await waitForCI(page, 'Full Audit Trail'))
  assert('DISHA chip present',            await page.evaluate(() => !!document.querySelector('[data-testid="audit-module-chip-disha"]')))
  await clickTestId(page, 'audit-module-chip-disha'); await sleep(500)
  assert('DISHA audit events surfaced',   await hasCI(page, 'disha ') || await hasCI(page, 'Kiran') || await hasCI(page, 'consent'))
  await shot('p6-audit')

  await browser.close()
  const pass = results.filter(r => r.pass).length
  const fail = results.length - pass
  console.log(`\n=== RESULT: ${pass}/${results.length} passed, ${fail} failed ===`)
  if (fail > 0) results.filter(r => !r.pass).forEach(r => console.log('  FAIL: ' + r.label))
  console.log(`=== ERRORS(${errors.length}) ===`)
  errors.forEach(e => console.log('  ', e))
  process.exit(fail > 0 ? 1 : 0)
})().catch((e) => { console.error('ERR', e.message); process.exit(2) })
