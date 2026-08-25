import { Router } from 'express';
import { userOf, wrap } from '../http/helpers.js';
import type { CardService } from '../services/card.service.js';

/** Card controller — card lifecycle, movement, links, and checklist endpoints. */
export function cardController(cards: CardService): Router {
  const router = Router();

  router.post('/lanes/:id/cards', wrap(async (req, res) => {
    res.status(201).json({ card: await cards.create(req.params.id, userOf(req), req.body ?? {}) });
  }));

  router.get('/cards/:id', wrap(async (req, res) => {
    res.json({ card: cards.get(req.params.id) });
  }));

  router.patch('/cards/:id', wrap(async (req, res) => {
    res.json({ card: await cards.update(req.params.id, req.body ?? {}) });
  }));

  router.post('/cards/:id/move', wrap(async (req, res) => {
    res.json({ card: await cards.move(req.params.id, req.body ?? {}) });
  }));

  router.delete('/cards/:id', wrap(async (req, res) => {
    await cards.delete(req.params.id);
    res.json({ ok: true });
  }));

  // ── Links (card → board) ──
  router.post('/cards/:id/link', wrap(async (req, res) => {
    res.json({ card: await cards.link(req.params.id, req.body ?? {}) });
  }));

  router.delete('/cards/:id/link', wrap(async (req, res) => {
    res.json({ card: await cards.unlink(req.params.id) });
  }));

  // ── Checklist ──
  router.post('/cards/:id/checklist', wrap(async (req, res) => {
    res.status(201).json({ item: await cards.addChecklistItem(req.params.id, req.body ?? {}) });
  }));

  router.post('/cards/:id/checklist/:itemId/toggle', wrap(async (req, res) => {
    res.json({ item: await cards.toggleChecklistItem(req.params.id, req.params.itemId) });
  }));

  router.delete('/cards/:id/checklist/:itemId', wrap(async (req, res) => {
    await cards.removeChecklistItem(req.params.id, req.params.itemId);
    res.json({ ok: true });
  }));

  return router;
}
