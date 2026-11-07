// Usage: node scripts/screenshot.mjs <url> <outPrefix> [--wait=ms]
// Saves docs/screens/<outPrefix>-desktop.png (1280×800) and -phone.png (375×812).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const [url, prefix, ...rest] = process.argv.slice(2);
if (!url || !prefix) { console.error('usage: screenshot.mjs <url> <outPrefix>'); process.exit(1); }
const fullPage = rest.includes('--full');
const wait = Number((rest.find((a) => a.startsWith('--wait=')) ?? '--wait=1200').split('=')[1]);
mkdirSync('docs/screens', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
for (const [name, viewport, mobile] of [['desktop', { width: 1280, height: 800 }, false], ['phone', { width: 375, height: 812 }, true]]) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(wait);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const out = `docs/screens/${prefix}-${name}.png`;
  await page.screenshot({ path: out, fullPage });
  console.log(`${out}  horizontalOverflow=${overflow}px${errors.length ? '  ERRORS: ' + errors.join(' | ') : ''}`);
  await ctx.close();
}
await browser.close();
