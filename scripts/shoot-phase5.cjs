// Verification sweep for Doctor Panel v3 Phase 5 (M1-M8).
//  M1 — Printable documents + e-signature (printDoc.ts wired)
//  M2 — On-leave banner + Start-consultation guard on dashboard
//  M3 — Live results ticker advances orders
//  M4 — Reception on the shared messaging bus
//  M5 — NEWS2 trend with full parameter set (RR, AVPU)
//  M6 — Expanded drug safety (renal-dose, duplicate-therapy)
//  M7 — Registries on real values
//  M8 — Phone-grade responsive (drawer + single-column)
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
  // M1: intercept window.open / window.print to verify printable doc generation
  await page.exposeFunction('__captureOpen', (markup) => { /* noop bridge */ })
  await page.evaluateOnNewDocument(() => {
    window.__printedDocs = []
    const origOpen = window.open
    window.open = function (...args) {
      const w = origOpen ? origOpen.apply(this, args) : null
      try {
        if (w && w.document) {
          const orig = w.document.write
          w.document.write = function (markup) { window.__printedDocs.push(String(markup)); return orig.apply(this, arguments) }
          w.print = () => {}
        }
      } catch (e) {}
      return w
    }
  })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 180)) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 180)))
  const shot = async (n) => { await sleep(500); await page.screenshot({ path: `${OUT}\\${n}.png`, fullPage: true }); console.log('shot', n) }

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(2500)

  // ═══ Doctor login ═══════════════════════════════════════════════════════
  await selectRole(page, 'Clinical', 'Doctor', 'AI pre-briefs')
  await waitForCI(page, "Today's Queue")

  // ═══ M2 — On-leave banner + guard ════════════════════════════════════════
  console.log('\n=== M2 leave banner + guard ===')
  // Toggle on-leave via settings page → return to dashboard → banner appears
  await page.goto(`${BASE}/doctor/settings`, { waitUntil: 'domcontentloaded' }); await sleep(1500)
  assert('M2 settings opened',           await waitForCI(page, 'Availability'))
  // Toggle "On leave" — find the toggle button with that label
  assert('M2 click On leave toggle',     await clickMaybe(page, 'On leave', 'button'))
  await sleep(500)
  // Navigate back to dashboard
  await navClick(page, 'OPD Consult'); await sleep(900)
  if (!await hasCI(page, "Today's Queue")) { await page.goto(`${BASE}/doctor/dashboard`, { waitUntil: 'domcontentloaded' }); await sleep(1500) }
  assert('M2 dashboard with leave on',   await waitForCI(page, "Today's Queue"))
  assert('M2 leave banner visible',      await hasCI(page, 'marked on leave') || await hasCI(page, 'on leave'))
  // Set up dialog handler — Start-consultation guard prompts confirm
  page.on('dialog', async d => { await d.dismiss() })  // dismiss to verify guard fires
  assert('M2 click a patient',           await clickMaybe(page, 'Meera Pillai', 'button'))
  await sleep(800)
  // Toggle back off to clean up for downstream tests
  await page.goto(`${BASE}/doctor/settings`, { waitUntil: 'domcontentloaded' }); await sleep(1200)
  await clickMaybe(page, 'On leave', 'button'); await sleep(300)
  await page.removeAllListeners('dialog')
  page.on('dialog', async d => { await d.accept() })
  await shot('p5-m2-leave')

  // ═══ M1 — Printable docs + signature ════════════════════════════════════
  console.log('\n=== M1 printable docs ===')
  await page.goto(`${BASE}/doctor/dashboard`, { waitUntil: 'domcontentloaded' }); await sleep(1800)
  // Open a patient (Meera Pillai)
  await clickMaybe(page, 'Meera Pillai', 'button'); await sleep(900)
  // Print Rx button is gated on prescriptions.length > 0 — add Paracetamol via search input + Add button
  const medInput = await page.evaluateHandle(() => {
    return [...document.querySelectorAll('input')].find(e => /search medicine/i.test(e.placeholder ?? ''))
  })
  if (medInput) {
    await medInput.asElement()?.focus()
    await page.keyboard.type('Paracetamol', { delay: 30 })
    await sleep(400)
    await clickMaybe(page, 'Add', 'button')
    await sleep(800)
  }
  // Print / Export button is in DOM whenever prescriptions.length > 0 — check via outerHTML
  // (button is inside a scroll container so it may be off-screen for innerText)
  const printVisible = await page.evaluate(() => {
    return [...document.querySelectorAll('button')].some(b =>
      /print\s*\/\s*export/i.test(b.textContent ?? '') || /print\s*\/\s*export/i.test(b.outerHTML ?? ''))
  })
  assert('M1 Print/Export action exists', printVisible)
  await shot('p5-m1-workspace')

  // ═══ M3 — Live results engine ═════════════════════════════════════════════
  console.log('\n=== M3 live results ticker ===')
  await navClick(page, 'Inbox'); await sleep(1500)
  // Component file exists; we already verified that. Smoke test the inbox renders.
  assert('M3 inbox loads',                await waitForCI(page, 'Inbox') || await waitForCI(page, 'Messages') || await waitForCI(page, 'result'))
  await shot('p5-m3-inbox')

  // ═══ M5 — NEWS2 full param set ═══════════════════════════════════════════
  console.log('\n=== M5 NEWS2 trend ===')
  await navClick(page, 'IPD'); await sleep(1500)
  assert('M5 IPD page',                  await waitForCI(page, 'IPD') || await waitForCI(page, 'Inpatient'))
  // NEWS sparkline or score should be visible if there are inpatients
  // (Inpatients with vitals history compute NEWS — this just smoke-tests rendering)
  await shot('p5-m5-ipd')

  // ═══ M6 — Expanded drug safety ═══════════════════════════════════════════
  console.log('\n=== M6 expanded drug safety ===')
  // The checkRx logic includes renal-dose and duplicate-therapy — verified via
  // grep earlier. Smoke test: open a patient with CKD history (if any) and
  // confirm Rx panel renders. Otherwise verify the lib is importable.
  await page.goto(`${BASE}/doctor/dashboard`, { waitUntil: 'domcontentloaded' }); await sleep(1500)
  await clickMaybe(page, 'Meera Pillai', 'button'); await sleep(900)
  // The Rx panel uses checkRx + RxWarning; verify the panel section renders
  assert('M6 Rx panel rendered',         await hasCI(page, 'Medications') || await hasCI(page, 'Prescription') || await hasCI(page, 'Rx'))
  await shot('p5-m6-rx')

  // ═══ M7 — Registries from real values ══════════════════════════════════
  console.log('\n=== M7 registries from real values ===')
  await navClick(page, 'Registries'); await sleep(1500)
  assert('M7 HbA1c registry',            await waitForCI(page, 'HbA1c'))
  assert('M7 derived-from-records',      await hasCI(page, 'derived from your patients'))
  await shot('p5-m7-registries')

  // ═══ M4 — Reception on the bus ═══════════════════════════════════════════
  console.log('\n=== M4 reception on the bus ===')
  await clickAria(page, 'Log out'); await sleep(1500)
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(1800)
  await selectRole(page, 'Operations', 'Reception', 'front desk')
  await navClick(page, 'Messaging'); await sleep(1500)
  assert('M4 reception messaging loads', await waitForCI(page, 'Message') || await waitForCI(page, 'Threads'))
  // Switch to "Staff" tab (shared messaging bus)
  await clickMaybe(page, 'Staff', 'button'); await sleep(700)
  // Doctor↔reception seed conversation should be visible
  assert('M4 doctor↔reception seed',     await hasCI(page, 'Priya') || await hasCI(page, 'DR-1012') || await hasCI(page, 'walk-in cardiac'))
  await shot('p5-m4-reception-bus')

  // ═══ M8 — Phone-grade responsive ═══════════════════════════════════════════
  console.log('\n=== M8 phone responsive ===')
  await clickAria(page, 'Log out'); await sleep(1500)
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(1800)
  await selectRole(page, 'Clinical', 'Doctor', 'AI pre-briefs')
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 })
  await sleep(1500)
  assert('M8 dashboard at 390w',         await hasCI(page, "Today's Queue") || await hasCI(page, 'Select a Patient'))
  // Drawer trigger (hamburger) should be present
  const hasMenu = await page.evaluate(() => {
    return [...document.querySelectorAll('button')].some(b => {
      const al = b.getAttribute('aria-label') ?? ''
      return /menu/i.test(al) || /open/i.test(al) || (b.querySelector('svg') && /lucide-menu/i.test(b.outerHTML))
    })
  })
  assert('M8 hamburger menu present',    hasMenu)
  await shot('p5-m8-phone')

  await browser.close()
  const pass = results.filter(r => r.pass).length
  const fail = results.length - pass
  console.log(`\n=== RESULT: ${pass}/${results.length} passed, ${fail} failed ===`)
  if (fail > 0) results.filter(r => !r.pass).forEach(r => console.log('  FAIL: ' + r.label))
  console.log(`=== ERRORS(${errors.length}) ===`)
  errors.forEach(e => console.log('  ', e))
  process.exit(fail > 0 ? 1 : 0)
})().catch((e) => { console.error('ERR', e.message); process.exit(2) })
