/* Anil Kumar Verma — hero-patient journey verification.
 *  Confirms: API tables contain Anil's full thread; legacy stores have ER triage,
 *  OT procedure with WHO, insurance claim @ denial-risk 0.72, narcotic register row,
 *  Augmentin in drug master tagged with penicillin, duplicate OT-consumable bill
 *  line flagged, NEWS2=5 vital captured; audit trail filter shows the journey. */
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
    const el = [...document.querySelectorAll(s)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t) && !e.disabled)
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

  const shot = async (n) => { await sleep(400); await page.screenshot({ path: `${OUT}\\${n}.png`, fullPage: true }); console.log('  shot ' + n) }

  // Clear localStorage so the new schema seed kicks in clean
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => { localStorage.clear() })
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await sleep(5000)  // give bootstrap a beat

  // ── API-state probe ───────────────────────────────────────────────────
  console.log('\n=== API state ===')
  const api = await page.evaluate(() => {
    const get = (key) => { try { return JSON.parse(localStorage.getItem('agentix.api.v1.' + key) || '[]') } catch { return [] } }
    const ps = get('patients'), bills = get('bills'), rxs = get('prescriptions'),
          labs = get('lab_results'), rads = get('radiology_studies'), dis = get('discharges'),
          stays = get('ipd_stays'), vits = get('vitals'), aud = get('audit_entries'),
          orders = get('orders'), enc = get('encounters'), claims = get('pharmacy_claims'),
          beds = get('beds')
    const anil = ps.find((p) => p.id === 'PT-44012')
    const anilStay = stays.find((s) => s.patientId === 'PT-44012')
    const anilBill = bills.find((b) => b.patientId === 'PT-44012')
    const anilVits = vits.filter((v) => v.patientId === 'PT-44012')
    const news2_5 = anilVits.find((v) => v.news2 === 5)
    const dupLine = (anilBill?.lines ?? []).find((l) => l.duplicateFlag === true)
    const anilAud = aud.filter((a) =>
      a.resourceId === 'PT-44012' || (a.detail || '').includes('PT-44012') || (a.detail || '').includes('Anil'))
    return {
      anil_name: anil?.fullName,
      anil_age: anil?.age,
      anil_hn: anil?.hn,
      anil_payer: anil?.primaryPayer,
      anil_insurer: anil?.insurerName,
      anil_allergies: anil?.allergies,
      stay_ward: anilStay?.ward,
      stay_bed: anilStay?.bedId,
      vitals_count: anilVits.length,
      news2_5_present: !!news2_5,
      news2_5_values: news2_5 ? { hr: news2_5.hr, rr: news2_5.rr, spo2: news2_5.spo2, temp: news2_5.temp } : null,
      orders_count: orders.filter((o) => o.patientId === 'PT-44012').length,
      labs_count:   labs.filter((l) => l.patientId === 'PT-44012').length,
      rads_count:   rads.filter((r) => r.patientId === 'PT-44012').length,
      rx_count:     rxs.filter((r) => r.patientId === 'PT-44012').length,
      rx_augmentin_draft: rxs.some((r) => r.patientId === 'PT-44012' &&
        (r.lines ?? []).some((ln) => (ln.drugName || '').toLowerCase().includes('augmentin'))),
      rx_safe_signed:     rxs.some((r) => r.patientId === 'PT-44012' && r.status === 'signed' &&
        (r.lines ?? []).some((ln) => (ln.drugName || '').toLowerCase().includes('cipro'))),
      pharmacy_claims:    claims.filter((c) => c.patientId === 'PT-44012').length,
      bill_total:         anilBill?.total,
      duplicate_flagged:  !!dupLine,
      discharges:         dis.filter((d) => d.patientId === 'PT-44012').length,
      total_patients:     ps.length,
      total_beds:         beds.length,
      total_audit:        aud.length,
      anil_audit_count:   anilAud.length,
      legacy_seed_marker: !!localStorage.getItem('agentix.legacy-seed.anil-v2'),
    }
  })
  console.log(JSON.stringify(api, null, 2))

  assert('Anil patient exists', api.anil_name === 'Anil Kumar Verma')
  assert('Anil age 38',         api.anil_age === 38)
  assert('Anil HN KH-2026-04412', api.anil_hn === 'KH-2026-04412')
  assert('Anil payer insurance', api.anil_payer === 'insurance')
  assert('Anil insurer Star Health', api.anil_insurer === 'Star Health')
  assert('Anil allergies include Penicillin', Array.isArray(api.anil_allergies) && api.anil_allergies.includes('Penicillin'))
  assert('Anil IPD stay in Surgical ward',     api.stay_ward === 'Surgical')
  assert('Anil bed SW-301',                     api.stay_bed === 'BED-SUR-1')
  assert('Vitals captured (>= 5)',              (api.vitals_count ?? 0) >= 5)
  assert('NEWS2 = 5 vital present',             api.news2_5_present === true)
  assert('Orders >= 2 (lab + radiology)',       (api.orders_count ?? 0) >= 2)
  assert('Lab results >= 2 (CBC + CRP)',        (api.labs_count ?? 0) >= 2)
  assert('Radiology study >= 1 (USG)',           (api.rads_count ?? 0) >= 1)
  assert('Rx count >= 2 (Augmentin draft + safe regimen)', (api.rx_count ?? 0) >= 2)
  assert('Augmentin draft Rx present',           api.rx_augmentin_draft === true)
  assert('Safe regimen (Cipro/Metro) signed',    api.rx_safe_signed === true)
  assert('Pharmacy claim created',                (api.pharmacy_claims ?? 0) >= 1)
  assert('Bill total > 0',                         (api.bill_total ?? 0) > 0)
  assert('Duplicate-charge AI flag present',     api.duplicate_flagged === true)
  assert('Discharge initiated',                    (api.discharges ?? 0) >= 1)
  assert('Total patient count >= 16',              (api.total_patients ?? 0) >= 16)
  assert('Audit trail accumulating',               (api.total_audit ?? 0) >= 20)
  assert('Anil-tagged audit events >= 4',          (api.anil_audit_count ?? 0) >= 4)
  assert('Legacy-store seed marker set',           api.legacy_seed_marker === true)

  // ── Legacy-store state ────────────────────────────────────────────────
  console.log('\n=== Legacy stores ===')
  const legacy = await page.evaluate(() => {
    const safeGet = (key) => { try { return JSON.parse(localStorage.getItem(key) || '{}') } catch { return {} } }
    const er  = safeGet('agentix-erstore')?.state || {}
    const ins = safeGet('agentix-insurancestore')?.state || {}
    const ot  = safeGet('agentix-otstore')?.state || {}
    const nrc = safeGet('agentix-narcoticsstore')?.state || {}
    const drg = safeGet('agentix-drugmasterstore')?.state || {}
    const adm = safeGet('agentix-admissionstore')?.state || {}
    const findAnilER  = (er.patients  ?? []).find((p) => p.patientId === 'PT-44012')
    const findAnilCLM = (ins.claims   ?? []).find((c) => c.patientId === 'PT-44012')
    const findAnilOT  = (ot.procedures?? []).find((p) => p.patientId === 'PT-44012')
    const findNarc    = (nrc.log      ?? []).find((n) => n.patientId === 'PT-44012')
    const augmentin   = (drg.drugs    ?? []).find((d) => d.genericName === 'Augmentin')
    const findAdmReq  = (adm.admissionRequests ?? []).find((r) => r.patientId === 'PT-44012')
    return {
      er_anil_esi: findAnilER?.esi,
      er_anil_phase: findAnilER?.phase,
      claim_score:    findAnilCLM?.aiDenialRisk?.score,
      claim_provider: findAnilCLM?.provider,
      claim_documents_pending: ((findAnilCLM?.documents ?? []).filter((d) => d.status !== 'verified')).length,
      ot_procedure_name: findAnilOT?.procedureName,
      ot_status:         findAnilOT?.status,
      who_items_checked: (findAnilOT?.whoChecklist ?? []).filter((x) => x.checked).length,
      who_phases:        Array.from(new Set((findAnilOT?.whoChecklist ?? []).map((x) => x.phase))),
      narc_drug:         findNarc?.drug,
      narc_witness:      findNarc?.secondSignatory,
      augmentin_id:      augmentin?.id,
      augmentin_allergy: augmentin?.allergyClasses,
      adm_status:        findAdmReq?.status,
      adm_assigned_bed:  findAdmReq?.assignedBedId,
    }
  })
  console.log(JSON.stringify(legacy, null, 2))

  assert('ER triage row: Anil ESI 3',          legacy.er_anil_esi === 3)
  assert('ER triage row: phase disposed',       legacy.er_anil_phase === 'disposed')
  assert('Insurance claim denial-risk 72',      legacy.claim_score === 72)
  assert('Insurance provider Star Health',      legacy.claim_provider === 'Star Health')
  assert('OT procedure: laparoscopic appendectomy', /Appendectomy/i.test(legacy.ot_procedure_name || ''))
  assert('OT status Completed',                  legacy.ot_status === 'Completed')
  assert('WHO sign-in / time-out / sign-out present',
         Array.isArray(legacy.who_phases) && ['sign_in','time_out','sign_out'].every((p) => legacy.who_phases.includes(p)))
  assert('WHO items checked >= 12',              (legacy.who_items_checked ?? 0) >= 12)
  assert('Narcotic Morphine row present',         (legacy.narc_drug || '').toLowerCase().includes('morphine'))
  assert('Narcotic witness: Sunita Devi',          legacy.narc_witness === 'Sunita Devi')
  assert('Augmentin in drug master',                legacy.augmentin_id === 'D-AUG')
  assert('Augmentin tagged Penicillin allergy class',
         Array.isArray(legacy.augmentin_allergy) && legacy.augmentin_allergy.includes('Penicillin'))
  assert('Admission request Admitted',              legacy.adm_status === 'Admitted')
  assert('Admission assigned to BED-SUR-1',          legacy.adm_assigned_bed === 'BED-SUR-1')

  // ── UI surface checks ─────────────────────────────────────────────────
  console.log('\n=== UI surfaces ===')

  // Audit Trail — search "Anil"
  await selectRole(page, 'Support Services', 'Audit / Compliance', 'Audit & Compliance')
  await sleep(1500)
  await clickMaybe(page, 'Audit Trail', 'a'); await sleep(2500)
  // Try the on-page search
  await page.evaluate(() => {
    const inp = document.querySelector('input[placeholder*="Search"], input[type="search"]')
    if (inp) { inp.value = 'Anil'; inp.dispatchEvent(new Event('input', { bubbles: true })) }
  })
  await sleep(800)
  assert('Audit Trail surfaces Anil events', await hasCI(page, 'Anil'))
  await shot('anil-audit')

  // Doctor IPD — Anil should appear in IPD list
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('button,a')].find(e => e.getAttribute('aria-label') === 'Log out')
    if (el) el.click()
  })
  await sleep(1500)
  await selectRole(page, 'Clinical', 'Doctor', 'Doctor Portal')
  await sleep(1500)
  await page.goto(`${BASE}/doctor/ipd`, { waitUntil: 'domcontentloaded' }); await sleep(2500)
  assert('Doctor IPD shows Anil',                await hasCI(page, 'Anil'))
  await shot('anil-doctor-ipd')

  await browser.close()

  const pass = results.filter((r) => r.pass).length
  const fail = results.length - pass
  console.log(`\n=== RESULT: ${pass}/${results.length} passed, ${fail} failed ===`)
  if (fail > 0) results.filter((r) => !r.pass).forEach((r) => console.log('  FAIL: ' + r.label))
  console.log(`=== ERRORS(${errors.length}) ===`)
  errors.slice(0, 8).forEach((e) => console.log('  ', e))
  process.exit(fail > 0 ? 1 : 0)
})().catch((e) => { console.error('ERR', e.message); process.exit(2) })
