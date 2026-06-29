const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickMaybe(page, text, sel = 'button, a') {
  return page.evaluate((t, sel) => { const el = [...document.querySelectorAll(sel)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t) && !e.disabled); if (el) { el.click(); return true } return false }, text, sel)
}
async function navClick(page, label, sel = 'a, button', tries = 30) { for (let i = 0; i < tries; i++) { if (await clickMaybe(page, label, sel)) { await sleep(800); return } await sleep(200) } throw new Error('nav not found: ' + label) }
const has = (page, t) => page.evaluate((x) => document.body.innerText.includes(x), t)
const countTasks = (page) => page.evaluate(() => [...document.querySelectorAll('button[aria-label^="Remove"]')].length)
const taVal = (page) => page.evaluate(() => document.querySelector('textarea')?.value || '')
async function selectRole(page, tab, role, confirmText) {
  for (let i = 0; i < 60; i++) { if (tab) await clickMaybe(page, tab, 'button'); await clickMaybe(page, role, 'button'); await sleep(450); if (await has(page, confirmText)) { await sleep(800); return } }
  throw new Error('login did not reach portal: ' + role)
}
;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  page.setDefaultNavigationTimeout(60000)
  await page.setViewport({ width: 1500, height: 1000, deviceScaleFactor: 1 })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 150)) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 150)))
  const shot = async (n) => { await sleep(500); await page.screenshot({ path: `${OUT}\\${n}.png` }); console.log('shot', n) }

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(2200)
  await selectRole(page, null, 'Nurse', 'Ward Dashboard')
  await navClick(page, 'Daily Tasks'); await sleep(1200)

  // Tasks linked to REAL patients (not the old roster)
  console.log('tasks show real patient (Kiran Patil):', await has(page, 'Kiran Patil'))
  console.log('old roster gone (no Sunita Sharma):', !(await has(page, 'Sunita Sharma')))
  const before = await countTasks(page)
  // AI builds shift tasks from the ward
  await clickMaybe(page, 'AI: build shift tasks', 'button'); await sleep(1200)
  const after = await countTasks(page)
  console.log('AI added tasks (count', before, '→', after, '):', after > before)
  console.log('AI task references NEWS/meds/orders:', await has(page, 'Recheck vitals') || await has(page, 'Administer') || await has(page, 'pending doctor order'))
  console.log('AI badge present:', await has(page, 'AI'))
  await shot('nurse-m6-tasks')

  // Nursing note: dictate → structure → save → posts to shared timeline
  await page.select('select', 'PT-20394'); await sleep(300)
  await clickMaybe(page, 'Dictate', 'button'); await sleep(400)
  console.log('dictation captured:', (await taVal(page)).includes('chest discomfort'))
  await clickMaybe(page, 'Structure with AI', 'button'); await sleep(500)
  const structured = await taVal(page)
  console.log('note structured (Assessment/Intervention):', structured.includes('Assessment:') && structured.includes('Intervention:'))
  await shot('nurse-m6-note')
  await clickMaybe(page, 'Save to chart', 'button'); await sleep(1000)

  // Doctor timeline shows the nursing note (persisted shared record)
  await page.goto(`${BASE}/doctor/ipd/PT-20394`, { waitUntil: 'networkidle2' }); await sleep(3000)
  let found = false
  for (let i = 0; i < 14; i++) { await clickMaybe(page, 'Timeline', 'button'); await sleep(600); if (await has(page, 'Nursing note')) { found = true; break } }
  console.log('doctor timeline shows Nursing note:', found)
  console.log('doctor timeline shows structured content (Assessment:):', await has(page, 'Assessment:'))
  await shot('nurse-m6-doctor-timeline')

  await browser.close()
  console.log('ERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
