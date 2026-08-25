export type BoardkitErrorCode =
  | 'board_not_found'
  | 'lane_not_found'
  | 'card_not_found'
  | 'checklist_item_not_found'
  | 'member_not_found'
  | 'duplicate_member'
  | 'owner_not_member'
  | 'lane_not_empty'
  | 'lane_board_mismatch'
  | 'cross_board_move_unsupported'
  | 'cannot_link_own_board'
  | 'invalid_input';

/**
 * Every engine failure is a typed BoardkitError with a stable `code` —
 * hosts branch on codes, never on message text.
 */
export class BoardkitError extends Error {
  readonly code: BoardkitErrorCode;

  constructor(code: BoardkitErrorCode, message: string) {
    super(message);
    this.name = 'BoardkitError';
    this.code = code;
  }
}

export const err = (code: BoardkitErrorCode, message: string): never => {
  throw new BoardkitError(code, message);
};
