<template>
    <div
        class="group/checks-row relative flex min-h-[2rem] items-center gap-1 rounded-lg py-0.5 pl-1 pr-1 transition-colors"
        :class="
            node.state.selected
                ? 'bg-accent/15 ring-1 ring-accent/30 dark:bg-accent/10'
                : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
        "
    >
        <button
            type="button"
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-200/80 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            :class="{ invisible: !hasChildren }"
            @click.stop="$emit('toggle-expand')"
        >
            <ChevronRightIcon
                class="h-4 w-4 transition-transform duration-200"
                :class="{ 'rotate-90': node.state.expanded }"
            />
        </button>

        <span
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
            :class="iconToneClass"
        >
            <component :is="iconComponent" class="h-3.5 w-3.5" />
        </span>

        <button
            type="button"
            class="min-w-0 flex-1 truncate py-1 text-left"
            :class="[
                node.type === 'CATEGORY'
                    ? 'text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400'
                    : 'text-sm',
                node.state.selected && node.type !== 'CATEGORY'
                    ? 'font-medium text-default-dark dark:text-accent'
                    : node.type !== 'CATEGORY'
                    ? 'text-slate-700 dark:text-slate-300'
                    : '',
            ]"
            @click.stop="node.selectable && $emit('select')"
            @dblclick.stop="$emit('toggle-expand')"
        >
            {{ node.text }}
        </button>

        <div
            class="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/checks-row:opacity-100"
        >
            <button
                v-if="node.addable"
                type="button"
                class="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-emerald-500/15 hover:text-emerald-600 dark:hover:text-emerald-400"
                title="Add child"
                @click.stop="$emit('add')"
            >
                <PlusIcon class="h-3.5 w-3.5" />
            </button>
            <button
                v-if="deletable"
                type="button"
                class="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-red-500/15 hover:text-red-600 dark:hover:text-red-400"
                title="Remove"
                @click.stop="$emit('delete')"
            >
                <TrashIcon class="h-3.5 w-3.5" />
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import {
    ChevronRightIcon,
    DocumentTextIcon,
    FolderIcon,
    PlusIcon,
    ShieldCheckIcon,
    Squares2X2Icon,
    TableCellsIcon,
    TrashIcon,
} from '@heroicons/vue/24/outline';
import { computed } from 'vue';
import type { TreeNode } from './Types';

const props = defineProps<{
    node: TreeNode;
    depth?: number;
    hasChildren?: boolean;
    deletable?: boolean;
}>();

defineEmits<{
    (event: 'select'): void;
    (event: 'toggle-expand'): void;
    (event: 'add'): void;
    (event: 'delete'): void;
}>();

const depth = computed(() => props.depth ?? 0);

const iconComponent = computed(() => {
    switch (props.node.type) {
        case 'CATEGORY':
            return FolderIcon;
        case 'subCheck':
            return ShieldCheckIcon;
        case 'ruleSet':
            return Squares2X2Icon;
        case 'rule':
            return DocumentTextIcon;
        case 'resultSet':
            return TableCellsIcon;
        default:
            return DocumentTextIcon;
    }
});

const iconToneClass = computed(() => {
    switch (props.node.type) {
        case 'CATEGORY':
            return 'bg-slate-200/80 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
        case 'subCheck':
            return 'bg-sky-500/15 text-sky-700 dark:text-sky-300';
        case 'ruleSet':
            return 'bg-violet-500/15 text-violet-700 dark:text-violet-300';
        case 'rule':
            return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
        case 'resultSet':
            return 'bg-amber-500/15 text-amber-700 dark:text-amber-300';
        default:
            return 'bg-slate-200/80 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    }
});
</script>
