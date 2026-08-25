<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal">
      <button class="modal-close" @click="emit('close')"><Icon name="x" /></button>

      <input
        class="modal-title-input"
        :value="card.title"
        @change="setTitle(($event.target as HTMLInputElement).value)"
      />
      <p class="modal-lane-note">in <strong>{{ laneName }}</strong> · created by {{ card.createdBy }}</p>

      <LabelsEditor :labels="card.labels" @add="addLabel" @remove="removeLabel" />

      <CardMeta
        :card="card"
        :members="board.members"
        :other-boards="otherBoards"
        @set-due="setDueDate"
        @set-owner="setOwner"
        @set-link="setLink"
        @open-board="emit('open-board', $event)"
      />

      <div class="modal-section">
        <div class="modal-section-title"><Icon name="pencil" :size="13" /> Description</div>
        <textarea
          :value="card.description ?? ''"
          placeholder="Add a more detailed description…"
          @change="setDescription(($event.target as HTMLTextAreaElement).value)"
        />
      </div>

      <ChecklistEditor
        :items="card.checklist"
        @add="(text: string) => engine.addChecklistItem(card.id, text)"
        @toggle="(itemId: string) => engine.toggleChecklistItem(card.id, itemId)"
        @remove="(itemId: string) => engine.removeChecklistItem(card.id, itemId)"
      />

      <button class="modal-danger" @click="deleteCard"><Icon name="trash" :size="14" /> Delete card</button>
    </div>
  </div>
</template>

<script setup lang="ts">
// Card detail modal — a thin container: reads the card, delegates each
// concern to its section component, and translates section events into
// engine calls.
import { computed } from 'vue';
import type { Label } from '@boardkit/index.js';
import { engine, version } from '../../store.js';
import Icon from '../shared/Icon.vue';
import LabelsEditor from './LabelsEditor.vue';
import CardMeta from './CardMeta.vue';
import ChecklistEditor from './ChecklistEditor.vue';

const props = defineProps<{ cardId: string }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'open-board', boardId: string): void }>();

const card = computed(() => {
  void version.value;
  return engine.getCard(props.cardId);
});
const board = computed(() => {
  void version.value;
  return engine.getBoard(card.value.boardId);
});
const laneName = computed(() => engine.getLane(card.value.laneId).name);
const otherBoards = computed(() => engine.listBoards().filter((b) => b.id !== card.value.boardId));

const setTitle = (title: string) => title.trim() && engine.updateCard(props.cardId, { title });
const setDescription = (text: string) => engine.updateCard(props.cardId, { description: text.trim() || null });
const setDueDate = (value: string) =>
  engine.updateCard(props.cardId, { dueDate: value ? `${value}T00:00:00.000Z` : null });
const setOwner = (value: string) => engine.updateCard(props.cardId, { owner: value || null });

async function setLink(value: string) {
  if (value) await engine.linkCardToBoard(props.cardId, value);
  else if (card.value.linkedBoardId) await engine.unlinkCard(props.cardId);
}

const addLabel = (label: Label) =>
  engine.updateCard(props.cardId, { labels: [...card.value.labels, label] });
const removeLabel = (index: number) =>
  engine.updateCard(props.cardId, { labels: card.value.labels.filter((_, i) => i !== index) });

async function deleteCard() {
  await engine.deleteCard(props.cardId);
  emit('close');
}
</script>
