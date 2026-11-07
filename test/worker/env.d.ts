import type { Env as WorkerEnv } from '../../src/worker/index';

declare global {
  namespace Cloudflare {
    interface Env extends WorkerEnv {
      TEST_MIGRATIONS: import('cloudflare:test').D1Migration[];
    }
  }
}
