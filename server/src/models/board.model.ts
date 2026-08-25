/**
 * Board resource model.
 *
 * The domain model — the Board entity and every rule about it — lives in the
 * engine (the core package); it is THE Model of this system, shared by all
 * transports. This module is the HTTP-facing shape of the resource: the
 * entity types re-exported for controllers/services, plus the request DTOs.
 */
export type { Board, Member } from '../../../src/index.js';

export interface CreateBoardDto {
  name: string;
  lanes?: string[];
}

export interface RenameBoardDto {
  name: string;
}
