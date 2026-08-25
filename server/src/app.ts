import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { Boardkit, BoardkitError, type BoardkitErrorCode } from '../../src/index.js';

/**
 * REST API over the Boardkit engine.
 *
 * Identity model: the engine is identity-agnostic, and so is this server —
 * the caller's user id rides the X-User-Id header verbatim. Put your real
 * auth (a gateway, a session middleware) in front and set that header from
 * the authenticated principal.
 *
 * Every mutation flows through the engine, so every mutation is persisted
 * by the configured storage adapter and emitted on the event stream, which
 * GET /events republishes over SSE.
 */

const STATUS_BY_CODE: Record<BoardkitErrorCode, number> = {
  board_not_found: 404,
  lane_not_found: 404,
  card_not_found: 404,
  checklist_item_not_found: 404,
  member_not_found: 404,
  duplicate_member: 409,
  owner_not_member: 400,
  lane_not_empty: 400,
  lane_board_mismatch: 400,
  cross_board_move_unsupported: 400,
  cannot_link_own_board: 400,
  invalid_input: 400,
};

type Handler = (req: Request, res: Response) => Promise<void> | void;
const wrap = (handler: Handler) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(handler(req, res)).catch(next);
};

const userOf = (req: Request): string => String(req.headers['x-user-id'] || 'anonymous');

export function createApp(engine: Boardkit) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  /** Full state snapshot — what remote clients hydrate from. */
  app.get('/state', wrap(async (_req, res) => {
    res.json(engine.snapshot());
  }));

  /** Live updates: every engine event, republished as SSE. */
  app.get('/events', (req, res) => {
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

  // ── Boards ──
  app.get('/boards', wrap(async (_req, res) => {
    res.json({ boards: engine.listBoards() });
  }));
  app.post('/boards', wrap(async (req, res) => {
    const board = await engine.createBoard({
      name: req.body?.name,
      createdBy: userOf(req),
      lanes: req.body?.lanes,
    });
    res.status(201).json({ board });
  }));
  app.get('/boards/:id', wrap(async (req, res) => {
    res.json({ board: engine.getBoard(req.params.id) });
  }));
  app.patch('/boards/:id', wrap(async (req, res) => {
    res.json({ board: await engine.renameBoard(req.params.id, req.body?.name) });
  }));
  app.delete('/boards/:id', wrap(async (req, res) => {
    await engine.deleteBoard(req.params.id);
    res.json({ ok: true });
  }));

  // ── Members ──
  app.post('/boards/:id/members', wrap(async (req, res) => {
    res.status(201).json({ board: await engine.addMember(req.params.id, req.body?.userId) });
  }));
  app.delete('/boards/:id/members/:userId', wrap(async (req, res) => {
    res.json({ board: await engine.removeMember(req.params.id, req.params.userId) });
  }));

  // ── Lanes ──
  app.post('/boards/:id/lanes', wrap(async (req, res) => {
    const lane = await engine.addLane(req.params.id, {
      name: req.body?.name,
      color: req.body?.color,
      index: req.body?.index,
    });
    res.status(201).json({ lane });
  }));
  app.patch('/lanes/:id', wrap(async (req, res) => {
    res.json({ lane: await engine.updateLane(req.params.id, req.body ?? {}) });
  }));
  app.post('/lanes/:id/move', wrap(async (req, res) => {
    res.json({ board: await engine.moveLane(req.params.id, req.body?.toIndex) });
  }));
  app.delete('/lanes/:id', wrap(async (req, res) => {
    const moveCardsToLaneId = req.query.moveCardsToLaneId as string | undefined;
    await engine.deleteLane(req.params.id, moveCardsToLaneId ? { moveCardsToLaneId } : {});
    res.json({ ok: true });
  }));

  // ── Cards ──
  app.post('/lanes/:id/cards', wrap(async (req, res) => {
    const card = await engine.createCard(req.params.id, { ...req.body, createdBy: userOf(req) });
    res.status(201).json({ card });
  }));
  app.get('/cards/:id', wrap(async (req, res) => {
    res.json({ card: engine.getCard(req.params.id) });
  }));
  app.patch('/cards/:id', wrap(async (req, res) => {
    res.json({ card: await engine.updateCard(req.params.id, req.body ?? {}) });
  }));
  app.post('/cards/:id/move', wrap(async (req, res) => {
    res.json({ card: await engine.moveCard(req.params.id, req.body ?? {}) });
  }));
  app.delete('/cards/:id', wrap(async (req, res) => {
    await engine.deleteCard(req.params.id);
    res.json({ ok: true });
  }));

  // ── Links ──
  app.post('/cards/:id/link', wrap(async (req, res) => {
    res.json({ card: await engine.linkCardToBoard(req.params.id, req.body?.boardId) });
  }));
  app.delete('/cards/:id/link', wrap(async (req, res) => {
    res.json({ card: await engine.unlinkCard(req.params.id) });
  }));

  // ── Checklist ──
  app.post('/cards/:id/checklist', wrap(async (req, res) => {
    res.status(201).json({ item: await engine.addChecklistItem(req.params.id, req.body?.text) });
  }));
  app.post('/cards/:id/checklist/:itemId/toggle', wrap(async (req, res) => {
    res.json({ item: await engine.toggleChecklistItem(req.params.id, req.params.itemId) });
  }));
  app.delete('/cards/:id/checklist/:itemId', wrap(async (req, res) => {
    await engine.removeChecklistItem(req.params.id, req.params.itemId);
    res.json({ ok: true });
  }));

  // ── Errors: BoardkitError codes map to HTTP statuses ──
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof BoardkitError) {
      res.status(STATUS_BY_CODE[error.code] ?? 400).json({ error: error.message, code: error.code });
      return;
    }
    console.error('[boardkit-server] unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
