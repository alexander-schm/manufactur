import { chromium } from 'playwright';
const [url, out, sel] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome' });
const p = await (await b.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 })).newPage();
await p.goto(url, { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
await p.locator(sel).last().screenshot({ path: out });
await b.close();
