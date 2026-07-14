import { describe, expect, it } from 'vitest';

// These env vars are only needed because importing the router transitively
// imports src/config/env.ts, which validates process.env at import time.
// Dynamic import (not a static top-level import) so this runs after the
// assignments below rather than being hoisted above them.
process.env.MONGO_URI ??= 'mongodb://localhost/test';
process.env.JWT_ACCESS_SECRET ??= 'x'.repeat(32);
process.env.JWT_REFRESH_SECRET ??= 'y'.repeat(32);

type RouteLayer = {
  route?: {
    path: string;
    stack: Array<{ name: string }>;
  };
};

describe('task route authorization wiring', () => {
  it('requires both requireAuth and requireTaskAccess on every /tasks/:taskId method', async () => {
    // Regression test for the IDOR fix: GET /tasks/:taskId previously only
    // had requireAuth, letting any logged-in user fetch any task by id
    // regardless of project membership. This asserts all three methods on
    // that route (GET/PATCH/DELETE) consistently carry both middlewares.
    const router = (await import('../src/routes/index.js')).default;
    const taskIdLayers = (router.stack as RouteLayer[]).filter(
      (layer) => layer.route?.path === '/tasks/:taskId',
    );

    expect(taskIdLayers.length).toBe(3); // GET, PATCH, DELETE

    for (const layer of taskIdLayers) {
      const middlewareNames = layer.route!.stack.map((l) => l.name);
      expect(middlewareNames).toContain('requireAuth');
      expect(middlewareNames).toContain('requireTaskAccess');
    }
  });
});
