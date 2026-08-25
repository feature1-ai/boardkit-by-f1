<template>
  <section
    class="lane"
    :class="{ 'is-drop-target': dropTarget }"
    @dragover.prevent="dropTarget = true"
    @dragleave="dropTarget = false"
    @drop.prevent="onDrop"
  >
    <header class="lane-header">
      <span v-if="lane.color" class="lane-color-dot" :style="{ background: lane.color }" />
      <span class="lane-name">{{ lane.name }}</span>
      <span class="lane-count">{{ cards.length }}</span>
      <button class="lane-delete" :title="deleteTitle" @click="removeLane"><Icon name="trash" :size="14" /></button>
    </header>

    <div class="lane-cards">
      <CardTile
        v-for="(card, index) in cards"
        :key="card.id"
        :card="card"
        @click="emit('open-card', card.id)"
        @drop-before="(cardId: string) => dropAt(cardId, index)"
      />
    </div>

    <form v-if="composing" class="composer" style="margin-top: 8px;" @submit.prevent="addCard">
      <textarea ref="cardInput" v-model.trim="newTitle" rows="2" placeholder="Card title"
        @keydown.enter.exact.prevent="addCard" @keydown.esc="composing = false" />
      <div class="composer-actions">
        <button type="submit" class="btn-primary">Add card</button>
        <button type="button" class="btn-subtle" @click="composing = false"><Icon name="x" /></button>
      </div>
    </form>
    <button v-else class="composer-trigger" @click="openComposer"><Icon name="plus" :size="14" /> Add a card</button>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { CURRENT_USER, engine, version } from '../store.js';
import Icon from './Icon.vue';
import CardTile from './CardTile.vue';

const props = defineProps<{ laneId: string; boardId: string }>();
const emit = defineEmits<{ (e: 'open-card', cardId: string): void }>();

const composing = ref(false);
const newTitle = ref('');
const cardInput = ref<HTMLTextAreaElement | null>(null);
const dropTarget = ref(false);

const lane = computed(() => {
  void version.value;
  return engine.getLane(props.laneId);
});

const cards = computed(() => {
  void version.value;
  return engine.listCards(props.laneId);
});

const deleteTitle = computed(() =>
  cards.value.length ? 'Delete lane (cards move to the first other lane)' : 'Delete lane');

async function openComposer() {
  composing.value = true;
  await nextTick();
  cardInput.value?.focus();
}

async function addCard() {
  if (!newTitle.value) return;
  await engine.createCard(props.laneId, { title: newTitle.value, createdBy: CURRENT_USER });
  newTitle.value = '';
  await nextTick();
  cardInput.value?.focus();
}

async function removeLane() {
  const board = engine.getBoard(props.boardId);
  const fallback = board.laneIds.find((id) => id !== props.laneId);
  try {
    if (cards.value.length && fallback) {
      await engine.deleteLane(props.laneId, { moveCardsToLaneId: fallback });
    } else {
      await engine.deleteLane(props.laneId);
    }
  } catch (error) {
    console.warn(String(error)); // e.g. last lane still holding cards
  }
}

/** Drop on the lane background: append to the end. */
async function onDrop(event: DragEvent) {
  dropTarget.value = false;
  const cardId = event.dataTransfer?.getData('text/boardkit-card');
  if (cardId) await moveHere(cardId, cards.value.length);
}

/** Drop on a card: insert at that card's index. */
async function dropAt(cardId: string, index: number) {
  dropTarget.value = false;
  await moveHere(cardId, index);
}

async function moveHere(cardId: string, toIndex: number) {
  try {
    await engine.moveCard(cardId, { toLaneId: props.laneId, toIndex });
  } catch (error) {
    console.warn(String(error)); // e.g. cross-board drag
  }
}
</script>
