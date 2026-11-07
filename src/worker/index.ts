import { error, json } from './http';

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  DEV_FAST?: string;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req);
    const route = `${req.method} ${url.pathname}`;
    try {
      switch (route) {
        case 'GET /api/health':
          return json({ ok: true });
        default:
          return error(404, 'Nicht gefunden');
      }
    } catch (e) {
      console.error(e);
      return error(500, 'Da ist etwas schiefgegangen');
    }
  },
} satisfies ExportedHandler<Env>;
