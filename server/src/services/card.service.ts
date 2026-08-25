import type { Boardkit } from '../../../src/index.js';
import type {
  AddChecklistItemDto,
  Card,
  ChecklistItem,
  CreateCardDto,
  LinkCardDto,
  MoveCardDto,
  UpdateCardDto,
} from '../models/card.model.js';

/** Card service — card lifecycle, movement, links, checklist. Rules live in the engine. */
export class CardService {
  constructor(private readonly engine: Boardkit) {}

  get(cardId: string): Card {
    return this.engine.getCard(cardId);
  }

  create(laneId: string, userId: string, dto: CreateCardDto): Promise<Card> {
    return this.engine.createCard(laneId, { ...dto, createdBy: userId });
  }

  update(cardId: string, dto: UpdateCardDto): Promise<Card> {
    return this.engine.updateCard(cardId, dto);
  }

  move(cardId: string, dto: MoveCardDto): Promise<Card> {
    return this.engine.moveCard(cardId, dto);
  }

  delete(cardId: string): Promise<void> {
    return this.engine.deleteCard(cardId);
  }

  link(cardId: string, dto: LinkCardDto): Promise<Card> {
    return this.engine.linkCardToBoard(cardId, dto.boardId);
  }

  unlink(cardId: string): Promise<Card> {
    return this.engine.unlinkCard(cardId);
  }

  addChecklistItem(cardId: string, dto: AddChecklistItemDto): Promise<ChecklistItem> {
    return this.engine.addChecklistItem(cardId, dto.text);
  }

  toggleChecklistItem(cardId: string, itemId: string): Promise<ChecklistItem> {
    return this.engine.toggleChecklistItem(cardId, itemId);
  }

  removeChecklistItem(cardId: string, itemId: string): Promise<void> {
    return this.engine.removeChecklistItem(cardId, itemId);
  }
}
