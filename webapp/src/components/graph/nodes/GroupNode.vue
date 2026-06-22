<template>
    <div
        class="group-node h-full w-full rounded-xl border-2 border-dashed"
        :style="containerStyle"
    >
        <div
            class="group-drag-handle rounded-t-[0.65rem] px-3 py-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100"
            :style="headerStyle"
        >
            {{ data.label }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { NodeProps } from '@vue-flow/core';
import { computed } from 'vue';
import type { GroupNodeData } from '../Types';

const props = defineProps<NodeProps<GroupNodeData>>();

const color = computed(() => props.data.color || '#fcba03');

const containerStyle = computed(() => ({
    backgroundColor: `${color.value}18`,
    borderColor: color.value,
}));

const headerStyle = computed(() => ({
    backgroundColor: `${color.value}55`,
}));
</script>

<style scoped>
.group-node {
    pointer-events: none;
}

.group-drag-handle {
    pointer-events: all;
    cursor: grab;
}
</style>
