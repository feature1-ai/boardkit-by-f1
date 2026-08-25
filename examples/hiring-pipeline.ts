/**
 * A vertical in ~60 lines: a hiring pipeline built on Boardkit.
 *
 * The engine gives you boards/lanes/cards/members/links/events. The vertical
 * is just opinions layered on top: fixed stage names, domain rules enforced
 * as event subscribers, and a linked sub-board per late-stage candidate.
 *
 * Run with: npx tsx examples/hiring-pipeline.ts
 */
import { Boardkit } from '../src/index.js';

const STAGES = ['Applied', 'Screen', 'Interview', 'Offer', 'Hired'];

const engine = new Boardkit();

// Opinion #1: every hiring board has the same stages.
const pipeline = await engine.createBoard({
  name: 'Backend Engineer — Hiring',
  createdBy: 'recruiter-dana',
  lanes: STAGES,
});
await engine.addMember(pipeline.id, 'hiring-manager-lee');

const laneByName = Object.fromEntries(
  pipeline.laneIds.map((id) => [engine.getLane(id).name, id])
);

// Opinion #2 (domain rule as an event subscriber): a candidate cannot sit in
// Interview without an owner — flag it the moment it happens.
engine.on('card.moved', (event) => {
  if (event.detail?.toLaneId !== laneByName['Interview']) return;
  const card = engine.getCard(event.cardId!);
  if (!card.owner) {
    console.warn(`⚠ Rule violation: "${card.title}" reached Interview with no interviewer assigned`);
  }
});

// A candidate arrives.
const candidate = await engine.createCard(laneByName['Applied']!, {
  title: 'Sam Carter',
  createdBy: 'recruiter-dana',
  labels: [{ text: 'referral', color: '#22c55e' }],
  dueDate: '2026-09-05T00:00:00.000Z',
  checklist: [{ text: 'CV reviewed' }, { text: 'References collected' }],
});

// Moves through the pipeline — the Interview rule fires on the second move.
await engine.moveCard(candidate.id, { toLaneId: laneByName['Screen']! });
await engine.moveCard(candidate.id, { toLaneId: laneByName['Interview']! });

// Fix the violation, complete a checklist step.
await engine.updateCard(candidate.id, { owner: 'hiring-manager-lee' });
const cv = engine.getCard(candidate.id).checklist[0]!;
await engine.toggleChecklistItem(candidate.id, cv.id);

// Opinion #3: late-stage candidates get their own onboarding sub-board,
// reached from the candidate card via a card → board link.
const onboarding = await engine.createBoard({
  name: 'Onboarding — Sam Carter',
  createdBy: 'recruiter-dana',
  lanes: ['Paperwork', 'Equipment', 'First week'],
});
await engine.linkCardToBoard(candidate.id, onboarding.id);

const final = engine.getCard(candidate.id);
console.log(`\n${final.title} — stage: ${engine.getLane(final.laneId).name}, owner: ${final.owner}`);
console.log(`Checklist: ${final.checklist.filter((i) => i.done).length}/${final.checklist.length} done`);
console.log(`Drill-down board: ${engine.getBoard(final.linkedBoardId!).name}`);
