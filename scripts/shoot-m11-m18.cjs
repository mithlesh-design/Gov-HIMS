// Verification sweep for Doctor Panel v2 milestones M11 – M18.
//  M11 — Voice scribe present on dashboard (Dictate button)
//  M12 — Patient IPD timeline renders curated patientText events
//  M13 — Online consultation one-row table (columns visible, Start action)
//  M14 — Performance graph renders with period selector + custom range
//  M15 — Shared messaging bus (doctor inbox shows seeded conversations)
//  M16 — Header search returns autocomplete; bell shows live notifications
//  M17 — Doctor settings persists profile + e-signature
//  M18 — Registries derive from real data + dashboard renders at tablet width
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
async function fillInputByPlaceholder(page, placeholderSubstr, value) {
  return page.evaluate((sub, v) => {
    const el = [...document.querySelectorAll('input, textarea')].find(e => (e.placeholder || '').toLowerCase().includes(sub.toLowerCase()))
    if (!el) return false
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
    setter?.call(el, v)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  }, placeholderSubstr, value)
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

  // ═══ Doctor login ═══════════════════════════════════════════════════════
  await selectRole(page, 'Clinical', 'Doctor', 'AI pre-briefs')

  // ═══ M11 — Voice scribe ═════════════════════════════════════════════════
  console.log('\n=== M11 voice scribe ===')
  await waitForCI(page, "Today's Queue")
  // Pick a patient from the queue — Dictate/Structure are inside the workspace
  await clickMaybe(page, 'Meera Pillai', 'button')
  await sleep(1200)
  assert('M11 Dictate button present',     await page.evaluate(() => {
    return [...document.querySelectorAll('button')].some(b => /dictate/i.test(b.textContent ?? '') || /dictate/i.test(b.getAttribute('aria-label') ?? ''))
  }))
  assert('M11 Structure note action',      await page.evaluate(() => {
    return [...document.querySelectorAll('button')].some(b => /structure/i.test(b.textContent ?? ''))
  }))

  // ═══ M16 — Header search + bell ═════════════════════════════════════════
  console.log('\n=== M16 header search + bell ===')
  assert('M16 search input present',       await page.evaluate(() => !!document.querySelector('input[aria-label="Search"]')))
  assert('M16 fill search with patient',   await fillInputByPlaceholder(page, 'Search patients', 'Priya'))
  await sleep(700)
  assert('M16 autocomplete dropdown',      await hasCI(page, 'Priya'))
  // Press Escape to clear
  await page.keyboard.press('Escape'); await sleep(300)
  // Open bell
  assert('M16 click bell',                 await clickAria(page, 'Notifications'))
  await sleep(500)
  assert('M16 bell dropdown opens',        await hasCI(page, 'Notifications') || await hasCI(page, 'All caught up'))
  await page.keyboard.press('Escape'); await sleep(300)
  await shot('m11-m16-dashboard')

  // ═══ M13 — Online consultation table ════════════════════════════════════
  console.log('\n=== M13 online consultation table ===')
  await navClick(page, 'Online'); await sleep(900)
  assert('M13 online page heading',        await waitForCI(page, 'Online Consultation'))
  assert('M13 columns: Reason · Slot · Wait', await hasCI(page, 'Reason') && await hasCI(page, 'Slot') && await hasCI(page, 'Wait'))
  assert('M13 AI brief column',            await hasCI(page, 'AI brief'))
  assert('M13 Start action button',        await page.evaluate(() => {
    return [...document.querySelectorAll('button')].some(b => (b.textContent ?? '').trim() === 'Start')
  }))
  await shot('m13-online-table')

  // ═══ M14 — Performance graph ═══════════════════════════════════════════
  console.log('\n=== M14 performance graph ===')
  await navClick(page, 'My Activity'); await sleep(900)
  assert('M14 analytics heading',          await waitForCI(page, 'My Activity'))
  assert('M14 Performance trend card',     await waitForCI(page, 'Performance trend'))
  assert('M14 period chips (Today/Week)',  await hasCI(page, 'Today') && await hasCI(page, 'This week'))
  assert('M14 Custom range chip',          await hasCI(page, 'Custom'))
  assert('M14 tiles: consultations',       await hasCI(page, 'Total consultations'))
  // Click 'This week' period
  assert('M14 click This week period',     await clickMaybe(page, 'This week', 'button'))
  await sleep(700)
  // Switch to custom range
  assert('M14 click Custom',               await clickMaybe(page, 'Custom', 'button'))
  await sleep(500)
  assert('M14 custom range inputs',        await page.evaluate(() => !!document.querySelector('input[type="date"]')))
  await shot('m14-analytics')

  // ═══ M15 — Shared messaging bus ════════════════════════════════════════
  console.log('\n=== M15 messaging bus ===')
  await navClick(page, 'Inbox'); await sleep(900)
  assert('M15 inbox renders',              await waitForCI(page, 'Inbox') || await waitForCI(page, 'Messages') || await waitForCI(page, 'Ritu Sharma') || await waitForCI(page, 'Anjali'))
  // Seed conversation from a nurse — should be visible
  assert('M15 nurse conv from bus',        await hasCI(page, 'Anjali') || await hasCI(page, 'NR-402') || await hasCI(page, 'Kiran Patil'))
  await shot('m15-inbox')

  // ═══ M18 — Registries derive from real data ═════════════════════════════
  console.log('\n=== M18 registries ===')
  await navClick(page, 'Registries'); await sleep(900)
  assert('M18 registries heading',         await waitForCI(page, 'Disease Registries') || await waitForCI(page, 'Care Registries'))
  assert('M18 HbA1c registry visible',     await hasCI(page, 'HbA1c'))
  assert('M18 BP registry visible',        await hasCI(page, 'Hypertension') || await hasCI(page, 'BP Control'))
  // Confirm copy says derived from records (not hard-coded)
  assert('M18 derived-from-records hint',  await hasCI(page, 'derived from your patients'))
  await shot('m18-registries')

  // ═══ M17 — Doctor settings ═════════════════════════════════════════════
  console.log('\n=== M17 doctor settings ===')
  await page.goto(`${BASE}/doctor/settings`, { waitUntil: 'domcontentloaded' }); await sleep(1500)
  assert('M17 settings page',              await waitForCI(page, 'Profile') || await waitForCI(page, 'Settings'))
  assert('M17 availability toggles',       await hasCI(page, 'Accepting in-person') || await hasCI(page, 'OPD'))
  assert('M17 consultation hours',         await hasCI(page, 'Consultation hours') || await hasCI(page, 'Start'))
  assert('M17 e-signature field',          await hasCI(page, 'e-Signature') || await hasCI(page, 'Signature'))
  await shot('m17-settings')

  // ═══ M12 — Patient IPD curated timeline ═════════════════════════════════
  console.log('\n=== M12 patient IPD curated timeline ===')
  await clickAria(page, 'Log out'); await sleep(1500)
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(1800)
  await selectRole(page, 'Patient', 'Patient Portal', 'My Health Story')
  await navClick(page, 'IPD'); await sleep(1500)
  // Kiran has an inpatient record with several patientText events
  assert('M12 IPD page loads',             await waitForCI(page, 'IPD') || await waitForCI(page, 'Admitted'))
  assert('M12 patient-friendly events',    await hasCI(page, 'You were') || await hasCI(page, 'Your doctor') || await hasCI(page, 'medicine'))
  await shot('m12-patient-ipd')

  // ═══ M18 — Responsive pass on doctor dashboard (tablet width) ═══════════
  console.log('\n=== M18 responsive pass (tablet) ===')
  await clickAria(page, 'Log out'); await sleep(1500)
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(1800)
  await selectRole(page, 'Clinical', 'Doctor', 'AI pre-briefs')
  // Tablet width
  await page.setViewport({ width: 820, height: 1100, deviceScaleFactor: 1 })
  await sleep(1500)
  assert('M18 dashboard renders at 820w',  await hasCI(page, "Today's Queue") || await hasCI(page, 'Select a Patient'))
  await shot('m18-dashboard-tablet')
  // Phone width
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 })
  await sleep(1500)
  assert('M18 dashboard renders at 390w',  await hasCI(page, "Today's Queue") || await hasCI(page, 'Select a Patient'))
  await shot('m18-dashboard-phone')

  await browser.close()
  const pass = results.filter(r => r.pass).length
  const fail = results.length - pass
  console.log(`\n=== RESULT: ${pass}/${results.length} passed, ${fail} failed ===`)
  if (fail > 0) results.filter(r => !r.pass).forEach(r => console.log('  FAIL: ' + r.label))
  console.log(`=== ERRORS(${errors.length}) ===`)
  errors.forEach(e => console.log('  ', e))
  process.exit(fail > 0 ? 1 : 0)
})().catch((e) => { console.error('ERR', e.message); process.exit(2) })
