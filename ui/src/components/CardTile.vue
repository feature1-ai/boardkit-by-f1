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

    <div v-if="hasBadges" class="card-badges">
      <span v-if="card.dueDate" class="card-badge" :class="{ 'is-overdue': overdue }">
        <Icon name="calendar" :size="13" /> {{ card.dueDate.slice(0, 10) }}
      </span>
      <span v-if="card.checklist.length" class="card-badge" :class="{ 'is-complete': checklistDone === card.checklist.length }">
        <Icon name="checklist" :size="13" /> {{ checklistDone }}/{{ card.checklist.length }}
      </span>
      <span v-if="card.linkedBoardId" class="card-badge is-link" title="Links to another board">
        <Icon name="link" :size="13" />
      </span>
      <span class="spacer" />
      <span v-if="card.owner" class="avatar" :title="`Owner: ${card.owner}`">{{ initials(card.owner) }}</span>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Card } from '@boardkit/index.js';
import { initials } from '../store.js';
import Icon from './Icon.vue';

const props = defineProps<{ card: Card }>();
const emit = defineEmits<{ (e: 'drop-before', draggedCardId: string): void }>();

const dragging = ref(false);

const checklistDone = computed(() => props.card.checklist.filter((i) => i.done).length);
const overdue = computed(() => Boolean(props.card.dueDate && props.card.dueDate < new Date().toISOString()));
const hasBadges = computed(() =>
  Boolean(props.card.dueDate || props.card.checklist.length || props.card.linkedBoardId || props.card.owner));

function onDragStart(event: DragEvent) {
  dragging.value = true;
  event.dataTransfer?.setData('text/boardkit-card', props.card.id);
  event.dataTransfer!.effectAllowed = 'move';
}

/** Dropping another card onto this one inserts it before this card. */
function onDropBefore(event: DragEvent) {
  const draggedId = event.dataTransfer?.getData('text/boardkit-card');
  if (draggedId && draggedId !== props.card.id) emit('drop-before', draggedId);
}
</script>
