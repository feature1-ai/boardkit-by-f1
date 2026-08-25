import type { Boardkit } from '../../../src/index.js';
import type { Board } from '../models/board.model.js';
import type { AddMemberDto } from '../models/member.model.js';

/** Member service — membership operations on a board. Rules live in the engine. */
export class MemberService {
  constructor(private readonly engine: Boardkit) {}

  add(boardId: string, dto: AddMemberDto): Promise<Board> {
    return this.engine.addMember(boardId, dto.userId);
  }

  remove(boardId: string, userId: string): Promise<Board> {
    return this.engine.removeMember(boardId, userId);
  }
}
