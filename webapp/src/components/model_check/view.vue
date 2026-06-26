<!-- eslint-disable vue/multi-word-component-names -->
<template>
    <div
        ref="layoutRef"
        class="checks-layout grid h-full min-h-0 w-full gap-0 dark:bg-default-darkest"
        :style="layoutStyle"
    >
        <aside
            class="checks-sidebar relative flex min-h-0 shrink-0 flex-col border-r border-slate-200 bg-white shadow-[2px_0_14px_-6px_rgb(15_23_42_/_0.12)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-[2px_0_16px_-6px_rgb(0_0_0_/_0.45)]"
        >
            <button
                type="button"
                aria-label="Resize sidebar"
                class="absolute right-0 top-0 z-10 h-full w-2 cursor-col-resize border-0 bg-transparent opacity-0 transition-opacity hover:bg-accent/20 hover:opacity-100"
                @mousedown="mouseResizeStart"
            />
            <div class="border-b border-slate-200/80 px-4 py-3 dark:border-slate-800">
                <h1 class="text-base font-semibold text-default-dark dark:text-slate-100">
                    Sub Checks &amp; Result Sets
                </h1>
                <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Browse and edit validation rules
                </p>
            </div>
            <div class="min-h-0 flex-1 overflow-y-auto p-3">
                <Tree ref="tree" :data="graph" @select="currentNode = $event" />
            </div>
        </aside>

        <section
            class="checks-detail flex min-h-0 flex-col overflow-hidden bg-surface-muted dark:bg-default-darkest"
        >
            <div v-if="currentNode && tree" class="flex min-h-0 flex-1 flex-col">
                <header
                    class="sticky top-0 z-10 shrink-0 border-b border-slate-200/80 bg-surface-muted/95 px-6 py-4 backdrop-blur-md dark:border-slate-800 dark:bg-default-darkest/95"
                >
                    <nav class="mb-3 flex flex-wrap items-center gap-1 text-sm">
                        <template v-for="(id, index) in currentNode.path" :key="id">
                            <ChevronRightIcon
                                v-if="index > 0"
                                class="h-3.5 w-3.5 shrink-0 text-slate-400"
                            />
                            <button
                                type="button"
                                class="rounded-md px-2 py-0.5 text-slate-500 transition-colors hover:bg-slate-200/80 hover:text-default-dark dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                :class="
                                    index === currentNode.path.length - 1
                                        ? '!bg-accent/15 font-medium !text-default-dark dark:!text-accent'
                                        : ''
                                "
                                @click="tree.selectNode(id)"
                            >
                                {{ tree.nodeStateMap.get(id)!.text }}
                            </button>
                        </template>
                    </nav>

                    <div class="flex items-start gap-4">
                        <span
                            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                            :class="typeIconToneClass"
                        >
                            <component :is="typeIcon" class="h-5 w-5" />
                        </span>
                        <div class="min-w-0 flex-1">
                            <span :class="typeBadgeClass">{{ typeLabel }}</span>
                            <h2
                                class="mt-2 truncate text-xl font-semibold text-default-dark dark:text-slate-100"
                            >
                                {{ currentNode.text }}
                            </h2>
                            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                {{ typeDescription }}
                            </p>
                        </div>
                    </div>
                </header>

                <div class="min-h-0 flex-1 overflow-y-auto px-6 py-6">
                    <div class="mx-auto w-full max-w-3xl">
                        <RuleSetForm
                            v-if="currentNode.type === RuleOrRuleSetType.RULESET"
                            :rule-set="(currentNode.data as RuleSet)"
                        />
                        <RuleForm
                            v-else-if="currentNode.type === RuleOrRuleSetType.RULE"
                            :rule="(currentNode.data as Rule)"
                        />
                        <ResultSetForm
                            v-else-if="currentNode.data?.type === 'resultSet'"
                            :result-set="(currentNode.data as ResultSet)"
                            :graph-nodes="graph.elements"
                            :sub-checks="graph.subChecks"
                        />
                        <SubCheckForm
                            v-else-if="currentNode.data?.hasOwnProperty('name')"
                            :sub-check="(currentNode.data as SubCheck)"
                        />
                        <div v-else class="card !p-5">
                            <p class="text-sm text-red-600 dark:text-red-400">
                                Could not determine the type of this item.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div
                v-else
                class="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center"
            >
                <div
                    class="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200/80 dark:bg-slate-800"
                >
                    <CursorArrowRaysIcon class="h-7 w-7 text-slate-500 dark:text-slate-400" />
                </div>
                <h2 class="text-lg font-medium text-default-dark dark:text-slate-200">
                    Select an item to edit
                </h2>
                <p class="max-w-sm text-sm text-slate-500 dark:text-slate-400">
                    Choose a sub check, rule, rule set, or result set from the tree to view and edit
                    its properties.
                </p>
            </div>
        </section>
    </div>
