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
async function typeOverrideReason(page, patient, value) {
  const ok = await page.evaluate((p) => {
    const rows = [...document.querySelectorAll('div')].filter(d => (d.textContent || '').includes(p) && d.querySelector('input[placeholder*="Override reason"]'))
    rows.sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)
    const row = rows[0]; if (!row) return false
    const input = row.querySelector('input[placeholder*="Override reason"]')
    input.setAttribute('data-fill-mark', 'override-reason')
    return true
  }, patient)
  if (!ok) return false
  await page.click('[data-fill-mark="override-reason"]')
  await page.type('[data-fill-mark="override-reason"]', value)
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

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(2200)
  await selectRole(page, 'Clinical', 'Laboratory', 'Inbox')

  // QC page shows the seeded Roche c311 violation
  await navClick(page, 'Quality Control'); await sleep(1000)
  console.log('QC heading:', await has(page, 'Quality Control'))
  console.log('Roche c311 in VIOLATION state:', await has(page, 'VIOLATION'))
  console.log('1-3s rule visible:', await has(page, '1-3S') || await has(page, '1-3s'))
  console.log('Creatinine violation note:', await has(page, 'Creatinine'))
  await shot('l5-qc-violation')

  // Benches Biochemistry tab → Sunita RFT verified → Release blocked
  await navClick(page, 'Benches'); await sleep(900)
  await clickMaybe(page, 'Biochemistry', 'button'); await sleep(700)
  console.log('Sunita RFT shows Release blocked (Roche c311):', await has(page, 'Release blocked'))

  // Override the QC violation
  console.log('click Override on Sunita RFT row:', await rowAction(page, 'Sunita Sharma', 'Override')); await sleep(500)
  console.log('type override reason:', await typeOverrideReason(page, 'Sunita Sharma', 'Manual recal verified, repeat passed'))
  console.log('click Confirm override:', await rowAction(page, 'Sunita Sharma', 'Confirm override')); await sleep(800)
  console.log('toast override recorded:', await has(page, 'override recorded'))
  console.log('Release button now visible on row:', await has(page, 'Release'))
  await shot('l5-benches-overridden')

  // QC page now shows no active Roche violation (cleared by override)
  await navClick(page, 'Quality Control'); await sleep(900)
  console.log('Override audit shows entry:', await has(page, 'Manual recal'))
  console.log('Roche c311 now OK:', !(await page.evaluate(() => {
    const cards = [...document.querySelectorAll('div')].filter(d => (d.textContent || '').includes('Roche c311'))
    cards.sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)
    return (cards[0]?.textContent || '').includes('VIOLATION')
  })))
  await shot('l5-qc-cleared')

  await browser.close()
  console.log('ERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
