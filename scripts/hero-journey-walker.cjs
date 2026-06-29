/* M5 — Hero-journey walker.
 *
 * Walks the Anil + Kiran demo narrative across every W1-W6 surface, in
 * the order the live demo will run. Each step:
 *   1. Sets role (or login flow) → 2. Navigates to surface → 3. Waits for
 *   render → 4. Captures screenshot → 5. Logs the on-stage line for the
 *   presenter.
 */
const puppeteer = require('puppeteer-core')
const path = require('path')
const fs = require('fs')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = path.join(__dirname, '..', 'docs', 'specs', 'screens', 'M5')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const STEPS = [
  // [role,         path,                       label,                                  on-stage line]
  ['admin',         '/admin/operations',         '01-S7-ops-cockpit',                    'Predictive Operations Cockpit — 4 forecasters live on the ops surface.'],
  ['admin',         '/admin/finance',            '02-S8-rcm-growth',                     'Revenue-Cycle Growth Cockpit — denial-risk + AR + leakage with ₹-impact.'],
  ['admin',         '/admin/compliance',         '03-S9-nabh-evidence',                  'NABH Evidence Live Cockpit — 9 chapters with AI suggested next-actions.'],
  ['admin',         '/admin/disha',              '04-S10-dpdp-selfaudit',                'DPDP / DISHA Self-Audit — 5 principles scored, anchored in DPDP §§.'],
  ['doctor',        '/doctor/dashboard',         '05-S1-drug-safety',                    'Drug-Safety Reasoning — Anil + Augmentin → Penicillin allergy block, with alternates.'],
  ['doctor',        '/doctor/ipd',               '06-S14-S2-presence-ews',               'Care-Team Presence + NEWS2 banner — handover queue + ambient ward watcher.'],
  ['doctor',        '/doctor/analytics',         '07-S15-day-in-review',                 'Doctor Day-in-Review — narration of today\'s consults / Rx / AI accept-rate.'],
  ['patient',       '/patient/dashboard',        '08-S11-S12-S13-patient-portal',         'Patient super-app — AI Health Summary + Family-Track invite + Proactive Nudges.'],
  ['nurse',         '/nurse/dashboard',          '09-S14-nurse-presence',                'Care-Team Presence on nurse dashboard — sign + receive handover.'],
  ['reception',     '/reception/opd',            '10-S6-ocr-intake',                     'OPD walk-in modal carries the mock OCR scan (Aadhaar / insurance / lab).'],
]

async function clickByText(page, text, sel = 'button') {
  return page.evaluate((t, s) => {
    const el = [...document.querySelectorAll(s)].find((e) => (e.textContent || '').includes(t) && !e.disabled)
    if (el) { el.click(); return true } return false
  }, text, sel)
}

async function setRole(p, role) {
  const meta = {
    admin:     { id: 'AD-001', name: 'Hospital Admin', role: 'admin' },
    doctor:    { id: 'DR-1012', name: 'Dr. Priya Nair', role: 'doctor' },
    nurse:     { id: 'NR-402',  name: 'Anjali Desai',  role: 'nurse' },
    patient:   { id: 'PT-20394', name: 'Kiran Patil',  role: 'patient' },
    reception: { id: 'RC-204',  name: 'Sunita Joshi',  role: 'reception' },
  }[role]
  await p.evaluate((m) => {
    const raw = localStorage.getItem('agentix-authstore')
    const o = raw ? JSON.parse(raw) : { state: {}, version: 1 }
    o.state = { ...(o.state || {}), activeRole: m.role, currentUser: m }
    localStorage.setItem('agentix-authstore', JSON.stringify(o))
  }, meta)
}

;(async () => {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

  const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const p = await b.newPage()
  await p.setViewport({ width: 1500, height: 1100 })

  // Fresh seed
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })
  await p.evaluate(() => { try { localStorage.clear() } catch {} })
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })
  for (let i = 0; i < 60; i++) {
    const ready = await p.evaluate(() =>
      localStorage.getItem('agentix.api.v1.__bootstrap__') !== null &&
      Object.keys(localStorage).some((k) => k.startsWith('agentix.legacy-seed.anil-')))
    if (ready) break
    await sleep(500)
  }
  await sleep(2500)

  // Establish admin via picker once (so RoleGuard accepts first navigation).
  await clickByText(p, 'Management', 'button'); await sleep(1000)
  await p.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => /Analytics, staff/.test(b.textContent || ''))
    if (btn) btn.click()
  })
  await sleep(5000)

  // Walk the steps.
  const log = []
  for (const [role, route, label, line] of STEPS) {
    await setRole(p, role)
    await p.evaluate((url) => { window.location.assign(url) }, 'http://localhost:3000' + route)
    await sleep(8000)
    const fname = `M5-${label}.png`
    await p.screenshot({ path: path.join(OUT, fname), fullPage: true })
    console.log(`  shot ${fname}`)
    log.push({ role, route, label, line, screenshot: fname })
  }

  fs.writeFileSync(path.join(OUT, 'hero-journey.json'), JSON.stringify(log, null, 2))
  await b.close()
})()
