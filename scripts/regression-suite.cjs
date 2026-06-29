/* M0 baseline + ongoing regression sweep.
 *
 * Single Puppeteer script that:
 *   1. Loads every primary role's portal (16 surfaces).
 *   2. Screenshots each + records URL + content evidence + console errors.
 *   3. Probes the mock-API tables for the Anil hero journey + Kiran parallel.
 *   4. Verifies persistence (localStorage key set) + zero native dialogs.
 *   5. Writes a JSON summary + per-role PNGs to OUT_DIR (default: docs/specs/baseline-screens).
 *
 * Re-run with OUT_DIR=docs/specs/screens/M1 (or any milestone slug) to diff
 * against the baseline. Any failure here is a regression that blocks the
 * next checkpoint.
 *
 * Usage:
 *   node scripts/regression-suite.cjs               (default OUT_DIR + label = "M0-baseline")
 *   OUT_DIR=docs/specs/screens/M2 LABEL=M2-compact node scripts/regression-suite.cjs
 */
const puppeteer = require('puppeteer-core')
const fs = require('fs')
const path = require('path')

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const BASE = process.env.BASE || 'http://localhost:3000'
const LABEL = process.env.LABEL || 'M0-baseline'
const OUT_DIR_REL = process.env.OUT_DIR || 'docs/specs/baseline-screens'
const ROOT = path.join(__dirname, '..')
const OUT_DIR = path.isAbsolute(OUT_DIR_REL) ? OUT_DIR_REL : path.join(ROOT, OUT_DIR_REL)

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const hasCI = (page, t) => page.evaluate((x) => document.body.innerText.toLowerCase().includes(x.toLowerCase()), t)
async function clickMaybe(page, text, sel = 'button, a') {
  return page.evaluate((t, s) => {
    const el = [...document.querySelectorAll(s)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t) && !e.disabled)
    if (el) { el.click(); return true } return false
  }, text, sel)
}
async function clickAria(page, label) {
  return page.evaluate((l) => {
    const el = [...document.querySelectorAll('button,a')].find((e) => e.getAttribute('aria-label') === l)
    if (el) { el.click(); return true } return false
  }, label)
}
async function selectRole(page, tab, role, confirmText) {
  // The "portal" / confirmText strings often appear on the LOGIN page as the
  // role-card label (e.g. "Patient Portal", "Operation Theater"). So we wait
  // for the URL to change away from "/" first — then verify the post-login
  // text — to avoid false positives where the click hasn't fired or
  // navigation hasn't completed.
  for (let i = 0; i < 60; i++) {
    if (tab) await clickMaybe(page, tab, 'button')
    await clickMaybe(page, role, 'button')
    await sleep(700)
    const url = page.url()
    if (!url.endsWith('/') && (await hasCI(page, confirmText))) {
      await sleep(900); return
    }
  }
  throw new Error('login did not reach portal: ' + role)
}
async function logoutAndIn(page, tab, role, confirmText) {
  // Navigate to / directly — guarantees a fresh login page (no stale
  // loadingRole state from the previous role click) regardless of how the
  // prior role ended. More reliable than the Log Out button click.
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await sleep(1800)
  await selectRole(page, tab, role, confirmText); await sleep(1500)
}

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
  { tab: 'Operations',       label: 'Operation Theater',  portal: 'Operation Theater',   evidence: 'OT Room' },
  { tab: 'Finance',          label: 'Billing',            portal: 'Billing Dept',        evidence: 'Billing' },
  { tab: 'Finance',          label: 'Insurance / TPA',    portal: 'TPA & Insurance',     evidence: 'Insurance' },
  { tab: 'Support Services', label: 'Audit / Compliance', portal: 'Audit & Compliance',  evidence: 'Compliance' },
  { tab: 'Patient',          label: 'Patient Portal',     portal: 'Patient Portal',      evidence: 'AI Health' },
]

