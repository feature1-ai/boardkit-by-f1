import type { Boardkit } from '../../../src/index.js';
import type { Board, CreateBoardDto, RenameBoardDto } from '../models/board.model.js';

/**
 * Board service — the per-resource seam between HTTP and the engine.
 * Domain rules stay in the engine; this layer is where server-side concerns
 * (authorization, quotas, audit, telemetry) attach without touching either
 * the controllers or the domain.
 */
export class BoardService {
  constructor(private readonly engine: Boardkit) {}

  list(): Board[] {
    return this.engine.listBoards();
  }

  get(boardId: string): Board {
    return this.engine.getBoard(boardId);
  }

  create(userId: string, dto: CreateBoardDto): Promise<Board> {
    return this.engine.createBoard({ name: dto.name, createdBy: userId, lanes: dto.lanes });
  }

  rename(boardId: string, dto: RenameBoardDto): Promise<Board> {
    return this.engine.renameBoard(boardId, dto.name);
  }

  delete(boardId: string): Promise<void> {
    return this.engine.deleteBoard(boardId);
  }
}
