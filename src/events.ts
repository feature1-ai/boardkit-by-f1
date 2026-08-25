import type { BoardkitEvent, BoardkitEventHandler, BoardkitEventType } from './types.js';

/**
 * Minimal typed emitter. Subscribe to a specific event type or to '*' for
 * everything. Handler errors are swallowed by design: a broken subscriber
 * (an automation rule, a projection) must never corrupt an engine mutation
 * that has already been applied.
 */
export class EventBus {
  private handlers = new Map<string, Set<BoardkitEventHandler>>();

  on(type: BoardkitEventType | '*', handler: BoardkitEventHandler): () => void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
    return () => this.off(type, handler);
  }

  off(type: BoardkitEventType | '*', handler: BoardkitEventHandler): void {
    this.handlers.get(type)?.delete(handler);
  }

  emit(event: BoardkitEvent): void {
    for (const type of [event.type, '*'] as const) {
      for (const handler of this.handlers.get(type) ?? []) {
        try {
          handler(event);
        } catch {
          // Subscriber errors never propagate into engine mutations.
        }
      }
    }
  }
}
