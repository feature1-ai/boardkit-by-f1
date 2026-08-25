# Boardkit

**A Trello-like flexible task engine + extensible workflow automation — the foundation for building vertical process automation products.**

The thesis: a flexible board/lane/card engine with typed events is generic infrastructure. The vertical-specific value — a hiring pipeline, a content calendar, an incident tracker, a deal flow — comes from the *opinions and domain rules you build on top*: fixed stage names, required fields, assignment policies, automations. Boardkit gives you the engine so you only build the opinions.

- **Zero runtime dependencies.** TypeScript, Node ≥ 18.
- **Identity-agnostic.** User ids are opaque strings owned by your app — bring your own auth and tenancy.
- **Storage-agnostic.** A two-method adapter interface; in-memory and atomic JSON-file stores included.
- **Every mutation emits a typed event.** That's the extension surface: domain rules, projections, and the upcoming automation rules engine all subscribe to the same stream.
- **Typed errors.** Every failure is a `BoardkitError` with a stable `code` — branch on codes, never message text.

## What's in the engine (v1)

- **Boards** with **configurable lanes** (name, color, freely ordered).
- **Cards** with: created-by, freeform **labels with color**, **due date**, **checklist**, **owner**.
- **Board members** — owners must be members (a switchable rule).
- **Card → board links** — a card can point to another board (sub-board / drill-down).
- **Movable cards** — reorder within a lane, move across lanes, index-targeted.

## Quickstart

```bash
npm install @feature1/boardkit
```

```ts
import { Boardkit, JsonFileStore } from '@feature1/boardkit';

const engine = new Boardkit({ store: new JsonFileStore('./data/boards.json') });

const board = await engine.createBoard({
  name: 'Product',
  createdBy: 'user-alice',
  lanes: ['Todo', 'Doing', 'Done'],
});
await engine.addMember(board.id, 'user-bob');

const card = await engine.createCard(board.laneIds[0]!, {
  title: 'Ship the launch post',
  createdBy: 'user-alice',
  owner: 'user-bob',
  labels: [{ text: 'urgent', color: '#ef4444' }],
  dueDate: '2026-09-01T00:00:00.000Z',
  checklist: [{ text: 'Draft' }, { text: 'Review' }],
});

await engine.moveCard(card.id, { toLaneId: board.laneIds[1]!, toIndex: 0 });

engine.on('card.moved', (event) => {
  console.log('moved', event.cardId, event.detail);
});
```

Sub-boards via card links:

```ts
const subBoard = await engine.createBoard({ name: 'Launch checklist', createdBy: 'user-alice', lanes: ['Steps'] });
await engine.linkCardToBoard(card.id, subBoard.id); // card now points at the sub-board
```

## Building a vertical

A vertical is a thin layer of opinions over the engine. See [`examples/hiring-pipeline.ts`](examples/hiring-pipeline.ts) for a complete one in ~60 lines:

1. **Fixed structure** — create boards with your domain's stage names.
2. **Domain rules** — subscribe to events and enforce policy (e.g. "no card reaches *Interview* without an owner").
3. **Drill-downs** — link cards to sub-boards for per-item processes (a candidate's onboarding board).

```bash
npx tsx examples/hiring-pipeline.ts
```

## API surface

| Area | Methods |
|---|---|
| Boards | `createBoard` · `getBoard` · `listBoards` · `renameBoard` · `deleteBoard` |
| Members | `addMember` · `removeMember` (unassigns their cards; `createdBy` is historical) |
| Lanes | `addLane` · `getLane` · `updateLane` · `moveLane` · `deleteLane({ moveCardsToLaneId })` |
| Cards | `createCard` · `getCard` · `listCards` · `updateCard` · `moveCard` · `deleteCard` |
| Links | `linkCardToBoard` · `unlinkCard` (own-board links are rejected; deleting a board clears links pointing at it) |
| Checklist | `addChecklistItem` · `toggleChecklistItem` · `removeChecklistItem` |
| Events | `on(type \| '*', handler)` → returns an unsubscribe function |

Events: `board.created/updated/deleted`, `member.added/removed`, `lane.created/updated/moved/deleted`, `card.created/updated/moved/linked/unlinked/deleted`, `checklist.updated`. Handlers fire **after** the state is persisted; a throwing handler never corrupts a mutation.

### Storage adapters

```ts
interface StorageAdapter {
  loadAll(): Promise<BoardkitState | null>;
  saveAll(state: BoardkitState): Promise<void>;
}
```

Coarse-grained by design: trivial to implement for any backing store (S3 object, browser storage, a DB row). Included: `MemoryStore` (default) and `JsonFileStore` (atomic temp-file-and-rename writes). Suited to single-writer embedding; a row-level SQL adapter is on the roadmap for multi-writer deployments.

## Roadmap

- **Automation rules engine** — declarative trigger → condition → action rules (Butler-style) registered on the event stream, with pluggable custom actions. The events layer shipped in v1 is its foundation.
- **REST API server** — a thin self-hostable HTTP layer over the engine.
- **Row-level SQL storage adapter** (Postgres) for multi-writer deployments.
- **Cross-board card moves** — deliberately excluded from v1 (owner validity and link semantics deserve their own design pass).
- **Custom field schemas** — vertical-defined typed fields on cards.

## REST API server

A self-hostable backend lives in [`server/`](server/) — Express over the engine, **Postgres-backed** with a zero-config JSON-file fallback:

```bash
cd server
npm install
npm run dev                     # → :4400, state in ./data/boardkit.json
DATABASE_URL=postgres://… npm run dev   # → state in Postgres (boardkit_state, auto-created)
```

- Endpoints mirror the engine API: boards, members, lanes, cards, moves, links, checklists — plus `GET /state` (full snapshot) and `GET /events` (every engine event over SSE, so clients stay live).
- **Identity**: the caller's user id rides the `X-User-Id` header verbatim — the server is identity-agnostic like the engine; put your real auth in front and set the header from the authenticated principal.
- Engine error codes map to HTTP statuses (`*_not_found` → 404, `duplicate_member` → 409, rule violations → 400).

## Demo UI

A board UI in [`ui/`](ui/), styled in the **Feature1 design language** — dark near-black-indigo glass surfaces, Signal Violet accent, Inter, flat single-color SVG icons — with drag-and-drop cards and the full card editor (labels, due date, owner, checklist, board links).

```bash
cd ui && npm install && npm run dev   # → http://localhost:5173
```

The UI auto-detects the backend: with the server running it operates in **server mode** (REST + SSE, state in the server's database); without it, it falls back to running the engine **entirely in the browser** against `localStorage`. The mode chip in the app bar shows which. `ui/src/store.ts` is the reference for both embeddings — the `BoardClient` interface, a snapshot-cache REST client, and a ~15-line localStorage adapter.

## Development

```bash
npm install
npm test        # vitest
npm run build   # tsup → dist (ESM + CJS + d.ts)
```

## License

[MIT](LICENSE)
