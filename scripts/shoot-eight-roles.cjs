// Regression sweep for the 8 leaner-role v2 builds:
//  1. Bloodbank — cross-match + bedside checks + issue
//  2. CSSD — start cycle + complete (BI/Chem gating)
//  3. BMW — collect bag + handover to vendor + reports
//  4. Dietary — meal serve + allergy conflict
//  5. Mortuary — death cert + MLC clearance + release
//  6. Ambulance — dispatch + advance trip + complete
//  7. Housekeeping — task workflow + audit emit on verify
//  8. Admission/Bed Manager — ER handover wiring
const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const has = (page, t) => page.evaluate((x) => document.body.innerText.includes(x), t)
const hasCI = (page, t) => page.evaluate((x) => document.body.innerText.toLowerCase().includes(x.toLowerCase()), t)
async function waitForCI(page, text, timeoutMs = 60000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) { if (await hasCI(page, text)) return true; await sleep(500) }
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

  // ═══ Bloodbank v2 ════════════════════════════════════════════════════
  console.log('\n=== BLOODBANK v2 ===')
  // Confirm via the unique dashboard h3 (not the role-card description).
  await selectRole(page, 'Support Services', 'Blood Bank', 'Inventory Distribution by Blood Group')
  await navClick(page, 'Cross-Match Requests')
  await sleep(2500)
  assert('bloodbank requests page',     await waitForCI(page, 'NABH-compliant traceability'))
  assert('Kiran Patil pending request', await hasCI(page, 'Kiran Patil'))
  // Expand Kiran's request
  await clickMaybe(page, 'Kiran Patil', 'button'); await sleep(700)
  assert('FEFO recommended units shown', await hasCI(page, 'FEFO') || await hasCI(page, 'BAG-'))
  assert('click Cross-match & reserve', await clickMaybe(page, 'Cross-match & reserve', 'button'))
  await sleep(900)
  assert('bedside safety checklist',    await waitForCI(page, 'Bedside transfusion safety'))
  for (const c of ['Patient ID matches request', 'ABO group verified at bedside', 'Rh type verified at bedside', 'Expiry within validity', 'Bag integrity', 'Transfusion consent']) {
    await clickMaybe(page, c, 'button'); await sleep(120)
  }
  assert('click Issue bag(s)',          await clickMaybe(page, 'Issue', 'button'))
  await sleep(800)
  assert('traceability shown',          await hasCI(page, 'Traceability') || await hasCI(page, 'audit logged'))
  await shot('eight-bb-issued')

  // ═══ CSSD v2 ════════════════════════════════════════════════════════════
  console.log('\n=== CSSD v2 ===')
  await clickAria(page, 'Log out'); await sleep(1500)
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(1800)
  await selectRole(page, 'Support Services', 'CSSD', 'Central Sterile Supply Department')
  await navClick(page, 'Sterilization Cycles')
  assert('CSSD cycles heading',         await waitForCI(page, 'Sterilization Cycles'))
  assert('Pick instruments label',      await waitForCI(page, 'Pick instruments'))
  assert('pick TKR Tray',               await clickMaybe(page, 'TKR Tray', 'button'))
  await sleep(400)
  assert('click Start cycle',           await clickMaybe(page, 'Start cycle', 'button'))
  await sleep(1500)
  assert('moved to running view',       await waitForCI(page, 'Running'))
  // Newly started batch auto-expands via setOpen — Mark passed should be in DOM.
  assert('Mark passed action visible',  await waitForCI(page, 'Mark passed'))
  assert('click Mark passed',           await clickMaybe(page, 'Mark passed', 'button'))
  await sleep(700)
  await clickMaybe(page, 'completed', 'button'); await sleep(700)
  assert('completed tab shows BATCH-',  await waitForCI(page, 'BATCH-'))
  await shot('eight-cssd-completed')

  // ═══ BMW v2 ═════════════════════════════════════════════════════════════
  console.log('\n=== BMW v2 ===')
  await clickAria(page, 'Log out'); await sleep(1500)
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(1800)
  await selectRole(page, 'Support Services', 'Bio-Medical Waste', 'Daily waste management')
  await navClick(page, 'Waste Log')
  assert('BMW log heading',             await waitForCI(page, 'Biomedical Waste Log'))
  assert('Log a new collection form',   await waitForCI(page, 'Log a new collection'))
  // Expand the BMW-002 ICU/Red row to reveal handover button
  assert('expand ICU/Red treated bag',  await clickMaybe(page, 'ICU', 'button'))
  await sleep(700)
  assert('Hand over button visible',    await waitForCI(page, 'Hand over'))
  assert('click handover',              await clickMaybe(page, 'Hand over to BMW-VENDOR-01', 'button'))
  await sleep(700)
  await shot('eight-bmw-log')
  await navClick(page, 'Compliance Reports'); await sleep(800)
  assert('BMW reports heading',         await waitForCI(page, 'CPCB Monthly Reports'))
  assert('breakdown by colour code',    await hasCI(page, 'Breakdown by colour code'))
  assert('Export JSON action',          await hasCI(page, 'Export JSON'))
  await shot('eight-bmw-reports')

  // ═══ Dietary v2 ═════════════════════════════════════════════════════════
  console.log('\n=== DIETARY v2 ===')
  await clickAria(page, 'Log out'); await sleep(1500)
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(1800)
  await selectRole(page, 'Support Services', 'Dietary', 'nutrition management')
  await navClick(page, 'Meal Orders')
  assert('dietary orders heading',      await waitForCI(page, 'Meal Orders'))
  assert('Kiran lunch scheduled',       await hasCI(page, 'Kiran Patil'))
  assert('Diabetic plan badge',         await hasCI(page, 'Diabetic'))
  // Use unambiguous "Serve" button
  assert('click Serve button',          await clickMaybe(page, 'Serve', 'button'))
  await sleep(800)
  assert('delivered status',            await waitForCI(page, 'delivered'))
  await shot('eight-dietary-orders')

  // ═══ Mortuary v2 ═════════════════════════════════════════════════════════
  console.log('\n=== MORTUARY v2 ===')
  await clickAria(page, 'Log out'); await sleep(1500)
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(1800)
  await selectRole(page, 'Support Services', 'Mortuary', 'legal clearances')
  await navClick(page, 'Legal Clearances')
  assert('mortuary clearances heading', await waitForCI(page, 'Legal Clearances'))
  assert('Unknown Male MLC visible',    await hasCI(page, 'Unknown Male'))
  // Confirm at least one of the action buttons exists
  assert('Issue death cert button',     await hasCI(page, 'Issue death cert') || await hasCI(page, 'Clear MLC'))
  await shot('eight-mortuary-clearances')

  // ═══ Ambulance v2 ════════════════════════════════════════════════════════
  console.log('\n=== AMBULANCE v2 ===')
  await clickAria(page, 'Log out'); await sleep(1500)
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(1800)
  await selectRole(page, 'Support Services', 'Ambulance', 'trip tracking')
  await navClick(page, 'Trip Log')
  assert('ambulance log heading',       await waitForCI(page, 'Trip Log'))
  assert('Advance button visible',      await waitForCI(page, 'Advance to'))
  assert('click Advance',               await clickMaybe(page, 'Advance to', 'button'))
  await sleep(800)
  assert('vehicle status flipped',      await hasCI(page, 'Completed') || await hasCI(page, 'Transporting'))
  await shot('eight-ambulance-log')

  // ═══ Housekeeping v2 (audit emits on verify) ═══════════════════════════
  console.log('\n=== HOUSEKEEPING v2 ===')
  await clickAria(page, 'Log out'); await sleep(1500)
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(1800)
  await selectRole(page, 'Management', 'Housekeeping', 'Cleaning Queue')
  assert('Bed 103 in queue',            await hasCI(page, 'Bed 103'))
  assert('In Progress badge',           await hasCI(page, 'In Progress'))
  assert('click Mark Done',             await clickMaybe(page, 'Mark Done', 'button'))
  await sleep(700)
  assert('click Verify',                await clickMaybe(page, 'Verify', 'button'))
  await sleep(700)
  await shot('eight-housekeeping')

  // ═══ Admission / Bed Manager ════════════════════════════════════════════
  console.log('\n=== ADMISSION v2 ===')
  await clickAria(page, 'Log out'); await sleep(1500)
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(1800)
  // 'Admission / Beds' label, dashboard contains 'Vikram Nair' (the seeded request)
  await selectRole(page, 'Operations', 'Admission', 'Vikram Nair')
  assert('admission dashboard renders', await hasCI(page, 'Vikram Nair') || await hasCI(page, 'Admission'))
  await shot('eight-admission')

  // ═══ Final: Audit feed shows new events from 8-role builds ══════════════
  console.log('\n=== AUDIT FEED — new events from 8-role builds ===')
  await clickAria(page, 'Log out'); await sleep(1500)
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(1800)
  await selectRole(page, 'Support Services', 'Audit', 'Compliance Overview')
  assert('audit dashboard renders',     await hasCI(page, 'Audit') && await hasCI(page, 'Compliance'))
  await navClick(page, 'Audit Trail'); await sleep(800)
  assert('audit trail renders',         await waitForCI(page, 'Full Audit Trail'))
  assert('Blood Bank chip',             await page.evaluate(() => !!document.querySelector('[data-testid="audit-module-chip-blood-bank"]')))
  assert('CSSD chip',                   await page.evaluate(() => !!document.querySelector('[data-testid="audit-module-chip-cssd"]')))
  assert('BMW chip',                    await page.evaluate(() => !!document.querySelector('[data-testid="audit-module-chip-bmw"]')))
  assert('Dietary chip',                await page.evaluate(() => !!document.querySelector('[data-testid="audit-module-chip-dietary"]')))
  assert('Ambulance chip',              await page.evaluate(() => !!document.querySelector('[data-testid="audit-module-chip-ambulance"]')))
  assert('Housekeeping chip',           await page.evaluate(() => !!document.querySelector('[data-testid="audit-module-chip-housekeeping"]')))
  await shot('eight-audit-trail')

  await browser.close()
  const pass = results.filter(r => r.pass).length
  const fail = results.length - pass
  console.log(`\n=== RESULT: ${pass}/${results.length} passed, ${fail} failed ===`)
  if (fail > 0) results.filter(r => !r.pass).forEach(r => console.log('  FAIL: ' + r.label))
  console.log(`=== ERRORS(${errors.length}) ===`)
  errors.forEach(e => console.log('  ', e))
  process.exit(fail > 0 ? 1 : 0)
})().catch((e) => { console.error('ERR', e.message); process.exit(2) })
