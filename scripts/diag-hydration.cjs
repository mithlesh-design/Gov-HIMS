const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  for (const path of ['/', '/doctor/dashboard']) {
    const page = await browser.newPage()
    const msgs = []
    page.on('console', async (m) => {
      const t = m.text()
      if (/hydrat|did not match|didn't match|server rendered/i.test(t)) {
        // pull full args
        let parts = [t]
        try { for (const h of m.args()) { const v = await h.jsonValue().catch(() => null); if (v && typeof v === 'string' && !parts.includes(v)) parts.push(v) } } catch {}
        msgs.push(parts.join(' || '))
      }
    })
    page.on('pageerror', e => { if (/hydrat/i.test(e.message)) msgs.push('PAGEERR ' + e.message) })
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle2' }).catch(() => {})
    await sleep(1500)
    console.log(`\n=== ${path} ===  hydration msgs: ${msgs.length}`)
    msgs.forEach(m => console.log(m.slice(0, 600)))
    await page.close()
  }
  await browser.close()
  console.log('\nDONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
