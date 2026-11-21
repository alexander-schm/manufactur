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

// --- great kiln and grand projects ---
const act = async (p, action) => {
  const s = (await api(p, 'GET', '/api/state')).json.state;
  const r = await api(p, 'POST', '/api/action', { action, version: s.version });
  if (r.status !== 200) fail(`${action.type}: ${r.status} ${JSON.stringify(r.json)}`);
};
for (const p of [A, B]) {
  const g = await api(p, 'POST', '/api/dev/grant', { taler: 400000, ruf: 400 });
  if (g.status !== 200) fail('grant ' + g.status);
}
await act(A, { type: 'upgradeTier' });
v = (await api(A, 'GET', '/api/village')).json.village;
if (!v.buildings.includes('gemeinschaftsofen')) fail('kiln missing');

const cupsOf = (s, id) => s.goods.filter((g) => g.designId === id).reduce((n, g) => n + g.count, 0);
const kilnPlayer = async (p, wood) => {
  let s = (await api(p, 'GET', '/api/state')).json.state;
  const id = s.designs[0].id;
  for (let i = 0; i < 4 && cupsOf(s, id) < 6; i++) {
    await api(p, 'POST', '/api/dev/warp', { minutes: 180 });
    do { s = (await api(p, 'GET', '/api/state')).json; } while (s.catchingUp);
    s = s.state;
  }
  if (cupsOf(s, id) < 6) fail('not enough cups for the kiln');
  if ((s.materials.holz ?? 0) < wood) await act(p, { type: 'buyMaterial', material: 'holz', amount: Math.ceil(wood - (s.materials.holz ?? 0)) });
  await vact(p, { type: 'loadKiln', designId: id, count: 6, wood });
  s = (await api(p, 'GET', '/api/state')).json.state;
  return { id, after: cupsOf(s, id) };
};
const kA = await kilnPlayer(A, 12), kB = await kilnPlayer(B, 36);
const w = await api(A, 'POST', '/api/dev/village-warp', { minutes: 24 * 60 + 130 });
if (w.status !== 200) fail('village-warp ' + w.status);
for (const [p, k] of [[A, kA], [B, kB]]) {
  let ok = false;
  for (let i = 0; i < 10 && !ok; i++) {
    const s = (await api(p, 'GET', '/api/state')).json.state;
    ok = cupsOf(s, k.id) >= k.after + 6;
    if (!ok) await new Promise((r) => setTimeout(r, 500));
  }
  if (!ok) fail('kiln cups not returned');
}
v = (await api(A, 'GET', '/api/village')).json.village;
if (v.lastFiring?.pieces !== 12) fail('lastFiring.pieces ' + v.lastFiring?.pieces);
if (!v.news.some((n) => n.text.includes('abgekühlt'))) fail('no cooled-down news');
console.log('great kiln: ok, 12 pieces fired');

