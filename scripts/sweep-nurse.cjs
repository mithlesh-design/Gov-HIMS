const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const PAGES = ['/nurse/dashboard','/nurse/patients','/nurse/rounds','/nurse/tasks','/nurse/medication','/nurse/handover','/nurse/messages']
;(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await b.newPage(); await page.setViewport({ width: 1500, height: 1000 })
  const errors = []
  page.on('console', m => { if (m.type()==='error') errors.push(`[${page.url().split('/').slice(-1)}] ${m.text().slice(0,120)}`) })
  page.on('pageerror', e => errors.push(`[${page.url().split('/').slice(-1)}] PE ${e.message.slice(0,120)}`))
  await page.goto(`${BASE}/`, { waitUntil:'networkidle2' }); await sleep(400)
  await page.evaluate(()=>{const el=[...document.querySelectorAll('button')].find(e=>e.textContent.includes('Nurse')); el&&el.click()}); await sleep(2500)
  for (const p of PAGES) { await page.goto(`${BASE}${p}`,{waitUntil:'networkidle2'}).catch(()=>{}); await sleep(900); const len = await page.evaluate(()=>document.body.innerText.length); console.log(p, '·', len>200?'OK':'THIN') }
  await b.close()
  console.log('\nERRORS('+errors.length+'):'); errors.forEach(e=>console.log(' ',e)); console.log('DONE')
})().catch(e=>{console.error('ERR',e.message);process.exit(1)})
