<template>
  <div class="board-header">
    <h1 class="board-title">{{ board.name }}</h1>
    <div class="board-members">
      <span v-for="member in board.members" :key="member.id" class="avatar" :title="member.id">
        {{ initials(member.id) }}
      </span>
      <form class="member-add" @submit.prevent="addMember">
        <input v-model.trim="newMember" placeholder="+ member" />
      </form>
    </div>
  </div>

  <div class="board-canvas">
    <LaneColumn
      v-for="laneId in board.laneIds"
      :key="laneId"
      :lane-id="laneId"
      :board-id="board.id"
      @open-card="openCard"
    />

    <form v-if="addingLane" class="add-lane-composer composer" @submit.prevent="addLane">
      <input ref="laneInput" v-model.trim="newLaneName" placeholder="Lane name" @keydown.esc="addingLane = false" />
      <div class="composer-actions">
        <button type="submit" class="btn-primary">Add lane</button>
        <button type="button" class="btn-subtle" @click="addingLane = false"><Icon name="x" /></button>
      </div>
    </form>
    <button v-else class="add-lane" @click="openLaneComposer"><Icon name="plus" :size="14" /> Add lane</button>
  </div>

  <CardModal
    v-if="openCardId"
    :card-id="openCardId"
    @close="openCardId = null"
    @open-board="(id: string) => { openCardId = null; emit('open-board', id); }"
  />
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { engine, initials, version } from '../store.js';
import Icon from './Icon.vue';
import LaneColumn from './LaneColumn.vue';
import CardModal from './CardModal.vue';

const props = defineProps<{ boardId: string }>();
const emit = defineEmits<{ (e: 'open-board', boardId: string): void }>();

const newMember = ref('');
const addingLane = ref(false);
const newLaneName = ref('');
const laneInput = ref<HTMLInputElement | null>(null);
const openCardId = ref<string | null>(null);

const board = computed(() => {
  void version.value;
  return engine.getBoard(props.boardId);
});

async function addMember() {
  if (!newMember.value) return;
  try {
    await engine.addMember(props.boardId, newMember.value);
    newMember.value = '';
  } catch (error) {
    console.warn(String(error));
  }
}

async function openLaneComposer() {
  addingLane.value = true;
  await nextTick();
  laneInput.value?.focus();
}

async function addLane() {
  if (!newLaneName.value) return;
  await engine.addLane(props.boardId, { name: newLaneName.value });
  newLaneName.value = '';
  addingLane.value = false;
}

function openCard(cardId: string) {
  openCardId.value = cardId;
}
</script>
