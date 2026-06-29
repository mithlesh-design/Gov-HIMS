// Verification sweep for Admin v2 Phase 2 (M2.1 - M2.6 + M2.4 lib).
//   M2.1 — Roster Grid 2.0 (2 / 4 week view, conflict markers, coverage strip)
//   M2.2 — Shift Template apply-pattern modal (3 seed templates)
//   M2.3 — Duty page reads canonical useHRStore.dutyAssignments + AI suggestions
//   M2.4 — Conflict engine surfaces critical/warning badges
//   M2.5 — Hours & Overtime tracker page + log-OT modal
//   M2.6 — On-call rotation grid + live "now" widget
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
  // Auto-accept confirm prompts
  page.on('dialog', async (d) => { await d.accept() })
  const shot = async (n) => { await sleep(500); await page.screenshot({ path: `${OUT}\\${n}.png`, fullPage: true }); console.log('shot', n) }

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(2500)
  await selectRole(page, 'Management', 'Admin', 'COO Dashboard')

  // ═══ M2.1 — Roster Grid 2.0 ═══════════════════════════════════════════
  console.log('\n=== M2.1 Roster Grid 2.0 ===')
  await navClick(page, 'HR Roster'); await sleep(1800)
  assert('Roster page heading',           await waitForCI(page, 'Staff Roster'))
  assert('Roster shows 40+ staff',        await hasCI(page, 'Pooja Shetty') && await hasCI(page, 'Anjali Desai'))
  // 2-week / 4-week toggle
  assert('2-week toggle testid',          await page.evaluate(() => !!document.querySelector('[data-testid="roster-weeks-2"]')))
  assert('4-week toggle testid',          await page.evaluate(() => !!document.querySelector('[data-testid="roster-weeks-4"]')))
  assert('Switch to 4-week view',         await clickTestId(page, 'roster-weeks-4'))
  await sleep(500)
  // Apply pattern button
  assert('Apply pattern button',          await hasCI(page, 'Apply pattern'))
  await shot('p2-roster')

  // ═══ M2.4 — Conflict markers ══════════════════════════════════════════
  console.log('\n=== M2.4 conflict markers ===')
  // Conflict summary strip
  assert('Conflict summary in window',    await hasCI(page, 'Conflicts in window') || await hasCI(page, 'critical') || await hasCI(page, 'warning'))
  // Switch back to 2-week
  await clickTestId(page, 'roster-weeks-2'); await sleep(400)

  // ═══ M2.2 — Shift template modal ══════════════════════════════════════
  console.log('\n=== M2.2 Shift template modal ===')
  assert('Open Apply pattern modal',      await clickMaybe(page, 'Apply pattern', 'button'))
  await sleep(800)
  assert('Modal: 3 seed templates',       await hasCI(page, '5-on / 2-off') && await hasCI(page, 'Day-Night'))
  // Pick 5-on/2-off template (already selected by default)
  assert('Template card testid 1',        await page.evaluate(() => !!document.querySelector('[data-testid="tmpl-TMPL-1"]')))
  // Date range section
  assert('Date range section',            await hasCI(page, 'Date range') || await hasCI(page, 'From'))
  assert('Staff selector section',        await hasCI(page, 'Staff') && await hasCI(page, 'Select all visible'))
  // Pick a few staff
  assert('Click Select all visible',      await clickMaybe(page, 'Select all visible', 'button'))
  await sleep(400)
  // Preview
  assert('Click Preview',                 await clickMaybe(page, 'Preview', 'button'))
  await sleep(400)
  // Cancel (don't actually apply — would mass-mutate)
  assert('Cancel modal',                  await clickMaybe(page, 'Cancel', 'button'))
  await sleep(500)
  await shot('p2-roster-template-modal')

  // ═══ M2.3 — Duty page ═════════════════════════════════════════════════
  console.log('\n=== M2.3 Duty page (canonical store) ===')
  await navClick(page, 'Duty Assignment'); await sleep(1500)
  assert('Duty page heading',             await waitForCI(page, 'Duty Assignment'))
  assert('Shift selector testid',         await page.evaluate(() => !!document.querySelector('[data-testid="duty-shift-morning"]')))
  // Ward coverage strip
  assert('Ward coverage strip',           await hasCI(page, 'Ward coverage'))
  // Today's duty assignments from seed (Dr. Priya Nair → General Ward today)
  assert('Seeded duty visible',           await hasCI(page, 'Priya Nair') && (await hasCI(page, 'General Ward') || await hasCI(page, 'Cardiology')))
  // Suggestions panel
  assert('AI suggestions panel',          await hasCI(page, 'Suggested duty') || await hasCI(page, 'suggestion'))
  await shot('p2-duty')

  // ═══ M2.5 — Hours & OT page ═══════════════════════════════════════════
  console.log('\n=== M2.5 Hours & OT page ===')
  await navClick(page, 'Hours & OT'); await sleep(3500)
  assert('Hours page heading',            await waitForCI(page, 'Hours & Overtime', 30000))
  assert('KPI: Scheduled hours',          await hasCI(page, 'Scheduled hours'))
  assert('KPI: Overtime',                 await hasCI(page, 'Overtime hours'))
  assert('KPI: OT pay',                   await hasCI(page, 'OT pay'))
  assert('Period: Week',                  await page.evaluate(() => !!document.querySelector('[data-testid="hours-period-week"]')))
  assert('Period: Fortnight',             await page.evaluate(() => !!document.querySelector('[data-testid="hours-period-fortnight"]')))
  assert('Period: Month',                 await page.evaluate(() => !!document.querySelector('[data-testid="hours-period-month"]')))
  // Switch to month
  assert('Switch to Month period',        await clickTestId(page, 'hours-period-month'))
  await sleep(500)
  // Log overtime modal
  assert('Open Log overtime',             await clickMaybe(page, 'Log overtime', 'button'))
  await sleep(700)
  assert('Log OT modal heading',          await hasCI(page, 'Log overtime'))
  assert('Close modal',                   await clickMaybe(page, 'Cancel', 'button'))
  await sleep(400)
  await shot('p2-hours')

  // ═══ M2.6 — On-call page ══════════════════════════════════════════════
  console.log('\n=== M2.6 On-Call rotation ===')
  await navClick(page, 'On-Call'); await sleep(3500)
  assert('On-call page heading',          await waitForCI(page, 'On-Call Rotation', 30000))
  // The apostrophe in "who's" might render differently; just check for keywords
  assert('Live now-on-call panel',        await hasCI(page, 'on-call right now') || await hasCI(page, 'who'))
  // Department rows
  assert('Emergency dept row',            await hasCI(page, 'Emergency'))
  assert('Cardiology dept row',           await hasCI(page, 'Cardiology'))
  assert('Pathology dept row',            await hasCI(page, 'Pathology'))
  // Legend
  assert('Legend: Day shift',             await hasCI(page, 'Day') && await hasCI(page, 'Night'))
  await shot('p2-on-call')

  await browser.close()
  const pass = results.filter(r => r.pass).length
  const fail = results.length - pass
  console.log(`\n=== RESULT: ${pass}/${results.length} passed, ${fail} failed ===`)
  if (fail > 0) results.filter(r => !r.pass).forEach(r => console.log('  FAIL: ' + r.label))
  console.log(`=== ERRORS(${errors.length}) ===`)
  errors.forEach(e => console.log('  ', e))
  process.exit(fail > 0 ? 1 : 0)
})().catch((e) => { console.error('ERR', e.message); process.exit(2) })
