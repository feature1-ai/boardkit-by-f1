import { Router } from 'express';
import { wrap } from '../http/helpers.js';
import type { LaneService } from '../services/lane.service.js';

/** Lane controller — lane lifecycle and ordering endpoints. */
export function laneController(lanes: LaneService): Router {
  const router = Router();

  router.post('/boards/:id/lanes', wrap(async (req, res) => {
    res.status(201).json({ lane: await lanes.create(req.params.id, req.body ?? {}) });
  }));

  router.patch('/lanes/:id', wrap(async (req, res) => {
    res.json({ lane: await lanes.update(req.params.id, req.body ?? {}) });
  }));

  router.post('/lanes/:id/move', wrap(async (req, res) => {
    res.json({ board: await lanes.move(req.params.id, req.body ?? {}) });
  }));

  router.delete('/lanes/:id', wrap(async (req, res) => {
    await lanes.delete(req.params.id, req.query.moveCardsToLaneId as string | undefined);
    res.json({ ok: true });
  }));

  return router;
}
