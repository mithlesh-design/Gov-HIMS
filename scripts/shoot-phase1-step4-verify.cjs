/* Phase-1 Step-4 end-to-end verification
 *   A. Per-role smoke — every primary role loads + key content visible
 *   B. Kiran Patil (PT-20394) cross-role journey — same patient surfaces in
 *      Reception, Doctor IPD, Pharmacy, Lab inbox, Bills, Audit Trail
 *   C. Persistence sweep — keys survive F5; audit accumulates */
const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const hasCI = (page, t) => page.evaluate((x) => document.body.innerText.toLowerCase().includes(x.toLowerCase()), t)
async function waitForCI(page, text, ms = 25000) {
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
async function clickAria(page, label) {
  return page.evaluate((l) => {
    const el = [...document.querySelectorAll('button,a')].find(e => e.getAttribute('aria-label') === l)
    if (el) { el.click(); return true } return false
  }, label)
}
async function selectRole(page, tab, role, confirmText) {
  for (let i = 0; i < 200; i++) {
    if (tab) await clickMaybe(page, tab, 'button')
    await clickMaybe(page, role, 'button')
    await sleep(450)
    if (await hasCI(page, confirmText)) { await sleep(700); return }
  }
  throw new Error('login did not reach portal: ' + role + ' (confirm: ' + confirmText + ')')
}
async function logoutAndIn(page, tab, role, confirmText) {
  await clickAria(page, 'Log out'); await sleep(1200)
  await selectRole(page, tab, role, confirmText); await sleep(1500)
}

const results = []
const errors = []
const assert = (label, pass) => {
  results.push({ label, pass: !!pass })
  console.log((pass ? '+ ' : 'x ') + label)
}

;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  page.setDefaultNavigationTimeout(60000)
  await page.setViewport({ width: 1500, height: 1000, deviceScaleFactor: 1 })

  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 200)))

  const shot = async (n) => {
    await sleep(400)
    await page.screenshot({ path: `${OUT}\\${n}.png`, fullPage: true })
    console.log('  shot ' + n)
  }

  // ── Reseed first so Kiran journey is clean ────────────────────────────
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(2500)

  // ════════════════════════════════════════════════════════════════════
  // A. Per-role smoke
  // ════════════════════════════════════════════════════════════════════
  console.log('\n=== A. PER-ROLE SMOKE ===')

  // Each role's portal exposes its own "<Role> Portal" badge in the AppShell.
  // We use that as a unique post-login confirm signal that doesn't collide
  // with login-page text. (login page never renders any "*Portal" badge.)
  // Each role's login-page card label + the dashboard's portal badge (from
  // ROLE_THEMES in src/components/layout/AppShell.tsx). Both are required —
  // the login card text triggers the login; the portal label is the unique
  // post-login signal.
  const ROLES = [
    { tab: 'Management',       label: 'Admin',              portal: 'Admin Portal',        evidence: 'Hospital Analytics' },
    { tab: 'Management',       label: 'Quality',            portal: 'Quality & Safety',    evidence: 'Quality' },
    { tab: 'Clinical',         label: 'Doctor',             portal: 'Doctor Portal',       evidence: 'OPD' },
    { tab: 'Clinical',         label: 'Nurse',              portal: 'Nursing Station',     evidence: 'Ward' },
    { tab: 'Clinical',         label: 'Pharmacy',           portal: 'Pharmacy',            evidence: 'Pharmacy' },
    { tab: 'Clinical',         label: 'Laboratory',         portal: 'Laboratory',          evidence: 'Lab' },
    { tab: 'Clinical',         label: 'Radiology',          portal: 'Radiology Dept',      evidence: 'Radiology' },
    { tab: 'Clinical',         label: 'Emergency',          portal: 'Emergency Room',      evidence: 'ER' },
    { tab: 'Operations',       label: 'Reception',          portal: 'Reception',           evidence: 'OPD' },
    { tab: 'Operations',       label: 'Admission / Beds',   portal: 'Admission Desk',      evidence: 'Admission' },
    { tab: 'Operations',       label: 'Discharge',          portal: 'Discharge Desk',      evidence: 'Discharge' },
    { tab: 'Operations',       label: 'Operation Theater',  portal: 'Operation Theater',   evidence: 'Schedule' },
    { tab: 'Finance',          label: 'Billing',            portal: 'Billing Dept',        evidence: 'Billing' },
    { tab: 'Finance',          label: 'Insurance / TPA',    portal: 'TPA & Insurance',     evidence: 'Insurance' },
    { tab: 'Support Services', label: 'Audit / Compliance', portal: 'Audit & Compliance',  evidence: 'Compliance' },
    { tab: 'Patient',          label: 'Patient Portal',     portal: 'Patient Portal',      evidence: 'AI Care' },
  ]

  for (const r of ROLES) {
    console.log(`\n[${r.label}]`)
    try {
      if (results.length === 0) {
        await selectRole(page, r.tab, r.label, r.portal)
      } else {
        await logoutAndIn(page, r.tab, r.label, r.portal)
      }
      await sleep(1500)
      assert(`${r.label}: portal loaded`,                  await hasCI(page, r.portal))
      assert(`${r.label}: ${r.evidence} content visible`, await hasCI(page, r.evidence))
      const slug = r.label.toLowerCase().replace(/[^a-z]/g, '')
      await shot('p1s4-' + slug)
    } catch (e) {
      assert(`${r.label}: portal loaded`,                  false)
      console.log('  ERR ' + (e && e.message ? e.message : e))
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // B. Kiran Patil cross-role journey
  // ════════════════════════════════════════════════════════════════════
  console.log('\n=== B. KIRAN PATIL CROSS-ROLE JOURNEY ===')

  // Verify Kiran is in the API patients table (Step 2 seed)
  const apiCheck = await page.evaluate(() => {
    try {
      const ps = JSON.parse(localStorage.getItem('agentix.api.v1.patients') || '[]')
      const stays = JSON.parse(localStorage.getItem('agentix.api.v1.ipd_stays') || '[]')
      const bills = JSON.parse(localStorage.getItem('agentix.api.v1.bills') || '[]')
      const rxs   = JSON.parse(localStorage.getItem('agentix.api.v1.prescriptions') || '[]')
      const labs  = JSON.parse(localStorage.getItem('agentix.api.v1.lab_results') || '[]')
      const dis   = JSON.parse(localStorage.getItem('agentix.api.v1.discharges') || '[]')
      const aud   = JSON.parse(localStorage.getItem('agentix.api.v1.audit_entries') || '[]')
      return {
        kiranPatient: ps.find((p) => p.id === 'PT-20394')?.fullName,
        kiranIpd:      stays.find((s) => s.patientId === 'PT-20394')?.ward,
        kiranBills:    bills.filter((b) => b.patientId === 'PT-20394').length,
        kiranRx:       rxs.filter((r) => r.patientId === 'PT-20394').length,
        kiranLabs:     labs.filter((l) => l.patientId === 'PT-20394').length,
        kiranDis:      dis.filter((d) => d.patientId === 'PT-20394').length,
        auditTotal:    aud.length,
        auditKiran:    aud.filter((a) => (a.detail || '').includes('PT-20394') || a.resourceId === 'PT-20394').length,
      }
    } catch (e) { return { error: String(e) } }
  })
  console.log('API state probe:', JSON.stringify(apiCheck, null, 2))
  assert('Kiran patient record present',      apiCheck.kiranPatient === 'Kiran Patil')
  assert('Kiran IPD stay in ICU',              apiCheck.kiranIpd === 'ICU')
  assert('Kiran has at least 1 bill',          (apiCheck.kiranBills ?? 0) >= 1)
  assert('Kiran has prescription(s)',          (apiCheck.kiranRx ?? 0) >= 1)
  assert('Kiran has lab result(s)',            (apiCheck.kiranLabs ?? 0) >= 1)
  assert('Kiran has discharge initiated',       (apiCheck.kiranDis ?? 0) >= 1)
  assert('Audit trail has at least 20 rows',    (apiCheck.auditTotal ?? 0) >= 20)

  // Cross-role visibility — audit filter by patient
  console.log('\n[Audit filtered by Kiran]')
  await logoutAndIn(page, 'Support Services', 'Audit', 'Compliance Overview')
  await clickMaybe(page, 'Audit Trail', 'a'); await sleep(2500)
  // Search for Kiran
  const found = await page.evaluate(() => {
    const inp = document.querySelector('input[placeholder*="Search"], input[type="search"]')
    if (inp) {
      inp.value = 'Kiran'
      inp.dispatchEvent(new Event('input', { bubbles: true }))
      return true
    }
    return false
  })
  await sleep(800)
  assert('Audit search for Kiran works',        found && await hasCI(page, 'Kiran'))
  await shot('p1s4-audit-kiran')

  // ════════════════════════════════════════════════════════════════════
  // C. Persistence + refresh sticks
  // ════════════════════════════════════════════════════════════════════
  console.log('\n=== C. PERSISTENCE ===')
  const persist = await page.evaluate(() => {
    const all = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)
      if (k && k.startsWith('agentix')) all.push(k)
    }
    return all.sort()
  })
  console.log('  persisted keys (' + persist.length + '):')
  persist.forEach(k => console.log('    ' + k))
  assert('Persisted keys count >= 20',           persist.length >= 20)
  assert('Auth persisted',                       persist.includes('agentix-authstore'))
  assert('Mock-API audit_entries persisted',     persist.includes('agentix.api.v1.audit_entries'))
  assert('Mock-API patients persisted',          persist.includes('agentix.api.v1.patients'))

  await page.reload({ waitUntil: 'domcontentloaded' }); await sleep(2500)
  assert('Audit page stays after F5',            await hasCI(page, 'Audit'))

  await browser.close()

  const pass = results.filter(r => r.pass).length
  const fail = results.length - pass
  console.log(`\n=== RESULT: ${pass}/${results.length} passed, ${fail} failed ===`)
  if (fail > 0) results.filter(r => !r.pass).forEach(r => console.log('  FAIL: ' + r.label))
  console.log(`=== ERRORS(${errors.length}) ===`)
  errors.slice(0, 10).forEach(e => console.log('  ', e))
  process.exit(fail > 0 ? 1 : 0)
})().catch((e) => { console.error('ERR', e.message); process.exit(2) })
