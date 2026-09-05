import { chromium } from 'playwright'
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:4173'
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--no-proxy-server'] })
const p = await b.newPage({ viewport:{width:1280,height:900} })
const errors = []
p.on('pageerror', e => errors.push('PAGEERROR: ' + e.message))
p.on('console', m => m.type()==='error' && errors.push(m.text()))
await p.goto(BASE, { waitUntil:'networkidle' })

console.log('lessons listed:', await p.locator('.concept').count())
console.log('parts listed:', await p.locator('.part').count())
console.log('articles listed:', await p.locator('.article').count())
console.log('articles with lessons:', await p.locator('.article.has-lesson').count())

const titles = await p.locator('.concept-title').allTextContents()
console.log('lesson titles:', titles.join(' | '))

for (const t of titles) {
  await p.locator('.concept-button', { hasText: t }).first().click()
  await p.waitForTimeout(350)
  const h1 = await p.locator('h1').first().textContent()
  await p.mouse.wheel(0, 4000); await p.waitForTimeout(700)
  const cap = await p.locator('.scene-caption').first().textContent()
  await p.locator('.assessment').scrollIntoViewIfNeeded(); await p.waitForTimeout(400)
  const prompt = await p.locator('.prompt').first().textContent()
  console.log(`  ✓ ${h1} | mid-caption: "${(cap||'').slice(0,60)}..." | q1: "${(prompt||'').slice(0,55)}..."`)
  await p.locator('.link-button').first().click(); await p.waitForTimeout(250)
}
console.log('ERRORS:', errors.length ? errors : 'none')
await b.close()
