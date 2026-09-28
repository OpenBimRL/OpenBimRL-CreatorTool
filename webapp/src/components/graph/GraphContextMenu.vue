<template>
    <div
        v-if="open"
        data-graph-context-menu
        class="fixed z-[60] min-w-[11rem] overflow-hidden rounded-xl border border-slate-200/80 bg-white py-1 shadow-panel dark:border-slate-700 dark:bg-slate-900"
        :style="{ left: `${x}px`, top: `${y}px` }"
        @pointerdown.stop
        @mousedown.stop
        @contextmenu.prevent
    >
        <button
            type="button"
            class="flex w-full items-center justify-between gap-6 px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-default disabled:text-slate-400 disabled:hover:bg-transparent dark:text-slate-200 dark:hover:bg-slate-800 dark:disabled:text-slate-500"
            :disabled="!canCopy"
            @click="$emit('copy')"
        >
            <span>Copy</span>
            <span class="text-[11px] text-slate-400 dark:text-slate-500">{{ copyShortcut }}</span>
        </button>
        <button
            type="button"
            class="flex w-full items-center justify-between gap-6 px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-default disabled:text-slate-400 disabled:hover:bg-transparent dark:text-slate-200 dark:hover:bg-slate-800 dark:disabled:text-slate-500"
            :disabled="!canPaste"
            @click="$emit('paste')"
        >
            <span>Paste</span>
            <span class="text-[11px] text-slate-400 dark:text-slate-500">{{ pasteShortcut }}</span>
        </button>
    </div>
</template>

<script setup lang="ts">
import { isMacOs } from '@vue-flow/core';
import { computed } from 'vue';

defineProps<{
    open: boolean;
    x: number;
    y: number;
    canCopy: boolean;
    canPaste: boolean;
}>();

defineEmits<{
    (event: 'copy'): void;
    (event: 'paste'): void;
}>();

const modifier = isMacOs() ? '⌘' : 'Ctrl';
const copyShortcut = computed(() => `${modifier}+C`);
const pasteShortcut = computed(() => `${modifier}+V`);
</script>
