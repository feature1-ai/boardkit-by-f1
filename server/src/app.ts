import express from 'express';
import cors from 'cors';
import type { Boardkit } from '../../src/index.js';
import { errorHandler } from './http/errorHandler.js';
import { boardController } from './controllers/board.controller.js';
import { cardController } from './controllers/card.controller.js';
import { laneController } from './controllers/lane.controller.js';
import { memberController } from './controllers/member.controller.js';
import { systemController } from './controllers/system.controller.js';
import { BoardService } from './services/board.service.js';
import { CardService } from './services/card.service.js';
import { LaneService } from './services/lane.service.js';
import { MemberService } from './services/member.service.js';

/**
 * Composition root. Layering:
 *
 *   controllers/  HTTP in, service call, HTTP out — no domain logic
 *   services/     per-resource seam over the engine — where server-side
 *                 concerns (authz, quotas, audit) attach
 *   models/       resource types + request DTOs
 *   engine        THE domain model — every rule lives there, shared by
 *                 every transport (REST, in-browser, tests)
 *
 * Identity rides the X-User-Id header (see http/helpers.ts); engine error
 * codes map to HTTP statuses in http/errorHandler.ts.
 */
export function createApp(engine: Boardkit) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.use(systemController(engine));
  app.use(boardController(new BoardService(engine)));
  app.use(memberController(new MemberService(engine)));
  app.use(laneController(new LaneService(engine)));
  app.use(cardController(new CardService(engine)));

  app.use(errorHandler);
  return app;
}
