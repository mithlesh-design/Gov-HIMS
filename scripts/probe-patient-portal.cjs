const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
;(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const p = await b.newPage()
  // First clear localStorage so RoleGuard doesn't have prior auth
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })
  await p.evaluate(() => { localStorage.clear() })
  // Re-load and pick Patient explicitly
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })
  await new Promise(r => setTimeout(r, 3500))
  // Click Patient tab + Patient Portal card
  await p.evaluate(() => {
    const tab = [...document.querySelectorAll('button')].find(b => (b.textContent || '').includes('Patient'))
    tab?.click()
  })
  await new Promise(r => setTimeout(r, 600))
  await p.evaluate(() => {
    const btn = [...document.querySelectorAll('button, a')].find(b => (b.textContent || '').includes('Patient Portal'))
    btn?.click()
  })
  await new Promise(r => setTimeout(r, 4000))
  await p.screenshot({ path: 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots\\p1s4-patient-clean.png', fullPage: true })
  console.log('URL:', p.url())
  const has = (t) => p.evaluate((x) => document.body.innerText.includes(x), t)
  console.log('has Patient Portal:', await has('Patient Portal'))
  console.log('has AI Care:', await has('AI Care'))
  console.log('has Dashboard:', await has('Dashboard'))
  await b.close()
})()
