/* Full patient-portal audit: visits every nav page, captures console + runtime
   errors per page, screenshots the not-yet-verified pages and key interactions. */
const puppeteer = require('puppeteer-core')
const fs = require('fs')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'
fs.mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function click(page, text, sel = 'button, a') {
  const ok = await page.evaluate((t, sel) => {
    const el = [...document.querySelectorAll(sel)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t) && !e.disabled)
    if (el) { el.click(); return true }
    return false
  }, text, sel)
  if (!ok) throw new Error('not found: ' + text)
  await sleep(250)
}
async function clickTitle(page, title) {
  return page.evaluate((t) => {
    const el = [...document.querySelectorAll('button')].find((e) => e.getAttribute('title') === t && !e.disabled)
    if (el) { el.click(); return true }
    return false
  }, title)
}

;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1366, height: 1700, deviceScaleFactor: 1 })

  let label = 'init'
  const errors = []
  page.on('console', (m) => { const t = m.type(); if (t === 'error' || t === 'warning') errors.push(`[${label}] ${t}: ${m.text().slice(0, 200)}`) })
  page.on('pageerror', (e) => errors.push(`[${label}] PAGEERROR: ${e.message.slice(0, 200)}`))
  page.on('requestfailed', (r) => { const u = r.url(); if (!u.includes('favicon')) errors.push(`[${label}] REQFAIL: ${u.slice(0, 120)} ${r.failure()?.errorText || ''}`) })

  const shot = async (n) => { await sleep(400); await page.screenshot({ path: `${OUT}\\${n}.png` }); console.log('shot', n) }

  label = 'landing'
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' }); await sleep(500)
  await click(page, 'Patient', 'button')
  await click(page, 'Patient Portal', 'button')
  await sleep(2200)

  // Visit every nav page (console errors captured per page)
  const nav = [
    ['Dashboard', 'a-dashboard'], ['AI Care', 'a-aicare'], ['My Health Story', 'a-health-story'],
    ['My Consultations', 'a-consultations'], ["Doctor's Orders", 'a-orders'],
    ['IPD / Admission', 'a-ipd'], ['Pharmacy', 'a-pharmacy'], ['Pathology', 'a-pathology'],
    ['Radiology', 'a-radiology'], ['Blood Bank', 'a-blood-bank'], ['Ambulance', 'a-ambulance'],
    ['Download Center', 'a-downloads'], ['Billing', 'a-billing'], ['Insurance', 'a-insurance'],
    ['Care & Follow-up', 'a-followup'], ['Profile & Privacy', 'a-profile'], ['Help & Emergency', 'a-help'],
  ]
  for (const [navText, name] of nav) {
    label = name
    try { await click(page, navText, 'a'); await sleep(900); await shot(name) }
    catch (e) { errors.push(`[${name}] NAV-FAIL: ${e.message}`) }
  }

  // --- Interactions ---
  // AI Care: ask a question + transparency tab
  label = 'x-aicare'
  await click(page, 'AI Care', 'a'); await sleep(700)
  try {
    await page.type('input[aria-label="Ask the AI health companion"]', 'I have a mild fever and headache')
    await page.keyboard.press('Enter'); await sleep(1200); await shot('x-aicare-reply')
  } catch (e) { errors.push(`[x-aicare] TYPE-FAIL: ${e.message}`) }
  try { await click(page, 'AI in my Care', 'button'); await sleep(600); await shot('x-aicare-transparency') } catch (e) { errors.push(`[x-aicare] TAB-FAIL: ${e.message}`) }

  // Consultations: video tab + booking panel
  label = 'x-consult'
  await click(page, 'My Consultations', 'a'); await sleep(700)
  try { await click(page, 'Online (Video)', 'button'); await sleep(600); await shot('x-consult-video') } catch (e) { errors.push(`[x-consult] VIDEO-TAB: ${e.message}`) }
  try { await click(page, 'Book new', 'button'); await sleep(700); await shot('x-consult-booking') } catch (e) { errors.push(`[x-consult] BOOK: ${e.message}`) }

  // Teleconsult (video call screen) via Join
  label = 'x-teleconsult'
  await click(page, 'My Consultations', 'a'); await sleep(500)
  try {
    await click(page, 'Online (Video)', 'button'); await sleep(500)
    await click(page, 'Join video call', 'button'); await sleep(1400); await shot('x-teleconsult')
  } catch (e) { errors.push(`[x-teleconsult] JOIN: ${e.message}`) }

  // Video-mode journey + orders + followup
  label = 'x-video'
  await click(page, 'Dashboard', 'a'); await sleep(800)
  try {
    await clickTitle(page, 'Video'); await sleep(1200)         // switch journey to video
    await clickTitle(page, 'Next stage'); await sleep(900)     // -> waiting_room
    await clickTitle(page, 'Next stage'); await sleep(900)     // -> in_call (Join)
    await shot('x-video-journey')
    await clickTitle(page, 'Next stage'); await sleep(900)     // -> prescription (orders arrive)
    await sleep(800); await shot('x-video-dashboard')
  } catch (e) { errors.push(`[x-video] DEMO: ${e.message}`) }
  label = 'x-followup-video'
  await click(page, 'Care & Follow-up', 'a'); await sleep(900); await shot('x-followup-video')

  await browser.close()
  console.log('\n===== CONSOLE / RUNTIME ERRORS (' + errors.length + ') =====')
  errors.forEach((e) => console.log(e))
  console.log('===== END =====')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
