import type { NextFunction, Request, Response } from 'express';
import { BoardkitError, type BoardkitErrorCode } from '../../../src/index.js';

/** Engine error codes → HTTP statuses. The single place transport meets domain failures. */
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

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof BoardkitError) {
    res.status(STATUS_BY_CODE[error.code] ?? 400).json({ error: error.message, code: error.code });
    return;
  }
  console.error('[boardkit-server] unexpected error:', error);
  res.status(500).json({ error: 'Internal server error' });
}
