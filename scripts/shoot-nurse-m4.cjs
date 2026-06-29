const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickMaybe(page, text, sel = 'button, a') {
  return page.evaluate((t, sel) => { const el = [...document.querySelectorAll(sel)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t) && !e.disabled); if (el) { el.click(); return true } return false }, text, sel)
}
async function navClick(page, label, sel = 'a, button', tries = 30) { for (let i = 0; i < tries; i++) { if (await clickMaybe(page, label, sel)) { await sleep(800); return } await sleep(200) } throw new Error('nav not found: ' + label) }
async function clickAria(page, label) { return page.evaluate((l) => { const el = [...document.querySelectorAll('button,a')].find(e => e.getAttribute('aria-label') === l); if (el) { el.click(); return true } return false }, label) }
const has = (page, t) => page.evaluate((x) => document.body.innerText.includes(x), t)
const roleVisible = (page, role) => page.evaluate((r) => [...document.querySelectorAll('button')].some(b => (b.textContent || '').includes(r) && (b.textContent || '').length < 140), role)
async function selectRole(page, tab, role) {
  for (let i = 0; i < 40; i++) { if (tab) await clickMaybe(page, tab, 'button'); await sleep(200); if (await roleVisible(page, role)) break }
  for (let i = 0; i < 30; i++) { if (await clickMaybe(page, role, 'button')) break; await sleep(200) }
  await sleep(2200)
}
async function clickRowBtn(page, rowText, btnText) {
  return page.evaluate((rowText, btnText) => {
    for (const tr of document.querySelectorAll('tr')) {
      if ((tr.textContent || '').includes(rowText)) {
        const b = [...tr.querySelectorAll('button')].find(x => (x.textContent || '').includes(btnText) && !x.disabled)
        if (b) { b.click(); return true }
      }
    }
    return false
  }, rowText, btnText)
}
const inDialog = (page, t) => page.evaluate((t) => { const d = document.querySelector('[role=dialog]'); return !!d && d.innerText.includes(t) }, t)
async function clickInDialog(page, t) { return page.evaluate((t) => { const d = document.querySelector('[role=dialog]'); if (!d) return false; const b = [...d.querySelectorAll('button')].find(x => (x.textContent || '').includes(t) && !x.disabled); if (b) { b.click(); return true } return false }, t) }
const dialogGiveDisabled = (page) => page.evaluate(() => { const d = document.querySelector('[role=dialog]'); if (!d) return null; const b = [...d.querySelectorAll('button')].find(x => /Administer/.test(x.textContent || '')); return b ? b.disabled : null })
async function tickDialogChecks(page) { return page.evaluate(() => { const d = document.querySelector('[role=dialog]'); if (!d) return 0; const cs = [...d.querySelectorAll('input[type=checkbox]')]; cs.forEach(c => { if (!c.checked) c.click() }); return cs.length }) }
;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  page.setDefaultNavigationTimeout(60000)
  await page.setViewport({ width: 1500, height: 1000, deviceScaleFactor: 1 })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 150)) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 150)))
  const shot = async (n) => { await sleep(500); await page.screenshot({ path: `${OUT}\\${n}.png` }); console.log('shot', n) }

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' }); await sleep(1500)
  await selectRole(page, null, 'Nurse')
  await navClick(page, 'Medication (MAR)'); await sleep(1500)

  // MAR derived from real doctor orders (not hardcoded G-12)
  console.log('MAR shows real order Piperacillin-Tazobactam:', await has(page, 'Piperacillin-Tazobactam'))
  console.log('MAR shows Aspirin:', await has(page, 'Aspirin'))
  console.log('MAR shows continuous Noradrenaline:', await has(page, 'Noradrenaline'))
  console.log('MAR shows real ward beds (CCU-04):', await has(page, 'CCU-04'))
  console.log('old hardcoded bed G-12 gone:', !(await has(page, 'G-12')))
  await shot('nurse-m4-mar')

  // Allergy gate: Sunita Devi is penicillin-allergic → Pip-Taz blocked
  const openedPip = await clickRowBtn(page, 'Piperacillin-Tazobactam', 'Administer'); await sleep(700)
  console.log('opened Pip-Taz administer modal:', openedPip)
  console.log('safety gate blocks administration:', await inDialog(page, 'administration blocked'))
  console.log('allergy warning shown (Penicillin):', await inDialog(page, 'Penicillin'))
  console.log('Administer button disabled when blocked:', await dialogGiveDisabled(page) === true)
  await shot('nurse-m4-allergy-gate')
  await clickAria(page, 'Close'); await sleep(500)

  // Clean administration: Kiran's Metformin (no allergy) → logs to chart
  const openedMet = await clickRowBtn(page, 'Metformin', 'Administer'); await sleep(700)
  console.log('opened Metformin administer modal:', openedMet)
  console.log('no-conflict message for Metformin:', await inDialog(page, 'No allergy or interaction conflicts'))
  const nChecks = await tickDialogChecks(page); await sleep(300)
  console.log('5-rights checkboxes present:', nChecks)
  console.log('Administer enabled after 5 rights:', await dialogGiveDisabled(page) === false)
  await clickInDialog(page, 'Administer'); await sleep(1000)
  await shot('nurse-m4-after-administer')

  // Doctor chart timeline reflects the administration (persisted store)
  await page.goto(`${BASE}/doctor/ipd/PT-20394`, { waitUntil: 'networkidle2' }); await sleep(3000)
  let found = false
  for (let i = 0; i < 12; i++) { await clickMaybe(page, 'Timeline', 'button'); await sleep(600); if (await has(page, 'Administered Metformin')) { found = true; break } }
  console.log('doctor timeline shows Administered Metformin:', found)
  await shot('nurse-m4-doctor-timeline')

  await browser.close()
  console.log('ERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
