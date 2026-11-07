import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

describe('health', () => {
  it('GET /api/health returns ok', async () => {
    const res = await SELF.fetch('http://x/api/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
  it('unknown api path is a JSON 404', async () => {
    const res = await SELF.fetch('http://x/api/nope');
    expect(res.status).toBe(404);
    expect(await res.json()).toHaveProperty('error');
  });
});
