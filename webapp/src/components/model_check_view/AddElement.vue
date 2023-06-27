<template>
    <div class="grid" :="{ style }">
        <div v-for="kind in kinds" class="border-2 border-dashed border-default-contrast m-2">
            <button
                class="text-center py-4 w-full text-lg text-default-dark"
                @click="$emit(`add${event(kind)}`, $event)"
            >
                <strong>
                    <PlusCircleIcon class="w-6 inline align-text-bottom" />
                    <span>&nbsp;</span>
                    <span>{{ label(kind) }}</span>
                </strong>
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { PlusCircleIcon } from '@heroicons/vue/24/outline';
import { capitalize, computed, StyleValue } from 'vue';

type Kind = string | { label: string; event: string };

const props = defineProps<{ kinds: Array<Kind> }>();

const style = computed(
    () => `grid-template-columns: repeat(${props.kinds.length}, 1fr)` as StyleValue,
);

const event = (kind: Kind) => capitalize(typeof kind === 'string' ? kind : kind.event);
const label = (kind: Kind) => capitalize(typeof kind === 'string' ? kind : kind.label);
</script>

<style scoped></style>
