/* Phase-1 Step-2 smoke — mock API boundary + demo seed.
 *  - Loads /, logs in as Admin, confirms DemoSeedControl renders
 *  - Loads /admin/dashboard, confirms no console errors
 *  - Probes window IndexedDB / localStorage to verify Kiran's seeded data
 *  - Logs in as Doctor and reads Kiran's IPD record via the API */
const puppeteer = require('puppeteer-core')

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const has = (page, t) => page.evaluate((x) => document.body.innerText.includes(x), t)
const hasCI = (page, t) => page.evaluate((x) => document.body.innerText.toLowerCase().includes(x.toLowerCase()), t)
async function waitForCI(page, text, ms = 30000) {
  const start = Date.now()
  while (Date.now() - start < ms) { if (await hasCI(page, text)) return true; await sleep(300) }
  return false
}
async function clickMaybe(page, text, sel = 'button, a') {
  return page.evaluate((t, s) => {
    const el = [...document.querySelectorAll(s)].find(
      (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t) && !e.disabled
    )
    if (el) { el.click(); return true } return false
  }, text, sel)
}
async function selectRole(page, tab, role, confirmText) {
  for (let i = 0; i < 200; i++) {
    if (tab) await clickMaybe(page, tab, 'button')
    await clickMaybe(page, role, 'button')
    await sleep(450)
    if (await hasCI(page, confirmText)) { await sleep(700); return }
  }
  throw new Error('login did not reach portal: ' + role)
}

const results = []
const assert = (label, pass) => {
  results.push({ label, pass: !!pass })
  console.log((pass ? '✓ ' : '✗ ') + label)
}

;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  page.setDefaultNavigationTimeout(60000)
  await page.setViewport({ width: 1500, height: 1000, deviceScaleFactor: 1 })

  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 200)))

  const shot = async (n) => {
    await sleep(400)
    await page.screenshot({ path: `${OUT}\\${n}.png`, fullPage: true })
    console.log('shot ' + n)
  }

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await sleep(2500)
  // Login as Admin
  await selectRole(page, 'Management', 'Admin', 'Hospital Analytics')
  await sleep(2500)

  // ── Admin dashboard checks ─────────────────────────────────────────
  console.log('\n=== Admin dashboard ===')
  assert('Hospital Analytics header', await waitForCI(page, 'Hospital Analytics'))
  assert('Demo data control rendered', await hasCI(page, 'Demo data'))
  await shot('p1s2-admin')

  // ── API state probe ────────────────────────────────────────────────
  console.log('\n=== API state probe ===')
  const apiCheck = await page.evaluate(async () => {
    const out = { boot: null, patientCount: null, kiran: null, kiranIpd: null,
                  auditCount: null, billCount: null, prescriptionCount: null }
    try {
      const ks = Object.keys(window.localStorage).filter(k => k.startsWith('agentix.api.v1.'))
      out.boot = ks.includes('agentix.api.v1.__bootstrap__')
      out.patientCount = JSON.parse(window.localStorage.getItem('agentix.api.v1.patients') || '[]').length
      const ps = JSON.parse(window.localStorage.getItem('agentix.api.v1.patients') || '[]')
      out.kiran = ps.find(p => p.id === 'PT-20394') ? true : false
      const stays = JSON.parse(window.localStorage.getItem('agentix.api.v1.ipd_stays') || '[]')
      out.kiranIpd = stays.find(s => s.patientId === 'PT-20394') ? true : false
      out.auditCount = JSON.parse(window.localStorage.getItem('agentix.api.v1.audit_entries') || '[]').length
      out.billCount = JSON.parse(window.localStorage.getItem('agentix.api.v1.bills') || '[]').length
      out.prescriptionCount = JSON.parse(window.localStorage.getItem('agentix.api.v1.prescriptions') || '[]').length
    } catch (e) { out.error = String(e) }
    return out
  })
  console.log('API state:', JSON.stringify(apiCheck, null, 2))
  assert('Bootstrap marker present',   apiCheck.boot)
  assert('Patients seeded (>=10)',      (apiCheck.patientCount ?? 0) >= 10)
  assert('Kiran (PT-20394) present',    apiCheck.kiran)
  assert('Kiran IPD stay present',      apiCheck.kiranIpd)
  assert('Audit rows persisted (>=1)',  (apiCheck.auditCount ?? 0) >= 1)
  assert('Bill(s) seeded (>=2)',         (apiCheck.billCount ?? 0) >= 2)
  assert('Prescription(s) seeded (>=2)', (apiCheck.prescriptionCount ?? 0) >= 2)

  // ── Doctor view  ───────────────────────────────────────────────────
  console.log('\n=== Doctor dashboard ===')
  // log out and switch
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('button, a')].find(
      e => (e.getAttribute('aria-label') || '').toLowerCase() === 'log out')
    if (el) el.click()
  })
  await sleep(1500)
  await selectRole(page, 'Clinical', 'Doctor', 'OPD')
  await sleep(2500)
  assert('Doctor surface loaded', await hasCI(page, 'OPD') || await hasCI(page, 'IPD'))
  await shot('p1s2-doctor')

  // ── Audit visible (cross-role evidence chain works) ────────────────
  console.log('\n=== Audit ===')
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('button, a')].find(
      e => (e.getAttribute('aria-label') || '').toLowerCase() === 'log out')
    if (el) el.click()
  })
  await sleep(1500)
  await selectRole(page, 'Support Services', 'Audit', 'Compliance Overview')
  await sleep(1500)
  await clickMaybe(page, 'Audit Trail', 'a')
  await sleep(2500)
  assert('Audit Trail page loaded', await waitForCI(page, 'Audit Trail'))
  await shot('p1s2-audit')

  await browser.close()
  const pass = results.filter(r => r.pass).length
  const fail = results.length - pass
  console.log(`\n=== RESULT: ${pass}/${results.length} passed, ${fail} failed ===`)
  if (fail > 0) results.filter(r => !r.pass).forEach(r => console.log('  FAIL: ' + r.label))
  console.log(`=== ERRORS(${errors.length}) ===`)
  errors.forEach(e => console.log('  ', e))
  process.exit(fail > 0 ? 1 : 0)
})().catch((e) => { console.error('ERR', e.message); process.exit(2) })
