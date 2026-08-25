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

      <!-- Labels -->
      <div class="modal-section">
        <div class="modal-section-title"><Icon name="tag" :size="13" /> Labels</div>
        <div v-if="card.labels.length" class="label-chips">
          <span
            v-for="(label, i) in card.labels"
            :key="i"
            class="label-chip"
            :style="{ background: label.color || '#b3bac5' }"
          >
            {{ label.text }}
            <button @click="removeLabel(i)"><Icon name="x" :size="11" /></button>
          </span>
        </div>
        <div class="label-composer">
          <input v-model.trim="labelText" type="text" placeholder="Label text" style="width: 140px" @keydown.enter.prevent="addLabel" />
          <button
            v-for="color in LABEL_COLORS"
            :key="color"
            class="label-swatch"
            :class="{ 'is-picked': labelColor === color }"
            :style="{ background: color }"
            :title="color"
            @click="labelColor = color"
          />
          <button class="btn-primary" @click="addLabel">Add</button>
        </div>
      </div>

      <!-- Due date + owner + link -->
      <div class="modal-section modal-row">
        <div>
          <div class="modal-section-title"><Icon name="calendar" :size="13" /> Due date</div>
          <input
            type="date"
            :value="card.dueDate?.slice(0, 10) ?? ''"
            @change="setDueDate(($event.target as HTMLInputElement).value)"
          />
        </div>
        <div>
          <div class="modal-section-title"><Icon name="user" :size="13" /> Owner</div>
          <select :value="card.owner ?? ''" @change="setOwner(($event.target as HTMLSelectElement).value)">
            <option value="">— unassigned —</option>
            <option v-for="member in board.members" :key="member.id" :value="member.id">{{ member.id }}</option>
          </select>
        </div>
        <div>
          <div class="modal-section-title"><Icon name="link" :size="13" /> Links to board</div>
          <select :value="card.linkedBoardId ?? ''" @change="setLink(($event.target as HTMLSelectElement).value)">
            <option value="">— none —</option>
            <option v-for="other in otherBoards" :key="other.id" :value="other.id">{{ other.name }}</option>
          </select>
          <button
            v-if="card.linkedBoardId"
            class="btn-subtle"
            style="margin-left: 6px"
            @click="emit('open-board', card.linkedBoardId!)"
          >Open →</button>
        </div>
      </div>

      <!-- Description -->
      <div class="modal-section">
        <div class="modal-section-title"><Icon name="pencil" :size="13" /> Description</div>
        <textarea
          :value="card.description ?? ''"
          placeholder="Add a more detailed description…"
          @change="setDescription(($event.target as HTMLTextAreaElement).value)"
        />
      </div>

      <!-- Checklist -->
      <div class="modal-section">
        <div class="modal-section-title">
          <Icon name="checklist" :size="13" /> Checklist
          <span v-if="card.checklist.length" class="checklist-progress">{{ doneCount }}/{{ card.checklist.length }}</span>
        </div>
        <div v-for="item in card.checklist" :key="item.id" class="checklist-item" :class="{ 'is-done': item.done }">
          <button class="checklist-check" @click="engine.toggleChecklistItem(card.id, item.id)">
            <Icon v-if="item.done" name="check" :size="12" />
          </button>
          <span class="checklist-text">{{ item.text }}</span>
          <button class="checklist-remove" @click="engine.removeChecklistItem(card.id, item.id)"><Icon name="x" :size="12" /></button>
        </div>
        <form style="display: flex; gap: 6px; margin-top: 6px" @submit.prevent="addChecklistItem">
          <input v-model.trim="checklistText" type="text" placeholder="Add an item" style="flex: 1" />
          <button type="submit" class="btn-primary">Add</button>
        </form>
      </div>

      <button class="modal-danger" @click="deleteCard"><Icon name="trash" :size="14" /> Delete card</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { engine, LABEL_COLORS, version } from '../store.js';
import Icon from './Icon.vue';

const props = defineProps<{ cardId: string }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'open-board', boardId: string): void }>();

const labelText = ref('');
const labelColor = ref(LABEL_COLORS[0]!);
const checklistText = ref('');

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
const doneCount = computed(() => card.value.checklist.filter((i) => i.done).length);

const setTitle = (title: string) => title.trim() && engine.updateCard(props.cardId, { title });
const setDescription = (text: string) => engine.updateCard(props.cardId, { description: text.trim() || null });
const setDueDate = (value: string) =>
  engine.updateCard(props.cardId, { dueDate: value ? `${value}T00:00:00.000Z` : null });
const setOwner = (value: string) => engine.updateCard(props.cardId, { owner: value || null });

async function setLink(value: string) {
  if (value) await engine.linkCardToBoard(props.cardId, value);
  else if (card.value.linkedBoardId) await engine.unlinkCard(props.cardId);
}

async function addLabel() {
  if (!labelText.value) return;
  await engine.updateCard(props.cardId, {
    labels: [...card.value.labels, { text: labelText.value, color: labelColor.value }],
  });
  labelText.value = '';
}

const removeLabel = (index: number) =>
  engine.updateCard(props.cardId, { labels: card.value.labels.filter((_, i) => i !== index) });

async function addChecklistItem() {
  if (!checklistText.value) return;
  await engine.addChecklistItem(props.cardId, checklistText.value);
  checklistText.value = '';
}

async function deleteCard() {
  await engine.deleteCard(props.cardId);
  emit('close');
}
</script>
