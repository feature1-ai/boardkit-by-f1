<template>
  <BoardHeader :board="board" @add-member="addMember" />

  <div class="board-canvas">
    <LaneColumn
      v-for="laneId in board.laneIds"
      :key="laneId"
      :lane-id="laneId"
      :board-id="board.id"
      @open-card="openCardId = $event"
    />

    <div v-if="addingLane" class="add-lane-composer">
      <InlineComposer placeholder="Lane name" button-label="Add lane" @submit="addLane" @cancel="addingLane = false" />
    </div>
    <button v-else class="add-lane" @click="addingLane = true"><Icon name="plus" :size="14" /> Add lane</button>
  </div>

  <CardModal
    v-if="openCardId"
    :card-id="openCardId"
    @close="openCardId = null"
    @open-board="(id: string) => { openCardId = null; emit('open-board', id); }"
  />
</template>

<script setup lang="ts">
// Board container: header, lane columns, add-lane composer, card modal host.
import { computed, ref } from 'vue';
import { engine, version } from '../../store.js';
import Icon from '../shared/Icon.vue';
import InlineComposer from '../shared/InlineComposer.vue';
import BoardHeader from './BoardHeader.vue';
import LaneColumn from '../lane/LaneColumn.vue';
import CardModal from '../modal/CardModal.vue';

const props = defineProps<{ boardId: string }>();
const emit = defineEmits<{ (e: 'open-board', boardId: string): void }>();

const addingLane = ref(false);
const openCardId = ref<string | null>(null);

const board = computed(() => {
  void version.value;
  return engine.getBoard(props.boardId);
});

async function addMember(userId: string) {
  try {
    await engine.addMember(props.boardId, userId);
  } catch (error) {
    console.warn(String(error));
  }
}

async function addLane(name: string) {
  await engine.addLane(props.boardId, { name });
  addingLane.value = false;
}
</script>
