<template>
  <div v-if="hasBadges" class="card-badges">
    <span v-if="card.dueDate" class="card-badge" :class="{ 'is-overdue': overdue }">
      <Icon name="calendar" :size="13" /> {{ card.dueDate.slice(0, 10) }}
    </span>
    <span v-if="card.checklist.length" class="card-badge" :class="{ 'is-complete': done === card.checklist.length }">
      <Icon name="checklist" :size="13" /> {{ done }}/{{ card.checklist.length }}
    </span>
    <span v-if="card.linkedBoardId" class="card-badge is-link" title="Links to another board">
      <Icon name="link" :size="13" />
    </span>
    <span class="spacer" />
    <span v-if="card.owner" class="avatar" :title="`Owner: ${card.owner}`">{{ initials(card.owner) }}</span>
  </div>
</template>

<script setup lang="ts">
// Card badge strip: due date (red when overdue), checklist progress (green
// when complete), board-link marker, owner avatar.
import { computed } from 'vue';
import type { Card } from '@boardkit/index.js';
import { initials } from '../../store.js';
import Icon from '../shared/Icon.vue';

const props = defineProps<{ card: Card }>();

const done = computed(() => props.card.checklist.filter((i) => i.done).length);
const overdue = computed(() => Boolean(props.card.dueDate && props.card.dueDate < new Date().toISOString()));
const hasBadges = computed(() =>
  Boolean(props.card.dueDate || props.card.checklist.length || props.card.linkedBoardId || props.card.owner));
</script>
