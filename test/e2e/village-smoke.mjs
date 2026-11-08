// Two-player village end-to-end test. Usage: node test/e2e/village-smoke.mjs <baseUrl>
// Needs a dev server with DEV_FAST=1 (.dev.vars) for /api/dev/warp.
import { chromium } from 'playwright';

const base = (process.argv[2] ?? 'http://localhost:5173').replace(/\/$/, '');
const fail = (m) => { console.error('VILLAGE SMOKE FAILED:', m); process.exit(1); };
const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
const errors = [];
async function page() {
  const p = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
  p.on('pageerror', (e) => errors.push(e.message));
  return p;
}
const api = (p, method, path, body) => p.evaluate(async ([m, u, b]) => {
  const r = await fetch(u, { method: m, headers: b ? { 'content-type': 'application/json' } : {}, body: b ? JSON.stringify(b) : undefined });
  return { status: r.status, json: await r.json().catch(() => null) };
}, [method, path, body]);
const vact = async (p, action) => {
  const r = await api(p, 'POST', '/api/village/action', { action });
  if (r.status !== 200) fail(`${action.type}: ${r.status} ${JSON.stringify(r.json)}`);
  return r.json;
};
const stamp = Date.now() % 1e6;

const A = await page();
await A.goto(base, { waitUntil: 'networkidle' });
await A.click('role=tab[name="Gründen"]');
await A.fill('input[placeholder="z. B. Tonhausen"]', `Dorfprobe${stamp}`);
await A.locator('label:has-text("Dein Name") input').fill(`Anna${stamp}`);
await A.locator('input[type=password]').fill('geheim123');
await A.click('form button[type=submit]');
await A.waitForSelector('.invite-code');
const code = (await A.textContent('.invite-code')).trim();
await A.click('text=Los geht’s!');
await A.waitForSelector('.scene');

const B = await page();
await B.goto(`${base}/?einladung=${code}`, { waitUntil: 'networkidle' });
await B.locator('label:has-text("Dein Name") input').fill(`Ben${stamp}`);
await B.locator('input[type=password]').fill('geheim123');
await B.click('form button[type=submit]');
await B.waitForSelector('.scene');

let v = (await api(A, 'GET', '/api/village')).json.village;
if (v.members.length !== 2) fail('expected 2 members');
if (v.members[0].specialty === v.members[1].specialty) fail('specialties should differ');
const idA = v.members[0].playerId, idB = v.members[1].playerId;
console.log('members:', v.members.map((m) => `${m.name}=${m.specialty}`).join(', '));

const tonB0 = (await api(B, 'GET', '/api/state')).json.state.materials.ton;
await vact(A, { type: 'gift', to: idB, give: { kind: 'material', material: 'ton', count: 5 } });
const tonB1 = (await api(B, 'GET', '/api/state')).json.state.materials.ton;
if (tonB1 < tonB0 + 5) fail(`gift not received (${tonB0} → ${tonB1})`);
console.log('gift: ok');

const posted = await vact(B, { type: 'postOffer', give: { kind: 'material', material: 'ton', count: 5 }, want: { kind: 'taler', amount: 3 } });
await vact(A, { type: 'acceptOffer', offerId: posted.village.offers[0].id });
console.log('trade: ok');
await vact(A, { type: 'help', target: idB, sticker: 'herz' });
console.log('help: ok');

// both produce cups for a while
for (const p of [A, B]) {
  const s = (await api(p, 'GET', '/api/state')).json.state;
  const r = await api(p, 'POST', '/api/action', { action: { type: 'setStanding', designId: s.designs[0].id, batchSize: 6, autoBuy: true }, version: s.version });
  if (r.status !== 200) fail('setStanding ' + r.status);
  const w = await api(p, 'POST', '/api/dev/warp', { minutes: 180 });
  if (w.status !== 200) fail('warp unavailable – DEV_FAST=1?');
  let st; do { st = (await api(p, 'GET', '/api/state')).json; } while (st.catchingUp);
}

