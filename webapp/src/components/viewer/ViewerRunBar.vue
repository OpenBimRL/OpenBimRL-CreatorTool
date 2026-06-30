<template>
    <div
        class="flex h-11 min-h-11 items-center gap-2 border-b border-slate-200/80 bg-white/90 px-3 backdrop-blur-sm dark:border-slate-800 dark:bg-default-dark/90"
    >
        <div
            class="flex items-center gap-1 rounded-lg border border-slate-200/80 p-0.5 dark:border-slate-700"
        >
            <button
                type="button"
                class="btn-icon !h-7 !w-7 !border-0 bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700"
                :disabled="checkLoading || !canRunCheck"
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
            :class="visualsVisible ? 'btn-icon-active !h-7 !w-7' : 'btn-icon !h-7 !w-7'"
            :disabled="!hasVisuals"
            :title="visualsVisible ? 'Hide check visuals' : 'Show check visuals'"
            @click="$emit('toggle-visuals')"
        >
            <EyeIcon v-if="visualsVisible" class="h-4 w-4" />
            <EyeSlashIcon v-else class="h-4 w-4" />
        </button>

        <span class="ml-auto truncate text-xs font-medium text-slate-500 dark:text-slate-400">{{
            checkStatusText
        }}</span>
    </div>
</template>

<script setup lang="ts">
import { CommandLineIcon, EyeIcon, EyeSlashIcon, PlayIcon, StopIcon } from '@heroicons/vue/24/outline';

defineProps<{
    checkStatusText: string;
    checkLoading: boolean;
    canRunCheck: boolean;
    consoleOpen: boolean;
    hasVisuals: boolean;
    visualsVisible: boolean;
}>();

defineEmits<{
    (event: 'run-check'): void;
    (event: 'stop-check'): void;
    (event: 'toggle-console'): void;
    (event: 'toggle-visuals'): void;
}>();
</script>
