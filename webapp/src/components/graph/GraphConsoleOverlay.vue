<template>
    <div
        v-if="open && !minimized"
        class="absolute bottom-3 left-3 right-3 z-20 flex h-44 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white/95 shadow-panel backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95"
    >
        <div
            class="flex h-9 min-h-9 items-center justify-between border-b border-slate-200/80 px-3 dark:border-slate-700"
        >
            <span
                class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                >Check Console</span
            >
            <div class="flex items-center gap-1">
                <button
                    type="button"
                    class="btn-ghost !px-2 !py-1 !text-xs"
                    @click="$emit('minimize')"
                >
                    Minimize
                </button>
                <button
                    type="button"
                    class="btn-ghost !px-2 !py-1 !text-xs"
                    @click="$emit('clear')"
                >
                    Clear
                </button>
            </div>
        </div>
        <pre
            class="flex-1 overflow-auto whitespace-pre-wrap p-3 font-mono text-xs leading-relaxed text-slate-700 dark:text-slate-300"
            >{{ text }}</pre
        >
    </div>
    <button
        v-else-if="open && minimized"
        type="button"
        class="btn-secondary absolute bottom-3 right-3 z-20 !text-xs shadow-panel"
        title="Restore console"
        @click="$emit('restore')"
    >
        Check Console
    </button>
</template>

<script setup lang="ts">
defineProps<{
    open: boolean;
    minimized: boolean;
    text: string;
}>();

defineEmits<{
    (event: 'clear'): void;
    (event: 'minimize'): void;
    (event: 'restore'): void;
}>();
</script>
