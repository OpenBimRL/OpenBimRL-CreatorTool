<template>
    <div
        class="flex h-11 min-h-11 items-center gap-2 border-b border-slate-200/80 bg-white/90 px-3 backdrop-blur-sm dark:border-slate-800 dark:bg-default-dark/90"
    >
        <div class="flex items-center gap-1 rounded-lg border border-slate-200/80 p-0.5 dark:border-slate-700">
            <button
                type="button"
                class="btn-icon !h-7 !w-7 !border-0 bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700"
                :disabled="checkLoading || !selectedModelId"
                title="Run check"
                @click="$emit('run-check')"
            >
                <PlayIcon class="h-4 w-4" />
            </button>
            <button
                type="button"
                class="btn-icon !h-7 !w-7 !border-0 bg-red-500 text-white hover:bg-red-600 disabled:bg-slate-300 dark:disabled:bg-slate-700"
                :disabled="!checkLoading"
                title="Stop check"
                @click="$emit('stop-check')"
            >
                <StopIcon class="h-4 w-4" />
            </button>
            <button
                type="button"
                class="btn-icon !h-7 !w-7 !border-0 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700"
                :disabled="checkLoading"
                title="Compile graph wiring"
                @click="$emit('compile-graph')"
            >
                <CheckCircleIcon class="h-4 w-4" />
            </button>
        </div>

        <div class="h-6 w-px bg-slate-200 dark:bg-slate-700" />

        <button
            type="button"
            :class="consoleOpen ? 'btn-icon-active !h-7 !w-7' : 'btn-icon !h-7 !w-7'"
            :title="consoleOpen ? 'Hide console' : 'Show console'"
            @click="$emit('toggle-console')"
        >
            <CommandLineIcon class="h-4 w-4" />
        </button>
        <button
            type="button"
            :class="detailsPanelOpen ? 'btn-icon-active !h-7 !w-7' : 'btn-icon !h-7 !w-7'"
            :title="detailsPanelOpen ? 'Hide node details' : 'Show node details'"
            @click="$emit('toggle-details')"
        >
            <InformationCircleIcon class="h-4 w-4" />
        </button>

        <select
            :value="selectedModelId"
            class="h-8 min-w-[14rem] rounded-lg border border-slate-300/80 bg-white px-2.5 text-sm text-slate-700 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            @change="onSelectModel"
        >
            <option :value="null">Select model for check…</option>
            <option v-for="[id, name] in modelOptions" :key="id" :value="id">{{ name }}</option>
        </select>

        <span class="ml-auto truncate text-xs font-medium text-slate-500 dark:text-slate-400">{{
            checkStatusText
        }}</span>
    </div>
</template>

<script setup lang="ts">
import {
    CheckCircleIcon,
    CommandLineIcon,
    InformationCircleIcon,
    PlayIcon,
    StopIcon,
} from '@heroicons/vue/24/outline';

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
