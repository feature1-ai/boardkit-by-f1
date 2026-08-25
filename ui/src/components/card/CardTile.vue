<template>
  <article
    class="card"
    :class="{ 'is-dragging': dragging }"
    draggable="true"
    @dragstart="onDragStart"
    @dragend="dragging = false"
    @drop.prevent.stop="onDropBefore"
    @dragover.prevent
  >
    <div v-if="card.labels.length" class="card-labels">
      <span
        v-for="(label, i) in card.labels"
        :key="i"
        class="card-label"
        :style="{ background: label.color || '#b3bac5' }"
        :title="label.text"
      />
    </div>

    <div class="card-title">{{ card.title }}</div>

    <CardBadges :card="card" />
  </article>
</template>

<script setup lang="ts">
// Card tile: label bars, title, badges. Draggable; dropping another card on
// this one inserts it before this card.
import { ref } from 'vue';
import type { Card } from '@boardkit/index.js';
import CardBadges from './CardBadges.vue';

const props = defineProps<{ card: Card }>();
const emit = defineEmits<{ (e: 'drop-before', draggedCardId: string): void }>();

const dragging = ref(false);

function onDragStart(event: DragEvent) {
  dragging.value = true;
  event.dataTransfer?.setData('text/boardkit-card', props.card.id);
  event.dataTransfer!.effectAllowed = 'move';
}

function onDropBefore(event: DragEvent) {
  const draggedId = event.dataTransfer?.getData('text/boardkit-card');
  if (draggedId && draggedId !== props.card.id) emit('drop-before', draggedId);
}
</script>
