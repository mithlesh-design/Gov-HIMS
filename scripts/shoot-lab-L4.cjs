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
// Type into the organism input inside the smallest div containing `patient`.
async function typeOrganism(page, patient, value) {
  const ok = await page.evaluate((p) => {
    const rows = [...document.querySelectorAll('div')].filter(d => (d.textContent || '').includes(p) && d.querySelector('input[placeholder*="E. coli"]'))
    rows.sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)
    const row = rows[0]; if (!row) return false
    const input = row.querySelector('input[placeholder*="E. coli"]')
    input.setAttribute('data-fill-mark', 'organism')
    return true
  }, patient)
  if (!ok) return false
  await page.click('[data-fill-mark="organism"]')
  await page.type('[data-fill-mark="organism"]', value)
  return true
}
// Click S/I/R button on a specific drug row inside the patient's card.
async function setAST(page, patient, drug, result) {
  return page.evaluate((p, d, r) => {
    const rows = [...document.querySelectorAll('div')].filter(div => {
      const txt = div.textContent || ''
      return txt.includes(p) && txt.includes(d) && [...div.querySelectorAll('button')].some(b => (b.textContent || '').trim() === r)
    })
    rows.sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)
    const row = rows[0]; if (!row) return false
    const btn = [...row.querySelectorAll('button')].find(b => (b.textContent || '').trim() === r)
    if (btn) { btn.click(); return true } return false
  }, patient, drug, result)
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

  await navClick(page, 'Microbiology'); await sleep(1000)
  console.log('microbiology heading:', await has(page, 'Microbiology'))
  console.log('5 columns present:', (await has(page, 'Inoculated')) && (await has(page, 'Growth check')) && (await has(page, 'Identified')) && (await has(page, 'AST')) && (await has(page, 'Final')))
  console.log('Sunita CULT_BLOOD in Growth check column:', await has(page, 'Sunita Sharma'))
  await shot('l4-growth-check')

  // Identify the organism
  console.log('type organism:', await typeOrganism(page, 'Sunita Sharma', 'E. coli')); await sleep(300)
  console.log('click Identify:', await rowAction(page, 'Sunita Sharma', 'Identify')); await sleep(800)
  console.log('card moved to Identified — E. coli visible:', await has(page, 'E. coli'))

  // Set AST results
  console.log('Ceftriaxone S:', await setAST(page, 'Sunita Sharma', 'Ceftriaxone', 'S')); await sleep(300)
  console.log('Ciprofloxacin R:', await setAST(page, 'Sunita Sharma', 'Ciprofloxacin', 'R')); await sleep(300)
  console.log('Gentamicin S:', await setAST(page, 'Sunita Sharma', 'Gentamicin', 'S')); await sleep(300)
  await shot('l4-identified-ast')

  // Save AST → review
  console.log('Save AST:', await rowAction(page, 'Sunita Sharma', 'Save AST')); await sleep(700)
  // Save final report (textarea pre-filled; just click Save)
  console.log('Save final report:', await rowAction(page, 'Sunita Sharma', 'Save final report')); await sleep(800)
  console.log('toast finalised & released:', await has(page, 'finalised'))
  console.log('Sunita in Final column with RELEASED chip:', await has(page, 'RELEASED'))
  await shot('l4-final')

  await browser.close()
  console.log('ERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
