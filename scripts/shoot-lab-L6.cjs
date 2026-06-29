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
async function fillAnalyte(page, testIdPrefix, analyte, value) {
  const selector = await page.evaluate((tidPref, anl) => {
    const el = [...document.querySelectorAll('input[data-analyte]')].find(i => {
      const tid = i.getAttribute('data-test') || ''
      const an = i.getAttribute('data-analyte') || ''
      return tid.includes(tidPref) && an === anl
    })
    if (!el) return null
    el.setAttribute('data-fill-id', `fill-${tidPref}-${anl.replace(/\s+/g, '_')}`)
    return el.getAttribute('data-fill-id')
  }, testIdPrefix, analyte)
  if (!selector) return false
  await page.click(`[data-fill-id="${selector}"]`)
  await page.type(`[data-fill-id="${selector}"]`, String(value))
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

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(2200)
  await selectRole(page, 'Clinical', 'Laboratory', 'Inbox')

  // Drive Aarav's CBC end-to-end with a deliberately high WBC (>15 000) so the reflex rule fires
  await navClick(page, 'Benches'); await sleep(900)
  console.log('Accept Aarav CBC:', await rowAction(page, 'Aarav Sharma', 'Accept')); await sleep(700)
  const cbcVals = {
    'Haemoglobin': 14.0, 'WBC count': 18200, 'Platelets': 250,
    'RBC count': 4.8, 'Haematocrit': 41, 'MCV': 88, 'Neutrophils': 70,
  }
  for (const [analyte, value] of Object.entries(cbcVals)) {
    await fillAnalyte(page, 'LT-401', analyte, value); await sleep(80)
  }
  await sleep(400)
  console.log('click Send for verification:', await rowAction(page, 'Aarav Sharma', 'Send for verification')); await sleep(600)
  console.log('click Verify:', await rowAction(page, 'Aarav Sharma', 'Verify')); await sleep(600)
  console.log('click Release:', await rowAction(page, 'Aarav Sharma', 'Release')); await sleep(800)

  // Reflex page should now have a Blood Culture suggestion for Aarav (WBC > 15k)
  await navClick(page, 'Reflex Tests'); await sleep(900)
  console.log('reflex heading:', await has(page, 'Reflex Tests'))
  console.log('Aarav listed:', await has(page, 'Aarav Sharma'))
  console.log('Trigger: WBC > 15 000:', await has(page, 'WBC 18200') || await has(page, 'Leucocytosis'))
  console.log('Suggested test Blood Culture:', await has(page, 'Blood Culture'))
  await shot('l6-reflex-pending')

  // One-click order the reflex
  console.log('click Order reflex:', await rowAction(page, 'Aarav Sharma', 'Order reflex')); await sleep(900)
  console.log('toast reflex ordered:', await has(page, 'Reflex Blood Culture ordered'))

  // Verify it landed in /lab/inbox as awaiting collection
  await navClick(page, 'Inbox'); await sleep(900)
  console.log('Aarav now in Inbox (new awaiting blood culture):', await has(page, 'Aarav Sharma'))
  console.log('Blood Culture pill visible:', await has(page, 'Blood'))
  await shot('l6-reflex-ordered')

  await browser.close()
  console.log('ERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
