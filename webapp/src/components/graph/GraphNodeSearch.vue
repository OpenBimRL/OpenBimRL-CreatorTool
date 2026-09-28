<template>
    <Teleport to="body">
        <div
            v-if="open"
            data-graph-node-search
            class="fixed z-[70] flex w-80 max-h-[min(24rem,70vh)] flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-panel dark:border-slate-700 dark:bg-slate-900"
            :style="{ left: `${x}px`, top: `${y}px` }"
            @pointerdown.stop
            @mousedown.stop
            @click.stop
            @keydown="onKeydown"
        >
            <div class="border-b border-slate-200/80 px-3 py-2 dark:border-slate-700">
                <input
                    ref="searchInput"
                    v-model="query"
                    type="text"
                    class="w-full rounded-lg border border-slate-300/80 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                    :placeholder="placeholder"
                    autocomplete="off"
                    spellcheck="false"
                />
            </div>
            <ul class="min-h-0 flex-1 overflow-y-auto py-1" role="listbox">
                <li v-if="!filtered.length" class="px-3 py-2 text-sm text-slate-400">
                    No matching nodes
                </li>
                <li v-for="(entry, index) in filtered" :key="`${entry.id}-${index}`">
                    <button
                        type="button"
                        role="option"
                        class="flex w-full flex-col items-start gap-0.5 px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                        :class="
                            index === highlighted
                                ? 'bg-accent/15 text-default-dark dark:bg-accent/20 dark:text-accent'
                                : 'text-slate-700 dark:text-slate-200'
                        "
                        @mouseenter="highlighted = index"
                        @pointerdown="onOptionPointerDown($event, entry)"
                    >
                        <span class="w-full truncate text-sm font-medium">{{
                            entry.node.data.name
                        }}</span>
                        <span
                            class="w-full truncate text-[11px] text-slate-400 dark:text-slate-500"
                            >{{ entry.groupName }}</span
                        >
                    </button>
                </li>
            </ul>
        </div>
    </Teleport>
</template>

<script setup lang="ts">
import type { LibraryNodeEntry } from '@/modules/nodeLibrary';
import { computed, nextTick, ref, watch } from 'vue';

const props = defineProps<{
    open: boolean;
    x: number;
    y: number;
    entries: LibraryNodeEntry[];
    placeholder?: string;
}>();

const emit = defineEmits<{
    (event: 'select', entry: LibraryNodeEntry): void;
    (event: 'close'): void;
}>();

const searchInput = ref<HTMLInputElement | null>(null);
const query = ref('');
const highlighted = ref(0);

let focusTimer: ReturnType<typeof setTimeout> | undefined;
let onSpaceUp: ((event: KeyboardEvent) => void) | undefined;

const clearPendingFocus = () => {
    if (onSpaceUp) {
        window.removeEventListener('keyup', onSpaceUp, true);
        onSpaceUp = undefined;
    }
    if (focusTimer != null) {
        window.clearTimeout(focusTimer);
        focusTimer = undefined;
    }
};

const filtered = computed(() => {
    const needle = query.value.trim().toLowerCase();
    if (!needle) return props.entries;
    return props.entries.filter(entry => {
        const name = entry.node.data.name?.toLowerCase() ?? '';
        const description = entry.node.data.description?.toLowerCase() ?? '';
        const group = entry.groupName.toLowerCase();
        return name.includes(needle) || description.includes(needle) || group.includes(needle);
    });
});

watch(
    () => props.open,
    open => {
        clearPendingFocus();
        if (!open) return;
        query.value = '';
        highlighted.value = 0;

        let focused = false;
        const focusInput = () => {
            if (focused) return;
            focused = true;
            clearPendingFocus();
            if (!props.open) return;
            nextTick(() => searchInput.value?.focus());
        };
        onSpaceUp = (event: KeyboardEvent) => {
            if (event.code === 'Space' || event.key === ' ') focusInput();
        };
        window.addEventListener('keyup', onSpaceUp, true);
        focusTimer = window.setTimeout(focusInput, 50);
    },
);

watch(filtered, list => {
    if (highlighted.value >= list.length) highlighted.value = Math.max(0, list.length - 1);
});

const onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
        event.preventDefault();
        emit('close');
        return;
    }

    if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (!filtered.value.length) return;
        highlighted.value = (highlighted.value + 1) % filtered.value.length;
        return;
    }

    if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (!filtered.value.length) return;
        highlighted.value = (highlighted.value - 1 + filtered.value.length) % filtered.value.length;
        return;
    }

    if (event.key === 'Enter') {
        event.preventDefault();
        const entry = filtered.value[highlighted.value];
        if (entry) choose(entry);
    }
};

const onOptionPointerDown = (event: PointerEvent, entry: LibraryNodeEntry) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    choose(entry);
};

const choose = (entry: LibraryNodeEntry) => {
    if (!props.open) return;
    emit('select', entry);
    emit('close');
};
</script>
