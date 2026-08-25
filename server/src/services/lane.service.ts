import type { Boardkit } from '../../../src/index.js';
import type { Board } from '../models/board.model.js';
import type { CreateLaneDto, Lane, MoveLaneDto, UpdateLaneDto } from '../models/lane.model.js';

/** Lane service — lane lifecycle and ordering. Rules live in the engine. */
export class LaneService {
  constructor(private readonly engine: Boardkit) {}

  create(boardId: string, dto: CreateLaneDto): Promise<Lane> {
    return this.engine.addLane(boardId, dto);
  }

  update(laneId: string, dto: UpdateLaneDto): Promise<Lane> {
    return this.engine.updateLane(laneId, dto);
  }

  move(laneId: string, dto: MoveLaneDto): Promise<Board> {
    return this.engine.moveLane(laneId, dto.toIndex);
  }

  delete(laneId: string, moveCardsToLaneId?: string): Promise<void> {
    return this.engine.deleteLane(laneId, moveCardsToLaneId ? { moveCardsToLaneId } : {});
  }
}
