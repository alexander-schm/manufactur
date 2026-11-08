import { handleFound, handleJoin, handleLogin, handleLogout, handleMe } from './auth';
import { handleWarp } from './dev';
import { handleVillageAction, handleVillageView, handleVisit } from './village';
export { VillageDO } from './village';
import { handleAction, handleGetState } from './game';
import { error, json } from './http';

export interface Env {
  DB: D1Database;
  VILLAGE: DurableObjectNamespace<import('./village').VillageDO>;
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
        case 'POST /api/found':
          return await handleFound(req, env);
        case 'POST /api/join':
          return await handleJoin(req, env);
        case 'POST /api/login':
          return await handleLogin(req, env);
        case 'POST /api/logout':
          return await handleLogout(req, env);
        case 'GET /api/me':
          return await handleMe(req, env);
        case 'GET /api/state':
          return await handleGetState(req, env);
        case 'POST /api/action':
          return await handleAction(req, env);
        case 'POST /api/dev/warp':
          return await handleWarp(req, env);
        case 'GET /api/village':
          return await handleVillageView(req, env);
        case 'POST /api/village/action':
          return await handleVillageAction(req, env);
        default: {
          const visit = /^GET \/api\/village\/visit\/([\w-]{1,64})$/.exec(route);
          if (visit) return await handleVisit(req, env, visit[1]);
          return error(404, 'Nicht gefunden');
        }
      }
    } catch (e) {
      console.error(e);
      return error(500, 'Da ist etwas schiefgegangen');
    }
  },
} satisfies ExportedHandler<Env>;
