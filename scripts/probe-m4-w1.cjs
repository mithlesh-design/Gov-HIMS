/* M4-W1 visual capture for the new clinical-wow surfaces. */
const puppeteer = require('puppeteer-core')
const path = require('path')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = path.join(__dirname, '..', 'docs', 'specs', 'screens', 'M4-W1')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickByText(page, text, sel = 'button') {
  return page.evaluate((t, s) => {
    const el = [...document.querySelectorAll(s)].find((e) => (e.textContent || '').includes(t) && !e.disabled)
    if (el) { el.click(); return true } return false
  }, text, sel)
}
;(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const p = await b.newPage()
  await p.setViewport({ width: 1500, height: 1000 })
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
  await clickByText(p, 'Clinical'); await sleep(500)
  await clickByText(p, 'Doctor');   await sleep(4500)

  // S2 + S3 — IPD with NEWS2 banner + global critical banner
  await p.goto('http://localhost:3000/doctor/ipd', { waitUntil: 'domcontentloaded' })
  await sleep(3500)
  await p.screenshot({ path: path.join(OUT, 'M4-W1-doctor-ipd-with-news2.png'), fullPage: true })
  console.log('  shot doctor-ipd')

  // S15 — analytics with day-in-review
  await p.goto('http://localhost:3000/doctor/analytics', { waitUntil: 'domcontentloaded' })
  await sleep(3500)
  await p.screenshot({ path: path.join(OUT, 'M4-W1-doctor-analytics-with-dayreview.png'), fullPage: true })
  console.log('  shot doctor-analytics')

  await b.close()
})()
