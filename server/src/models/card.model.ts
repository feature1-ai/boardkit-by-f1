/** Card resource model — entity types from the engine + request DTOs. */
export type { Card, ChecklistItem, Label } from '../../../src/index.js';
import type { Label } from '../../../src/index.js';

export interface CreateCardDto {
  title: string;
  description?: string;
  owner?: string;
  labels?: Label[];
  dueDate?: string;
  checklist?: Array<{ text: string; done?: boolean }>;
  index?: number;
}

export interface UpdateCardDto {
  title?: string;
  description?: string | null;
  owner?: string | null;
  labels?: Label[];
  dueDate?: string | null;
}

export interface MoveCardDto {
  toLaneId?: string;
  toIndex?: number;
}

export interface LinkCardDto {
  boardId: string;
}

export interface AddChecklistItemDto {
  text: string;
}
