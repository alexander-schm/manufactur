// End-to-end smoke test. Usage: node test/e2e/smoke.mjs <baseUrl> [--no-fast]
// With a dev server that has DEV_FAST=1 (see .dev.vars) it also plays a few minutes via /api/dev/warp.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = (process.argv[2] ?? 'http://localhost:5173').replace(/\/$/, '');
const noFast = process.argv.includes('--no-fast');
const fail = (msg) => { console.error('SMOKE FAILED:', msg); process.exit(1); };
mkdirSync('docs/screens', { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
const errors = [];
async function newPage() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  return page;
}
const api = (page, method, path, body) => page.evaluate(async ([m, p, b]) => {
  const r = await fetch(p, { method: m, headers: b ? { 'content-type': 'application/json' } : {}, body: b ? JSON.stringify(b) : undefined });
  return { status: r.status, json: await r.json().catch(() => null) };
}, [method, path, body]);

const stamp = Date.now() % 1e6;
// 1) found a village
const a = await newPage();
await a.goto(base, { waitUntil: 'networkidle' });
await a.click('role=tab[name="Gründen"]');
await a.fill('input[placeholder="z. B. Tonhausen"]', `Smokedorf${stamp}`);
await a.locator('label:has-text("Dein Name") input').fill(`Anna${stamp}`);
await a.locator('input[type=password]').fill('geheim123');
await a.click('form button[type=submit]');
await a.waitForSelector('.invite-code');
const code = (await a.textContent('.invite-code')).trim();
if (!/^[A-Z2-9]{6}$/.test(code)) fail(`bad invite code ${code}`);
await a.click('text=Los geht’s!');
await a.waitForSelector('.scene');

// 2) a second player joins with the invite link
const b = await newPage();
await b.goto(`${base}/?einladung=${code}`, { waitUntil: 'networkidle' });
await b.locator('label:has-text("Dein Name") input').fill(`Ben${stamp}`);
await b.locator('input[type=password]').fill('geheim123');
await b.click('form button[type=submit]');
await b.waitForSelector('.scene');
const meB = await api(b, 'GET', '/api/me');
if (meB.json?.inviteCode !== code) fail('second player is not in the same village');
console.log('found + join: ok', code);

if (noFast) { console.log('SMOKE OK (no-fast)'); await browser.close(); process.exit(0); }

// 3) play: standing order, then let 10 minutes pass
let st = (await api(a, 'GET', '/api/state')).json.state;
let r = await api(a, 'POST', '/api/action', { action: { type: 'setStanding', designId: st.designs[0].id, batchSize: 6, autoBuy: true }, version: st.version });
if (r.status !== 200) fail(`setStanding ${r.status} ${JSON.stringify(r.json)}`);
const taler0 = r.json.state.taler;
r = await api(a, 'POST', '/api/dev/warp', { minutes: 10 });
if (r.status !== 200) fail('warp not available – is DEV_FAST=1 set in .dev.vars?');
st = (await api(a, 'GET', '/api/state')).json.state;
const pieces = st.goods.reduce((n, g) => n + g.count, 0);
if (st.stats.made < 6) fail(`expected production, made=${st.stats.made}`);
console.log(`after 10 min: made ${st.stats.made}, on shelf ${pieces}, sold ${st.stats.sold}, unlocks ${st.unlocks.join(',')}`);

// 4) deliver an order
const order = st.orders.find((o) => st.goods.some((g) => st.designs.find((d) => d.id === g.designId)?.form === o.form && g.count >= o.count && g.quality >= o.minQuality));
if (!order) fail('no order could be served');
const stack = st.goods.find((g) => st.designs.find((d) => d.id === g.designId)?.form === order.form && g.count >= order.count && g.quality >= order.minQuality);
r = await api(a, 'POST', '/api/action', { action: { type: 'deliverOrder', orderId: order.id, designId: stack.designId, quality: stack.quality, effect: stack.effect }, version: st.version });
if (r.status !== 200) fail(`deliver ${r.status} ${JSON.stringify(r.json)}`);
if (!(r.json.state.taler > st.taler)) fail('Taler did not increase');
console.log(`delivered order: Taler ${Math.round(st.taler)} → ${Math.round(r.json.state.taler)} (start ${taler0})`);

await a.reload({ waitUntil: 'networkidle' });
await a.waitForSelector('.scene');
await a.waitForTimeout(1500);
await a.screenshot({ path: 'docs/screens/smoke-after-play.png' });
if (errors.length) fail('page errors: ' + errors.join(' | '));
console.log('SMOKE OK');
await browser.close();