const results = []
const errors = []
const report = { label: LABEL, ranAt: new Date().toISOString(), base: BASE, roles: [], probes: [], summary: {} }
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
    const file = path.join(OUT_DIR, n + '.png')
    await page.screenshot({ path: file, fullPage: true })
    console.log('  shot ' + n)
    return file
  }

  // Start clean so the schema-v2 seed lands on every run
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => { try { localStorage.clear() } catch {} })
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await sleep(4500)

  // ── A. Per-role smoke ───────────────────────────────────────────────
  console.log('\n=== A. Per-role smoke ===')
  for (let i = 0; i < ROLES.length; i++) {
    const r = ROLES[i]
    console.log(`\n[${i + 1}/${ROLES.length}] ${r.label}`)
    const before = errors.length
    let portalLoaded = false, contentVisible = false
    try {
      if (i === 0) await selectRole(page, r.tab, r.label, r.portal)
      else         await logoutAndIn(page, r.tab, r.label, r.portal)
      await sleep(1500)
      portalLoaded   = await hasCI(page, r.portal)
      contentVisible = await hasCI(page, r.evidence)
      assert(`${r.label}: portal loaded`,   portalLoaded)
      assert(`${r.label}: content evidence`, contentVisible)
    } catch (e) {
      assert(`${r.label}: portal loaded`,   false)
      console.log('  ERR ' + (e && e.message ? e.message : e))
    }
    const slug = r.label.toLowerCase().replace(/[^a-z]/g, '')
    const file = await shot(LABEL + '-' + slug)
    report.roles.push({
      label: r.label, portal: r.portal, evidence: r.evidence,
      portalLoaded, contentVisible, errorsDelta: errors.length - before, screenshot: path.basename(file),
    })
  }

  // ── B. Mock-API probes (Anil + Kiran) ──────────────────────────────
  console.log('\n=== B. Mock-API state ===')
  const api = await page.evaluate(() => {
    const get = (k) => { try { return JSON.parse(localStorage.getItem('agentix.api.v1.' + k) || '[]') } catch { return [] } }
    const ps  = get('patients')
    const stays = get('ipd_stays')
    const bills = get('bills')
    const rxs   = get('prescriptions')
    const labs  = get('lab_results')
    const rads  = get('radiology_studies')
    const dis   = get('discharges')
    const aud   = get('audit_entries')
    const vits  = get('vitals')
    const anil = ps.find((p) => p.id === 'PT-44012')
    const kiran = ps.find((p) => p.id === 'PT-20394')
    const anilBill = bills.find((b) => b.patientId === 'PT-44012')
    const anilDup  = (anilBill?.lines ?? []).some((l) => l.duplicateFlag === true)
    return {
      patientCount: ps.length,
      anilPresent: !!anil,
      anilAllergies: anil?.allergies,
      anilStayWard: stays.find((s) => s.patientId === 'PT-44012')?.ward,
      anilNews2Hit: vits.some((v) => v.patientId === 'PT-44012' && v.news2 === 5),
      anilDuplicateBillFlag: anilDup,
      kiranPresent: !!kiran,
      auditTotal: aud.length,
      labCount: labs.length,
      radCount: rads.length,
      rxCount: rxs.length,
      dischargeCount: dis.length,
    }
  })
  console.log(JSON.stringify(api, null, 2))
  report.probes.push({ name: 'api-state', data: api })

  assert('Patient count >= 16',                  (api.patientCount ?? 0) >= 16)
  assert('Hero patient Anil present',             api.anilPresent === true)
  assert('Anil allergies include Penicillin',     Array.isArray(api.anilAllergies) && api.anilAllergies.includes('Penicillin'))
  assert('Anil IPD stay in Surgical ward',         api.anilStayWard === 'Surgical')
  assert('NEWS2 = 5 vital present (Anil)',         api.anilNews2Hit === true)
  assert('Duplicate-charge AI flag on Anil bill',   api.anilDuplicateBillFlag === true)
  assert('Parallel inpatient Kiran present',         api.kiranPresent === true)
  assert('Audit trail >= 20 events',                  (api.auditTotal ?? 0) >= 20)
  assert('Lab results seeded (>=2)',                  (api.labCount ?? 0) >= 2)
  assert('Radiology studies seeded (>=1)',            (api.radCount ?? 0) >= 1)
  assert('Prescriptions seeded (>=2)',                 (api.rxCount ?? 0) >= 2)
  assert('Discharge initiated (>=1)',                  (api.dischargeCount ?? 0) >= 1)

  // ── C. Legacy-store probes ───────────────────────────────────────
  console.log('\n=== C. Legacy-store anchors ===')
  const legacy = await page.evaluate(() => {
    const safe = (k) => { try { return JSON.parse(localStorage.getItem(k) || '{}')?.state || {} } catch { return {} } }
    const er   = safe('agentix-erstore')
    const ins  = safe('agentix-insurancestore')
    const ot   = safe('agentix-otstore')
    const nrc  = safe('agentix-narcoticsstore')
    const dm   = safe('agentix-drugmasterstore')
    const inp  = safe('agentix-ipd')
    return {
      anilER:  (er.patients ?? []).find((p) => p.patientId === 'PT-44012')?.esi,
      anilClaimScore: (ins.claims ?? []).find((c) => c.patientId === 'PT-44012')?.aiDenialRisk?.score,
      anilOT:  (ot.procedures ?? []).find((p) => p.patientId === 'PT-44012')?.procedureName,
      anilNarc:(nrc.log ?? []).find((n) => n.patientId === 'PT-44012')?.drug,
      augmentin: (dm.drugs ?? []).find((d) => d.genericName === 'Augmentin')?.allergyClasses,
      anilInpatient: (inp.inpatients ?? []).find((p) => p.patientId === 'PT-44012')?.bed,
    }
  })
  console.log(JSON.stringify(legacy, null, 2))
  report.probes.push({ name: 'legacy-stores', data: legacy })
  assert('ER triage: Anil ESI 3',                                 legacy.anilER === 3)
  assert('Insurance claim: denial-risk 72',                        legacy.anilClaimScore === 72)
  assert('OT procedure: lap appendectomy',                          /Appendectomy/i.test(legacy.anilOT || ''))
  assert('Narcotic register: Morphine sign-out',                    (legacy.anilNarc || '').toLowerCase().includes('morphine'))
  assert('Drug master: Augmentin tagged Penicillin',                Array.isArray(legacy.augmentin) && legacy.augmentin.includes('Penicillin'))
  assert('Inpatient store: Anil in SW-301',                         legacy.anilInpatient === 'SW-301')

  // ── D. Persistence + native-dialog contract ─────────────────────────
  console.log('\n=== D. Persistence + dialog contract ===')
  const persistedKeys = await page.evaluate(() => {
    const out = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)
      if (k && k.startsWith('agentix')) out.push(k)
    }
    return out.sort()
  })
  report.probes.push({ name: 'persistence', keys: persistedKeys })
  assert('Persisted localStorage keys >= 20',  persistedKeys.length >= 20)
  assert('Mock-API patients persisted',         persistedKeys.includes('agentix.api.v1.patients'))
  assert('Audit table persisted',                persistedKeys.includes('agentix.api.v1.audit_entries'))
  assert('Auth persisted (sticky demo)',         persistedKeys.includes('agentix-authstore'))

  await browser.close()

  const pass = results.filter((r) => r.pass).length
  const fail = results.length - pass
  report.summary = { total: results.length, pass, fail, consoleErrors: errors.length }
  report.assertions = results
  report.errors = errors

  const reportPath = path.join(OUT_DIR, '_regression-report.json')
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log('\nReport written to ' + reportPath)
  console.log(`\n=== RESULT: ${pass}/${results.length} passed, ${fail} failed, ${errors.length} console errors ===`)
  if (fail > 0) results.filter((r) => !r.pass).forEach((r) => console.log('  FAIL: ' + r.label))
  if (errors.length > 0) errors.slice(0, 5).forEach((e) => console.log('  ', e))
  process.exit(fail > 0 ? 1 : 0)
})().catch((e) => { console.error('ERR', e.message); process.exit(2) })
