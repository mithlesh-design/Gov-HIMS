const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
;(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await b.newPage()
  const errs = []
  page.on('pageerror', e => errs.push(e.message))
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()) })
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })
  await new Promise(r => setTimeout(r, 4000))
  console.log('HOME errors:', errs.length)
  errs.slice(0, 5).forEach((e, i) => console.log('  [' + i + '] ' + e.slice(0, 500)))
  await b.close()
})()
