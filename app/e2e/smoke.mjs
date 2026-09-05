import { chromium } from 'playwright'
// End-to-end smoke test: proves a lesson scrolls, the hyperframe opens and the
// assessment grades. Point BASE_URL at a preview server or a deployed site.
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:4173'
const shots = process.env.SHOT_DIR ?? 'e2e/screenshots'
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox','--no-proxy-server'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
page.on('console', m => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message))

await page.goto(BASE, { waitUntil: 'networkidle' })
console.log('title:', await page.title())
console.log('h1:', await page.locator('h1').first().textContent())
console.log('concepts:', await page.locator('.concept').count())
await page.screenshot({ path: `${shots}/01-home.png`, fullPage: true })

// Open the linear map lesson and scroll through it
await page.locator('.concept-button', { hasText: 'Linear Map' }).click()
await page.waitForTimeout(500)
console.log('lesson h1:', await page.locator('h1').first().textContent())
console.log('svg marks:', await page.locator('.scene svg').first().locator('g').count())
await page.screenshot({ path: `${shots}/02-lesson-top.png` })

await page.mouse.wheel(0, 2200); await page.waitForTimeout(900)
console.log('caption after scroll:', await page.locator('.scene-caption').first().textContent())
await page.screenshot({ path: `${shots}/03-lesson-scrolled.png` })

await page.mouse.wheel(0, 3000); await page.waitForTimeout(900)
console.log('caption deeper:', await page.locator('.scene-caption').first().textContent())
await page.screenshot({ path: `${shots}/04-lesson-eigen.png` })

// Hyperframe inset
await page.mouse.wheel(0, -5500); await page.waitForTimeout(600)
const trigger = page.locator('.inset-trigger').first()
if (await trigger.count()) {
  await trigger.click(); await page.waitForTimeout(400)
  console.log('hyperframe visible:', await page.locator('.hyperframe').isVisible())
  await page.screenshot({ path: `${shots}/05-hyperframe.png` })
}

// Assessment
await page.locator('.assessment').scrollIntoViewIfNeeded(); await page.waitForTimeout(500)
console.log('prompt:', await page.locator('.prompt').first().textContent())
await page.screenshot({ path: `${shots}/06-assessment.png` })
await page.locator('button.primary', { hasText: 'Lock it in' }).click()
await page.waitForTimeout(1400)
console.log('verdict:', await page.locator('.verdict p').first().textContent())
await page.screenshot({ path: `${shots}/07-verdict.png` })

console.log('CONSOLE ERRORS:', errors.length ? errors : 'none')
await browser.close()
