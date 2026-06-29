// End-to-end radiology v2 walk: inbox → bench → reading → verification → overview
// + cross-panel (patient + doctor inbox). Sweeps console errors throughout.
const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const has = (page, t) => page.evaluate((x) => document.body.innerText.includes(x), t)
async function clickMaybe(page, text, sel = 'button, a') {
  return page.evaluate((t, sel) => { const el = [...document.querySelectorAll(sel)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t) && !e.disabled); if (el) { el.click(); return true } return false }, text, sel)
}
async function navClick(page, label, sel = 'a, button', tries = 30) { for (let i = 0; i < tries; i++) { if (await clickMaybe(page, label, sel)) { await sleep(700); return true } await sleep(200) } throw new Error('nav not found: ' + label) }
async function clickAria(page, label) { return page.evaluate((l) => { const el = [...document.querySelectorAll('button,a')].find(e => e.getAttribute('aria-label') === l); if (el) { el.click(); return true } return false }, label) }
async function selectRole(page, tab, role, confirmText) {
  for (let i = 0; i < 60; i++) { if (tab) await clickMaybe(page, tab, 'button'); await clickMaybe(page, role, 'button'); await sleep(450); if (await has(page, confirmText)) { await sleep(800); return } }
  throw new Error('login did not reach portal: ' + role)
}
async function rowAction(page, name, btnText) {
  return page.evaluate((name, btnText) => {
    const rows = [...document.querySelectorAll('div')].filter(d => (d.textContent || '').includes(name) && [...d.querySelectorAll('button')].some(b => (b.textContent || '').includes(btnText)))
    rows.sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)
    const row = rows[0]; if (!row) return false
    const btn = [...row.querySelectorAll('button')].find(b => (b.textContent || '').includes(btnText) && !b.disabled)
    if (btn) { btn.click(); return true } return false
  }, name, btnText)
}
async function fillSection(page, studyIdPrefix, sectionKey, value) {
  const sel = await page.evaluate((sid, key) => {
    const el = [...document.querySelectorAll('textarea[data-section]')].find(t =>
      (t.getAttribute('data-study') || '').includes(sid) && t.getAttribute('data-section') === key)
    if (!el) return null
    el.setAttribute('data-fill-id', `fill-${sid}-${key}`)
    return el.getAttribute('data-fill-id')
  }, studyIdPrefix, sectionKey)
  if (!sel) return false
  await page.click(`[data-fill-id="${sel}"]`)
  await page.type(`[data-fill-id="${sel}"]`, value)
  await page.keyboard.press('Tab')
  return true
}

