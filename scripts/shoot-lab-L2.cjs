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

  // Inbox loads, Awaiting collection shows Ramesh Kumar (LO-403 — both tests awaiting)
  await navClick(page, 'Inbox'); await sleep(1100)
  console.log('inbox heading:', await has(page, 'Lab Inbox'))
  console.log('awaiting tab + Ramesh visible:', await has(page, 'Ramesh Kumar'))
  console.log('source chip OPD shown:', await has(page, 'OPD'))
  console.log('test pill Lipid:', await has(page, 'Lipid') || await has(page, 'LIPID'))
  await shot('l2-inbox-awaiting')

  // Collect Ramesh's order → tubes barcoded, moves to Just collected tab
  console.log('click Collect:', await rowAction(page, 'Ramesh Kumar', 'Collect')); await sleep(700)
  console.log('toast: tubes barcoded:', await has(page, 'tubes barcoded') || await has(page, 'tube barcoded'))
  // Switch to Just collected tab
  await clickMaybe(page, 'Just collected', 'button'); await sleep(700)
  console.log('Just collected shows Ramesh now:', await has(page, 'Ramesh Kumar'))

  // Expand the now-collected order; specimens with accession + COLLECTED badge
  await clickMaybe(page, 'Ramesh Kumar', 'button'); await sleep(600)
  console.log('expanded: shows accession:', await has(page, 'ACC-'))
  console.log('expanded: shows COLLECTED chip:', await has(page, 'COLLECTED'))

  // Reject one specimen → recollect requested
  console.log('click Reject:', await rowAction(page, 'ACC-', 'Reject')); await sleep(500)
  console.log('click Confirm reject:', await rowAction(page, 'ACC-', 'Confirm reject')); await sleep(700)
  console.log('toast: recollect requested:', await has(page, 'recollect requested'))
  console.log('order shows recollect required banner:', await has(page, 'recollect required'))
  await shot('l2-inbox-rejected')

  // Order recollect → order returns to Awaiting tab
  console.log('Order recollect:', await rowAction(page, 'Ramesh Kumar', 'Order recollect')); await sleep(700)
  await clickMaybe(page, 'Awaiting collection', 'button'); await sleep(700)
  console.log('Ramesh back in Awaiting collection:', await has(page, 'Ramesh Kumar'))
  await shot('l2-inbox-recollect')

  await browser.close()
  console.log('ERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
