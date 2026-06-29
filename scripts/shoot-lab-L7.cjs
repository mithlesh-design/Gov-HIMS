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
;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  page.setDefaultNavigationTimeout(60000)
  await page.setViewport({ width: 1500, height: 1000, deviceScaleFactor: 1 })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 160)) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 160)))
  const shot = async (n) => { await sleep(500); await page.screenshot({ path: `${OUT}\\${n}.png` }); console.log('shot', n) }

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(2200)
  await selectRole(page, 'Clinical', 'Laboratory', 'Inbox')

  await navClick(page, 'Lab Overview'); await sleep(1100)
  console.log('overview heading:', await has(page, 'Lab Overview'))
  console.log('KPI Awaiting collection label:', await has(page, 'AWAITING COLLECTION'))
  console.log('KPI Critical pending callback label:', await has(page, 'CRITICAL PENDING CALLBACK'))
  console.log('Pipeline by bench heading:', await has(page, 'Pipeline by bench'))
  console.log('Hematology mini-card:', await has(page, 'Hematology'))
  console.log('Critical pending callback list:', await has(page, 'Critical pending callback'))
  console.log('Kiran Patil with critical TROPI listed:', await has(page, 'Kiran Patil'))
  console.log('Sunita Sharma (CRP critical) listed:', await has(page, 'Sunita Sharma'))
  console.log('Technician workload (Ravi Menon):', await has(page, 'Ravi Menon'))
  console.log('QC alerts present (Roche c311):', await has(page, 'Roche c311'))
  console.log('AI exception triage heading:', await has(page, 'AI exception triage'))
  await shot('l7-overview')

  // Log a callback on Kiran Patil's critical
  console.log('click Log callback on Kiran:', await rowAction(page, 'Kiran Patil', 'Log callback')); await sleep(500)
  console.log('click Confirm log:', await rowAction(page, 'Kiran Patil', 'Confirm log')); await sleep(800)
  console.log('toast callback logged:', await has(page, 'Callback logged'))
  await shot('l7-callback-logged')

  await browser.close()
  console.log('ERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