;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  page.setDefaultNavigationTimeout(60000)
  await page.setViewport({ width: 1500, height: 1000, deviceScaleFactor: 1 })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 160)) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 160)))
  const shot = async (n) => { await sleep(500); await page.screenshot({ path: `${OUT}\\${n}.png` }); console.log('shot', n) }

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(2500)

  // ── Login as Radiology ─────────────────────────────────────────────────
  await selectRole(page, 'Clinical', 'Radiology', 'Inbox')

  // ── Inbox: schedule Rahul (Ordered) ───────────────────────────────────
  await navClick(page, 'Inbox'); await sleep(1100)
  console.log('inbox heading:', await has(page, 'Radiology Inbox'))
  console.log('ordered: Rahul Verma:', await has(page, 'Rahul Verma'))
  console.log('schedule Rahul:', await rowAction(page, 'Rahul Verma', 'Schedule')); await sleep(700)
  console.log('toast scheduled:', await has(page, 'scheduled for'))
  console.log('moved to Scheduled tab:', await has(page, 'Scheduled (2)') || await has(page, 'Scheduled ('))
  console.log('mark Rahul arrived:', await rowAction(page, 'Rahul Verma', 'Mark arrived')); await sleep(800)
  console.log('routed to bench toast:', await has(page, 'routed to XR bench'))
  await shot('rad-rev-inbox')

  // ── Bench: claim Rahul XR, attach image, mark acquired ────────────────
  await navClick(page, 'Modality Bench'); await sleep(1000)
  console.log('bench X-Ray default:', await has(page, 'X-Ray'))
  console.log('accept Rahul:', await rowAction(page, 'Rahul Verma', 'Accept')); await sleep(700)
  console.log('your counter (after accept):', await has(page, 'your counter'))
  // Attach an image
  console.log('attach button visible:', await rowAction(page, 'Rahul Verma', 'Attach')); await sleep(500)
  console.log('mark acquired:', await rowAction(page, 'Rahul Verma', 'Mark acquired')); await sleep(800)
  console.log('routed to reading toast:', await has(page, 'sent to Reading Room'))
  await shot('rad-rev-bench')

  // ── Reading Room: claim Karan Mehta (acquired), fill findings/impression, submit ───
  await navClick(page, 'Reading Room'); await sleep(1000)
  console.log('reading heading:', await has(page, 'Reading Room'))
  console.log('Karan Mehta in queue:', await has(page, 'Karan Mehta'))
  console.log('claim Read on Karan:', await rowAction(page, 'Karan Mehta', 'Read')); await sleep(800)
  console.log('expanded form:', await has(page, 'Structured report') || await has(page, 'STRUCTURED REPORT'))
  console.log('generate AI prelim:', await rowAction(page, 'Karan Mehta', 'Generate')); await sleep(500)
  // Fill findings + impression
  console.log('fill findings:', await fillSection(page, 'RS-105', 'findings', 'No pneumothorax. No pleural effusion. Cardiomediastinum normal. Bony thorax intact.'))
  console.log('fill impression:', await fillSection(page, 'RS-105', 'impression', 'No acute traumatic cardiopulmonary findings.'))
  await sleep(400)
  console.log('submit for verification:', await rowAction(page, 'Karan Mehta', 'Submit for verification')); await sleep(800)
  console.log('submit toast:', await has(page, 'submitted for verification'))
  await shot('rad-rev-reading')

  // ── Verification: verify Karan + Raju Singh ───────────────────────────
  await navClick(page, 'Verification'); await sleep(1000)
  console.log('verification heading:', await has(page, 'Verification'))
  console.log('Karan in pending:', await has(page, 'Karan Mehta'))
  console.log('Raju Singh in pending (seed):', await has(page, 'Raju Singh'))
  console.log('verify Raju:', await rowAction(page, 'Raju Singh', 'Verify')); await sleep(900)
  console.log('verified toast (doctor notified):', await has(page, 'verified & released') || await has(page, 'notified'))
  await shot('rad-rev-verification')

  // ── Overview: KPIs render + critical pending callback section ─────────
  await navClick(page, 'RIS Overview'); await sleep(1100)
  console.log('RIS Overview heading:', await has(page, 'RIS Overview'))
  console.log('Pipeline by modality:', await has(page, 'Pipeline by modality'))
  console.log('Critical pending callback section:', await has(page, 'Critical pending callback'))
  console.log('AI exception triage:', await has(page, 'AI exception triage'))
  console.log('Workload section:', await has(page, 'Workload'))
  await shot('rad-rev-overview')

  // ── Cross-panel: Patient (Kiran) sees released XR Chest ───────────────
  await clickAria(page, 'Log out'); await sleep(1200)
  await selectRole(page, 'Patient', 'Patient Portal', 'My Health Story')
  await navClick(page, 'Radiology'); await sleep(1100)
  console.log('patient radiology heading:', await has(page, 'Radiology'))
  console.log('Kiran sees X-Ray Chest released:', await has(page, 'X-Ray Chest'))
  console.log('AI explanation present:', await has(page, 'AI explanation') || await has(page, 'doctor will discuss'))
  await shot('rad-rev-patient')

  // ── Cross-panel: Doctor (Priya Nair) sees released radiology in Results ──
  await clickAria(page, 'Log out'); await sleep(1200)
  await selectRole(page, 'Clinical', 'Doctor', "Today's Queue")
  await navClick(page, 'Inbox'); await sleep(1100)
  await clickMaybe(page, 'Results', 'button'); await sleep(700)
  console.log('Doctor inbox Results tab:', await has(page, 'Result'))
  console.log('Released radiology surfaced:', await has(page, 'X-Ray') || await has(page, 'Radiology'))
  await shot('rad-rev-doctor')

  await browser.close()
  console.log('\nERRORS(' + errors.length + '):'); errors.forEach(e => console.log('  ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
