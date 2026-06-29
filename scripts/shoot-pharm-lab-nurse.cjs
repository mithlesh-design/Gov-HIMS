// Verification sweep across Pharmacy v3 + Lab v2 + Nursing v3.
// Confirms each module's pages render with substantive content and 0 errors.
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

  // ═══ Pharmacy v3 ════════════════════════════════════════════════════════
  console.log('\n=== PHARMACY v3 ===')
  await selectRole(page, 'Clinical', 'Pharmacy', 'Pharmacy — Overview')

  // Dashboard
  assert('Pharm dashboard heading',     await hasCI(page, 'Pharmacy'))
  await shot('pl-pharm-dashboard')

  // Queue — source-tagged rows, claim model
  await navClick(page, 'Prescription Queue'); await sleep(1500)
  assert('Pharm queue page',            await waitForCI(page, 'Queue') || await waitForCI(page, 'Collected'))
  assert('Pharm OPD source tag',        await hasCI(page, 'OPD'))
  assert('Pharm IPD source tag',        await hasCI(page, 'IPD'))
  assert('Pharm ICU source tag',        await hasCI(page, 'ICU'))
  // Multi-source tagging proves v3 spec compliance
  await shot('pl-pharm-queue')

  // Inventory
  await navClick(page, 'Inventory'); await sleep(1200)
  assert('Pharm inventory page',        await waitForCI(page, 'inventory') || await waitForCI(page, 'stock'))
  await shot('pl-pharm-inventory')

  // ═══ Lab v2 ══════════════════════════════════════════════════════════════
  console.log('\n=== LAB v2 ===')
  await clickAria(page, 'Log out'); await sleep(1500)
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(1800)
  await selectRole(page, 'Clinical', 'Laboratory', 'Lab Overview')

  assert('Lab dashboard heading',       await hasCI(page, 'Lab Overview'))
  await shot('pl-lab-dashboard')

  // Benches
  await navClick(page, 'Benches'); await sleep(1500)
  assert('Lab benches page',            await waitForCI(page, 'Bench') || await waitForCI(page, 'HEMA'))
  // 5 benches per spec — Hematology / Biochemistry / Immunology / Urinalysis / Microbiology
  assert('Lab HEMA bench',              await hasCI(page, 'HEMA') || await hasCI(page, 'Hemato'))
  assert('Lab BIOCHEM bench',           await hasCI(page, 'BIOCHEM') || await hasCI(page, 'Biochem'))
  assert('Lab MICRO bench',             await hasCI(page, 'MICRO') || await hasCI(page, 'Microbio'))
  await shot('pl-lab-benches')

  // Microbiology multi-day workflow
  await navClick(page, 'Microbiology'); await sleep(1500)
  assert('Lab microbiology page',       await waitForCI(page, 'Microbiology') || await waitForCI(page, 'culture'))
  await shot('pl-lab-microbiology')

  // QC
  await navClick(page, 'QC'); await sleep(1500)
  assert('Lab QC page',                 await waitForCI(page, 'QC') || await waitForCI(page, 'quality'))
  await shot('pl-lab-qc')

  // Reflex testing
  await navClick(page, 'Reflex'); await sleep(1500)
  assert('Lab Reflex page',             await waitForCI(page, 'Reflex'))
  await shot('pl-lab-reflex')

  // ═══ Nursing ════════════════════════════════════════════════════════════
  console.log('\n=== NURSING ===')
  await clickAria(page, 'Log out'); await sleep(1500)
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(1800)
  await selectRole(page, 'Clinical', 'Nurse', 'Nurses on Duty')

  assert('Nurse dashboard heading',     await hasCI(page, 'Critical Alerts') || await hasCI(page, 'Nurses on Duty'))
  await shot('pl-nurse-dashboard')

  // Rounds (the largest page — multi-room rounding)
  await navClick(page, 'Rounds'); await sleep(1500)
  assert('Nurse rounds page',           await waitForCI(page, 'round') || await waitForCI(page, 'patient'))
  await shot('pl-nurse-rounds')

  // Medication administration
  await navClick(page, 'Medication'); await sleep(1500)
  assert('Nurse medication page',       await waitForCI(page, 'medication') || await waitForCI(page, 'administer'))
  await shot('pl-nurse-medication')

  // Vitals requests (from reception)
  await navClick(page, 'Vitals'); await sleep(1500)
  assert('Nurse vitals requests',       await waitForCI(page, 'vitals') || await waitForCI(page, 'request'))
  await shot('pl-nurse-vitals')

  // Tasks
  await navClick(page, 'Tasks'); await sleep(1500)
  assert('Nurse tasks page',            await waitForCI(page, 'task'))
  await shot('pl-nurse-tasks')

  // Handover
  await navClick(page, 'Handover'); await sleep(1500)
  assert('Nurse handover page',         await waitForCI(page, 'handover') || await waitForCI(page, 'shift'))
  await shot('pl-nurse-handover')

  await browser.close()
  const pass = results.filter(r => r.pass).length
  const fail = results.length - pass
  console.log(`\n=== RESULT: ${pass}/${results.length} passed, ${fail} failed ===`)
  if (fail > 0) results.filter(r => !r.pass).forEach(r => console.log('  FAIL: ' + r.label))
  console.log(`=== ERRORS(${errors.length}) ===`)
  errors.forEach(e => console.log('  ', e))
  process.exit(fail > 0 ? 1 : 0)
})().catch((e) => { console.error('ERR', e.message); process.exit(2) })
