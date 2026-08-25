<template>
  <section
    class="lane"
    :class="{ 'is-drop-target': dropTarget }"
    @dragover.prevent="dropTarget = true"
    @dragleave="dropTarget = false"
    @drop.prevent="onDrop"
  >
    <LaneHeader :lane="lane" :count="cards.length" @delete="removeLane" />

    <div class="lane-cards">
      <CardTile
        v-for="(card, index) in cards"
        :key="card.id"
        :card="card"
        @click="emit('open-card', card.id)"
        @drop-before="(cardId: string) => dropAt(cardId, index)"
      />
    </div>

    <div v-if="composing" style="margin-top: 8px;">
      <InlineComposer placeholder="Card title" button-label="Add card" multiline @submit="addCard" @cancel="composing = false" />
    </div>
    <button v-else class="composer-trigger" @click="composing = true"><Icon name="plus" :size="14" /> Add a card</button>
  </section>
</template>

<script setup lang="ts">
// Lane column: header, ordered card tiles, add-card composer, and the
// drag-and-drop target logic (drop on lane = append; drop on card = insert
// before it — see CardTile).
import { computed, ref } from 'vue';
import { CURRENT_USER, engine, version } from '../../store.js';
import Icon from '../shared/Icon.vue';
import InlineComposer from '../shared/InlineComposer.vue';
import LaneHeader from './LaneHeader.vue';
import CardTile from '../card/CardTile.vue';

const props = defineProps<{ laneId: string; boardId: string }>();
const emit = defineEmits<{ (e: 'open-card', cardId: string): void }>();

const composing = ref(false);
const dropTarget = ref(false);

const lane = computed(() => {
  void version.value;
  return engine.getLane(props.laneId);
});

const cards = computed(() => {
  void version.value;
  return engine.listCards(props.laneId);
});

async function addCard(title: string) {
  await engine.createCard(props.laneId, { title, createdBy: CURRENT_USER });
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

async function onDrop(event: DragEvent) {
  dropTarget.value = false;
  const cardId = event.dataTransfer?.getData('text/boardkit-card');
  if (cardId) await moveHere(cardId, cards.value.length);
}

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
