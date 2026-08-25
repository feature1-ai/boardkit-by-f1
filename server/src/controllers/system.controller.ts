import { Router } from 'express';
import type { Boardkit } from '../../../src/index.js';
import { wrap } from '../http/helpers.js';

/**
 * System controller — health, the full state snapshot remote clients hydrate
 * from, and the SSE stream that republishes every engine event so clients
 * stay live. Talks to the engine directly: these are transport-level
 * concerns over the whole state, not operations on one resource.
 */
export function systemController(engine: Boardkit): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  router.get('/state', wrap(async (_req, res) => {
    res.json(engine.snapshot());
  }));

  router.get('/events', (req, res) => {
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.flushHeaders();
    const off = engine.on('*', (event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });
    const keepAlive = setInterval(() => res.write(': ping\n\n'), 25000);
    req.on('close', () => {
      off();
      clearInterval(keepAlive);
    });
  });

  return router;
}
