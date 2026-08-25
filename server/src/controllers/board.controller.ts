import { Router } from 'express';
import { userOf, wrap } from '../http/helpers.js';
import type { BoardService } from '../services/board.service.js';

/** Board controller — HTTP in, service call, HTTP out. No domain logic here. */
export function boardController(boards: BoardService): Router {
  const router = Router();

  router.get('/boards', wrap(async (_req, res) => {
    res.json({ boards: boards.list() });
  }));

  router.post('/boards', wrap(async (req, res) => {
    res.status(201).json({ board: await boards.create(userOf(req), req.body ?? {}) });
  }));

  router.get('/boards/:id', wrap(async (req, res) => {
    res.json({ board: boards.get(req.params.id) });
  }));

  router.patch('/boards/:id', wrap(async (req, res) => {
    res.json({ board: await boards.rename(req.params.id, req.body ?? {}) });
  }));

  router.delete('/boards/:id', wrap(async (req, res) => {
    await boards.delete(req.params.id);
    res.json({ ok: true });
  }));

  return router;
}
