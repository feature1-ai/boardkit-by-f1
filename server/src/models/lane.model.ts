/** Lane resource model — entity types from the engine + request DTOs. */
export type { Lane } from '../../../src/index.js';

export interface CreateLaneDto {
  name: string;
  color?: string;
  index?: number;
}

export interface UpdateLaneDto {
  name?: string;
  color?: string | null;
}

export interface MoveLaneDto {
  toIndex: number;
}
