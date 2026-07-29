<template>
    <aside
        v-if="open"
        class="absolute top-0 right-0 z-30 h-full border-l border-slate-200/80 bg-white/95 shadow-panel backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95"
        :style="`width: ${width}px`"
    >
        <button
            class="absolute border-2 h-full cursor-col-resize"
            @mousedown="$emit('resize-start')"
        />
        <div class="h-full p-3 flex flex-col gap-3 text-slate-900 dark:text-slate-100">
            <div class="flex items-center justify-between">
                <h3 class="text-sm font-semibold text-default-dark dark:text-slate-100">
                    Node Details
                </h3>
                <button
                    type="button"
                    class="btn-ghost !px-2 !py-1 !text-xs"
                    @click="$emit('close')"
                >
                    Close
                </button>
            </div>
            <template v-if="selectedNode && selectedNode.data">
                <div class="text-xs space-y-1 text-slate-700 dark:text-slate-200">
                    <div><span class="font-semibold">Name:</span> {{ selectedNode.data.name }}</div>
                    <div><span class="font-semibold">Type:</span> {{ selectedNode.type }}</div>
                    <div>
                        <span class="font-semibold">Label:</span> {{ selectedNode.data.label }}
                    </div>
                </div>
                <div
                    class="flex-1 min-h-0 border rounded border-slate-200/80 bg-default-light dark:border-slate-700 dark:bg-slate-950 overflow-hidden"
                >
                    <div
                        class="border-b border-slate-200/80 px-2 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                    >
                        Result
                    </div>
                    <div
                        class="h-full overflow-auto p-2 node-details-json text-slate-800 dark:text-slate-100"
                    >
                        <pre
                            v-if="
                                resultValue !== null && resultValue !== undefined && resultTooLarge
                            "
                            class="whitespace-pre-wrap text-xs text-slate-700 dark:text-slate-200"
                            >{{ formattedResult }}</pre
                        >
                        <JsonViewer
                            v-else-if="resultValue !== null && resultValue !== undefined"
                            :value="displayValue"
                            :expand-depth="2"
                            boxed
                            copyable
                            sort
                            :show-array-index="true"
                            class="text-xs"
                        />
                        <div v-else class="text-xs text-slate-500 dark:text-slate-400">
                            No result available for this node yet.
                        </div>
                    </div>
                </div>
            </template>
            <template v-else>
                <div class="text-xs text-slate-500 dark:text-slate-400">
                    Select a node to inspect its details and result.
                </div>
            </template>
        </div>
    </aside>
</template>

<script setup lang="ts">
import {
    formatResultForDisplay,
    isResultTooLargeForDisplay,
    resultValueForInspection,
} from '@/modules/checkResultLimits';
import JsonViewer from 'vue-json-viewer';
import { computed } from 'vue';
import type { CustomNode } from './Types';

const props = defineProps<{
    open: boolean;
    width: number;
    selectedNode: CustomNode | null;
    resultValue: unknown;
}>();

defineEmits<{
    (event: 'close'): void;
    (event: 'resize-start'): void;
}>();

const displayValue = computed(() => resultValueForInspection(props.resultValue));
const resultTooLarge = computed(() => isResultTooLargeForDisplay(props.resultValue));
const formattedResult = computed(() => formatResultForDisplay(props.resultValue));
</script>

<style>
.dark .node-details-json .jv-container.jv-light {
    background: transparent !important;
    color: #e5e7eb !important;
}

.dark .node-details-json .jv-container.jv-light .jv-key {
    color: #f3f4f6 !important;
}

.dark .node-details-json .jv-container.jv-light .jv-item.jv-object,
.dark .node-details-json .jv-container.jv-light .jv-item.jv-array,
.dark .node-details-json .jv-container.jv-light .jv-node:after,
.dark .node-details-json .jv-container.jv-light .jv-item.jv-function {
    color: #d1d5db !important;
}

.dark .node-details-json .jv-container.jv-light .jv-item.jv-string {
    color: #86efac !important;
}

.dark .node-details-json .jv-container.jv-light .jv-item.jv-number,
.dark .node-details-json .jv-container.jv-light .jv-item.jv-number-float,
.dark .node-details-json .jv-container.jv-light .jv-item.jv-number-integer,
.dark .node-details-json .jv-container.jv-light .jv-item.jv-boolean {
    color: #f9a8d4 !important;
}

.dark .node-details-json .jv-container.jv-light .jv-item.jv-null,
.dark .node-details-json .jv-container.jv-light .jv-item.jv-undefined {
    color: #fdba74 !important;
}

.dark .node-details-json .jv-container.jv-light .jv-ellipsis {
    background-color: #374151 !important;
    color: #d1d5db !important;
}

.dark .node-details-json .jv-container.jv-light .jv-button {
    color: #7dd3fc !important;
}

.dark .node-details-json .jv-container.jv-light.boxed {
    border-color: rgb(51 65 85 / 0.8) !important;
}

.dark .node-details-json .jv-container.jv-light .jv-code .jv-toggle:hover:before {
    background: #374151 !important;
}

.node-details-json .jv-container.boxed:hover {
    box-shadow: none !important;
    border-color: inherit !important;
}
</style>