</template>

<script setup lang="ts">
import { graphInjectionKey } from '@/keys';
import {
    ChevronRightIcon,
    CursorArrowRaysIcon,
    DocumentTextIcon,
    ShieldCheckIcon,
    Squares2X2Icon,
    TableCellsIcon,
} from '@heroicons/vue/24/outline';
import { computed, inject, onUnmounted, ref } from 'vue';
import type { GraphInject, ResultSet, Rule, RuleSet, SubCheck } from '../graph/Types';
import { RuleOrRuleSetType } from '../graph/enums';
import { ResultSetForm, RuleForm, RuleSetForm, SubCheckForm } from './forms';
import Tree from './tree';
import { ITree } from './tree/Tree';
import { TreeNode } from './tree/Types';

const { graph } = inject(graphInjectionKey) as GraphInject;

const layoutRef = ref<HTMLElement | null>(null);
const sidebarWidth = ref(Math.max(288, Math.round(window.innerWidth * 0.22)));

const layoutStyle = computed(() => ({
    gridTemplateColumns: `${sidebarWidth.value}px 1fr`,
}));

const updateListener = (e: MouseEvent) => {
    if (!layoutRef.value) return;
    const bounds = layoutRef.value.getBoundingClientRect();
    const min = 260;
    const max = Math.round(bounds.width * 0.65);
    sidebarWidth.value = Math.min(max, Math.max(min, e.clientX - bounds.left));
};

const mouseResizeStop = () => {
    window.removeEventListener('mousemove', updateListener);
    window.removeEventListener('mouseup', mouseResizeStop);
};

const mouseResizeStart = () => {
    window.addEventListener('mousemove', updateListener);
    window.addEventListener('mouseup', mouseResizeStop);
};

onUnmounted(mouseResizeStop);

const tree = ref<ITree | null>(null);
const currentNode = ref<TreeNode | null>(null);

const typeLabel = computed(() => {
    if (!currentNode.value) return '';
    switch (currentNode.value.type) {
        case 'subCheck':
            return 'Sub Check';
        case RuleOrRuleSetType.RULESET:
            return 'Rule Set';
        case RuleOrRuleSetType.RULE:
            return 'Rule';
        case 'resultSet':
            return 'Result Set';
        default:
            return String(currentNode.value.type);
    }
});

const typeDescription = computed(() => {
    if (!currentNode.value) return '';
    switch (currentNode.value.type) {
        case 'subCheck':
            return 'Top-level validation group containing rules and result sets.';
        case RuleOrRuleSetType.RULESET:
            return 'Groups multiple rules with a logical operator.';
        case RuleOrRuleSetType.RULE:
            return 'Single comparison applied during model checking.';
        case 'resultSet':
            return 'Collects and filters check output for reporting.';
        default:
            return 'Edit the properties below.';
    }
});

const typeIcon = computed(() => {
    if (!currentNode.value) return DocumentTextIcon;
    switch (currentNode.value.type) {
        case 'subCheck':
            return ShieldCheckIcon;
        case RuleOrRuleSetType.RULESET:
            return Squares2X2Icon;
        case RuleOrRuleSetType.RULE:
            return DocumentTextIcon;
        case 'resultSet':
            return TableCellsIcon;
        default:
            return DocumentTextIcon;
    }
});

const typeBadgeClass = computed(() => {
    if (!currentNode.value) return 'badge-neutral';
    switch (currentNode.value.type) {
        case 'subCheck':
            return 'badge bg-sky-500/15 text-sky-800 dark:text-sky-300';
        case RuleOrRuleSetType.RULESET:
            return 'badge bg-violet-500/15 text-violet-800 dark:text-violet-300';
        case RuleOrRuleSetType.RULE:
            return 'badge bg-emerald-500/15 text-emerald-800 dark:text-emerald-300';
        case 'resultSet':
            return 'badge bg-amber-500/15 text-amber-800 dark:text-amber-300';
        default:
            return 'badge-neutral';
    }
});

const typeIconToneClass = computed(() => {
    if (!currentNode.value) {
        return 'bg-slate-200/80 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    }
    switch (currentNode.value.type) {
        case 'subCheck':
            return 'bg-sky-500/15 text-sky-700 dark:text-sky-300';
        case RuleOrRuleSetType.RULESET:
            return 'bg-violet-500/15 text-violet-700 dark:text-violet-300';
        case RuleOrRuleSetType.RULE:
            return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
        case 'resultSet':
            return 'bg-amber-500/15 text-amber-700 dark:text-amber-300';
        default:
            return 'bg-slate-200/80 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    }
});
</script>

<style scoped>
.checks-layout {
    min-width: 0;
}
</style>
