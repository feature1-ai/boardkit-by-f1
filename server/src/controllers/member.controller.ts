import { Router } from 'express';
import { wrap } from '../http/helpers.js';
import type { MemberService } from '../services/member.service.js';

/** Member controller — membership sub-resource of a board. */
export function memberController(members: MemberService): Router {
  const router = Router();

  router.post('/boards/:id/members', wrap(async (req, res) => {
    res.status(201).json({ board: await members.add(req.params.id, req.body ?? {}) });
  }));

  router.delete('/boards/:id/members/:userId', wrap(async (req, res) => {
    res.json({ board: await members.remove(req.params.id, req.params.userId) });
  }));

  return router;
}
