const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
;(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const pg = await b.newPage()
  await pg.setViewport({ width: 1500, height: 1000, deviceScaleFactor: 1 })
  await pg.goto('http://localhost:3000/doctor/ipd', { waitUntil: 'networkidle2' })
  await sleep(1800)
  const rows = await pg.evaluate(() => document.querySelectorAll('tbody tr').length)
  console.log('inpatient rows rendered:', rows)
  await pg.screenshot({ path: `${OUT}\\ipd2-final.png` })
  await b.close()
  console.log('DONE')
})().catch(e => { console.error('ERR', e.message); process.exit(1) })