if (v.projects.offered.length < 1) fail('no projects offered');
// pick the offer whose first stage has the most material parts (the project data comes straight from the dev server's module graph),
// so A can buy at least half the stage in the village store and the Taler remainder below must hit the 70 % cap
const firstStageMaterials = await A.evaluate(async (ids) => {
  const { PROJECTS } = await import('/src/shared/village/projects.ts');
  return Object.fromEntries(ids.map((id) => [id, PROJECTS[id].stages[0].parts.filter((p) => p.kind === 'material').length]));
}, v.projects.offered);
const projectId = [...v.projects.offered].sort((x, y) => firstStageMaterials[y] - firstStageMaterials[x])[0];
if (firstStageMaterials[projectId] < 2) fail(`${projectId} has only ${firstStageMaterials[projectId]} material parts in stage 1`);
const proj = async (p, part, count, source = 'store') => api(p, 'POST', '/api/village/action', { action: { type: 'contributeProject', projectId, part, count, source } });
const projOk = async (p, part, count, source) => { const r = await proj(p, part, count, source); if (r.status !== 200) fail(`contributeProject: ${r.status} ${JSON.stringify(r.json)}`); return r.json.village; };
const stageOf = async () => (await api(A, 'GET', '/api/village')).json.village.projects.active;
const firstMat = (await (async () => {
  // before the project starts, the stage is not instantiated yet: start it with one unit of the first material part
  for (let part = 0; part < 4; part++) { const r = await proj(A, part, 1); if (r.status === 200) return part; if (!/Dafür|Ersatz|Ware/.test(JSON.stringify(r.json))) fail('start project: ' + JSON.stringify(r.json)); }
  fail('no material part to start the project');
})());
let act1 = await stageOf();
if (act1?.projectId !== projectId) fail('project not active: ' + JSON.stringify(act1));
const talerIdx = act1.parts.findIndex((x) => x.kind === 'taler');
await projOk(B, talerIdx, 1000, 'own');
// A fills material parts up to near the 70 % cap, then the Taler remainder must be refused
const nParts = () => act1.parts.length;
for (let part = 0; part < nParts(); part++) {
  act1 = await stageOf();
  const p = act1.parts[part];
  if (p.kind !== 'material') continue;
  const size = p.count, left = size - p.filled;
  // masterwork parts weigh nothing (stageShares in src/shared/village/projects.ts)
  const valued = act1.parts.filter((q) => q.kind !== 'masterwork').length;
  const share = act1.parts.reduce((t, q) => t + (q.kind === 'masterwork' ? 0 : ((q.by[idA] ?? 0) / (q.kind === 'taler' ? q.amount : q.count)) / valued), 0);
  let n = Math.min(left, Math.floor((0.7 - share) * size * valued + 1e-9));
  while (n > 0) { const r = await proj(A, part, n); if (r.status === 200) break; n = Math.floor(n / 2); }
}
act1 = await stageOf();
const tp = act1.parts[talerIdx];
const r70 = await proj(A, talerIdx, tp.amount - tp.filled, 'own');
if (r70.status !== 400 || !String(r70.json?.error ?? JSON.stringify(r70.json)).includes('70 %')) fail('70 % cap not enforced: ' + r70.status + ' ' + JSON.stringify(r70.json));
console.log('project: started', projectId, 'stage', act1.stage, '- 70 % cap enforced');

// screenshots: the village map, and B's shelf with A's gifted cups
const giftCups = sA.goods.find((g) => !g.designId.startsWith('f:') && g.count >= 3);
if (giftCups) await vact(A, { type: 'gift', to: idB, give: { kind: 'goods', designId: giftCups.designId, quality: giftCups.quality, effect: giftCups.effect, count: 3 } });
await B.reload({ waitUntil: 'networkidle' });
await B.waitForSelector('.scene');
for (let i = 0; i < 12 && (await B.locator('.modal-backdrop').count()); i++) {
  const b = B.locator('.modal-backdrop button').first();
  if (!(await b.count())) break;
  await b.click().catch(() => {});
  await B.waitForTimeout(250);
}
await B.click('[aria-label="Dorf"]');
await B.waitForSelector('.village-map');
await B.waitForTimeout(1200);
await B.screenshot({ path: 'docs/screens/village-live.png' });
await B.screenshot({ path: 'docs/screens/village-lg-live.png' });
await B.click('role=tab[name="Großaufträge"]');
await B.waitForTimeout(600);
await B.screenshot({ path: 'docs/screens/village-joint.png' });
await B.click('role=tab[name="Tauschbrett"]');
await B.waitForTimeout(400);
await B.screenshot({ path: 'docs/screens/village-trade.png' });
await B.click('role=tab[name="Dorfprojekt"]');
await B.waitForTimeout(600);
await B.screenshot({ path: 'docs/screens/village-lg-project.png' });
await B.click('role=tab[name="Gemeinschaftsofen"]');
await B.waitForTimeout(600);
await B.screenshot({ path: 'docs/screens/village-lg-kiln.png' });
if (errors.length) fail('page errors: ' + errors.join(' | '));
console.log('VILLAGE SMOKE OK');
await browser.close();
