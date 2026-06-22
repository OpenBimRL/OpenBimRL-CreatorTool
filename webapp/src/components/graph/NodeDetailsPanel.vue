<template>
    <aside
        v-if="open"
        class="absolute top-0 right-0 h-full bg-default-medium dark:bg-default-dark z-30 border-l"
        :style="`width: ${width}px`"
    >
        <button
            class="absolute border-2 h-full cursor-col-resize"
            @mousedown="$emit('resize-start')"
        />
        <div class="h-full p-3 flex flex-col gap-3">
            <div class="flex items-center justify-between">
                <h3 class="text-sm font-semibold">Node Details</h3>
                <button
                    class="text-xs px-2 py-1 rounded border hover:bg-default-light dark:hover:bg-default-darkest"
                    @click="$emit('close')"
                >
                    Close
                </button>
            </div>
            <template v-if="selectedNode && selectedNode.data">
                <div class="text-xs space-y-1">
                    <div><span class="font-semibold">Name:</span> {{ selectedNode.data.name }}</div>
                    <div><span class="font-semibold">Type:</span> {{ selectedNode.type }}</div>
                    <div>
                        <span class="font-semibold">Label:</span> {{ selectedNode.data.label }}
                    </div>
                </div>
                <div
                    class="flex-1 min-h-0 border rounded bg-default-light dark:bg-default-darkest overflow-hidden"
                >
                    <div class="px-2 py-1 border-b text-xs font-semibold">Result</div>
                    <div class="h-full overflow-auto p-2 node-details-json">
                        <JsonViewer
                            v-if="resultValue !== null && resultValue !== undefined"
                            :value="resultValue"
                            :expand-depth="2"
                            boxed
                            copyable
                            sort
                            :show-array-index="true"
                            class="text-xs"
                        />
                        <div v-else class="text-xs opacity-80">
                            No result available for this node yet.
                        </div>
                    </div>
                </div>
            </template>
            <template v-else>
                <div class="text-xs opacity-80">
                    Select a node to inspect its details and result.
                </div>
            </template>
        </div>
    </aside>
</template>

<script setup lang="ts">
import JsonViewer from 'vue-json-viewer';
import type { CustomNode } from './Types';

defineProps<{
    open: boolean;
    width: number;
    selectedNode: CustomNode | null;
    resultValue: unknown;
}>();

defineEmits<{
    (event: 'close'): void;
    (event: 'resize-start'): void;
}>();
</script>

<style>
.dark .node-details-json .jv-container {
    background: transparent !important;
    color: #e5e7eb;
}

.dark .node-details-json .jv-key {
    color: #f3f4f6;
}

.dark .node-details-json .jv-item.jv-object,
.dark .node-details-json .jv-item.jv-array,
.dark .node-details-json .jv-node:after,
.dark .node-details-json .jv-item.jv-function {
    color: #d1d5db;
}

.dark .node-details-json .jv-item.jv-string {
    color: #86efac;
}

.dark .node-details-json .jv-item.jv-number,
.dark .node-details-json .jv-item.jv-number-float,
.dark .node-details-json .jv-item.jv-number-integer,
.dark .node-details-json .jv-item.jv-boolean {
    color: #f9a8d4;
}

.dark .node-details-json .jv-item.jv-null,
.dark .node-details-json .jv-item.jv-undefined {
    color: #fdba74;
}

.dark .node-details-json .jv-ellipsis {
    background-color: #374151;
    color: #d1d5db;
}

.node-details-json .jv-container.boxed:hover {
    box-shadow: none !important;
    border-color: inherit !important;
}
</style>