// fill the first joint order together
v = (await api(A, 'GET', '/api/village')).json.village;
const order = v.jointOrders[0];
console.log('joint order:', order.title, order.parts.map((p) => `${p.kind === 'goods' ? p.form : p.material} ${p.count}`).join(', '));
const taler0 = { A: (await api(A, 'GET', '/api/state')).json.state.taler, B: (await api(B, 'GET', '/api/state')).json.state.taler };
for (let i = 0; i < order.parts.length; i++) {
  for (const [p, share] of [[A, 0.5], [B, 1]]) {
    v = (await api(p, 'GET', '/api/village')).json.village;
    const o = v.jointOrders.find((x) => x.id === order.id);
    if (!o) break;
    const part = o.parts[i];
    const left = part.count - part.filled;
    if (left <= 0) continue;
    const want = share === 1 ? left : Math.max(1, Math.ceil(left * share));
    const s = (await api(p, 'GET', '/api/state')).json.state;
    if (part.kind === 'goods') {
      const g = s.goods.find((x) => s.designs.find((d) => d.id === x.designId)?.form === part.form && x.quality >= part.minQuality);
      if (!g) fail('no cups to contribute');
      await vact(p, { type: 'contribute', jointId: order.id, part: i, count: Math.min(want, g.count), source: 'own', designId: g.designId, quality: g.quality, effect: g.effect });
    } else {
      const have = Math.floor(s.materials[part.material] ?? 0);
      const own = Math.min(want, have);
      if (own > 0) await vact(p, { type: 'contribute', jointId: order.id, part: i, count: own, source: 'own' });
      if (want - own > 0) await vact(p, { type: 'contribute', jointId: order.id, part: i, count: want - own, source: 'store' });
    }
  }
}
v = (await api(A, 'GET', '/api/village')).json.village;
if (v.jointOrders.some((x) => x.id === order.id)) fail('joint order not completed: ' + JSON.stringify(v.jointOrders.find((x) => x.id === order.id).parts));
if (v.completedJoint !== 1) fail('completedJoint should be 1');
const sA = (await api(A, 'GET', '/api/state')).json.state, sB = (await api(B, 'GET', '/api/state')).json.state;
if (!sA.decor.length || !sB.decor.length) fail('decor reward missing');
console.log(`joint order done: decor ${sA.decor.join(',')}; Taler A ${Math.round(taler0.A)}→${Math.round(sA.taler)}, B ${Math.round(taler0.B)}→${Math.round(sB.taler)}`);

// screenshots: the village map, and B's shelf with A's gifted cups
const giftCups = sA.goods.find((g) => !g.designId.startsWith('f:') && g.count >= 3);
if (giftCups) await vact(A, { type: 'gift', to: idB, give: { kind: 'goods', designId: giftCups.designId, quality: giftCups.quality, effect: giftCups.effect, count: 3 } });
await B.reload({ waitUntil: 'networkidle' });
await B.waitForSelector('.scene');
for (const sel of ['text=Weiter töpfern', 'text=Juhu!', 'text=Juhu!', 'text=Juhu!']) { const b = B.locator(sel); if (await b.count()) await b.first().click().catch(() => {}); }
await B.click('[aria-label="Dorf"]');
await B.waitForSelector('.village-map');
await B.waitForTimeout(1200);
await B.screenshot({ path: 'docs/screens/village-live.png' });
await B.click('role=tab[name="Großaufträge"]');
await B.waitForTimeout(600);
await B.screenshot({ path: 'docs/screens/village-joint.png' });
await B.click('role=tab[name="Tauschbrett"]');
await B.waitForTimeout(400);
await B.screenshot({ path: 'docs/screens/village-trade.png' });
if (errors.length) fail('page errors: ' + errors.join(' | '));
console.log('VILLAGE SMOKE OK');
await browser.close();
