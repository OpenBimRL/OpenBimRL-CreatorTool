<template>
    <div
        class="h-8 min-h-8 px-2 flex items-center justify-center gap-2 border-b bg-default-light dark:bg-default-dark dark:bg-opacity-90 shadow-[inset_0_2px_4px_rgba(0,0,0,0.18)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.45)]"
    >
        <button
            class="h-6 w-6 flex items-center justify-center rounded border bg-success text-default-light hover:bg-opacity-90 disabled:bg-neutral-400 disabled:text-opacity-60 disabled:hover:bg-neutral-400"
            :disabled="checkLoading || !selectedModelId"
            @click="$emit('run-check')"
            title="Run check"
        >
            <PlayIcon class="w-4 h-4" />
        </button>
        <button
            class="h-6 w-6 flex items-center justify-center rounded border bg-red-500 text-default-light hover:bg-opacity-90 disabled:bg-neutral-400 disabled:text-opacity-60 disabled:hover:bg-neutral-400"
            :disabled="!checkLoading"
            @click="$emit('stop-check')"
            title="Stop check"
        >
            <StopIcon class="w-4 h-4" />
        </button>
        <button
            class="h-6 w-6 flex items-center justify-center rounded border bg-blue-500 text-default-light hover:bg-opacity-90 disabled:bg-neutral-400 disabled:text-opacity-60 disabled:hover:bg-neutral-400"
            :disabled="checkLoading"
            @click="$emit('compile-graph')"
            title="Compile graph wiring"
        >
            <CheckCircleIcon class="w-4 h-4" />
        </button>
        <button
            class="h-6 px-2 flex items-center justify-center rounded border bg-default-medium dark:bg-default-darkest hover:bg-opacity-90"
            @click="$emit('toggle-console')"
            :title="consoleOpen ? 'Hide console' : 'Show console'"
        >
            <span class="text-xs">{{ consoleOpen ? 'Console: ON' : 'Console: OFF' }}</span>
        </button>
        <button
            class="h-6 px-2 flex items-center justify-center rounded border bg-default-medium dark:bg-default-darkest hover:bg-opacity-90"
            @click="$emit('toggle-details')"
            :title="detailsPanelOpen ? 'Hide node details' : 'Show node details'"
        >
            <span class="text-xs">{{ detailsPanelOpen ? 'Details: ON' : 'Details: OFF' }}</span>
        </button>
        <select
            :value="selectedModelId"
            @change="onSelectModel"
            class="h-6 min-w-[16rem] text-sm px-2 border rounded bg-default-light dark:bg-default-dark"
        >
            <option :value="null">Select model for check...</option>
            <option v-for="[id, name] in modelOptions" :key="id" :value="id">{{ name }}</option>
        </select>
        <span class="text-xs opacity-80">{{ checkStatusText }}</span>
    </div>
</template>

<script setup lang="ts">
import { CheckCircleIcon, PlayIcon, StopIcon } from '@heroicons/vue/24/outline';

defineProps<{
    checkLoading: boolean;
    selectedModelId: string | null;
    modelOptions: Array<[string, string]>;
    checkStatusText: string;
    consoleOpen: boolean;
    detailsPanelOpen: boolean;
}>();

const emit = defineEmits<{
    (event: 'run-check'): void;
    (event: 'stop-check'): void;
    (event: 'compile-graph'): void;
    (event: 'toggle-console'): void;
    (event: 'toggle-details'): void;
    (event: 'update:selectedModelId', value: string | null): void;
}>();

const onSelectModel = (event: Event) => {
    const value = (event.target as HTMLSelectElement).value;
    emit('update:selectedModelId', value === 'null' ? null : value);
};
</script>
