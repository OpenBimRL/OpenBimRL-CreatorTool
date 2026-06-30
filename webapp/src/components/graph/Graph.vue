<!-- eslint-disable vue/multi-word-component-names -->
<template>
    <div class="h-full flex flex-col">
        <GraphRunBar
            :check-loading="checkLoading"
            :selected-model-id="selectedModelId"
            :model-options="modelOptions"
            :check-status-text="checkStatusText"
            :console-open="consoleOpen"
            :details-panel-open="detailsPanelOpen"
            @run-check="runCheck"
            @stop-check="stopCheck"
            @compile-graph="compileGraph"
            @toggle-console="toggleConsole"
            @toggle-details="detailsPanelOpen = !detailsPanelOpen"
            @update:selected-model-id="selectedModelId = $event"
        />
        <div class="relative flex-1 min-h-0">
            <VueFlow
                @connect="onConnect"
                @node-click="onNodeClick"
                @node-double-click="onNodeDoubleClick"
                @dragover.prevent="onDragOver"
                @drop="onDrop"
                class="h-full bg-slate-50 dark:bg-slate-950"
            >
                <Background
                    :variant="backgroundLines ? BackgroundVariant.Lines : BackgroundVariant.Dots"
                    :pattern-color="
                        darkMode
                            ? TWConf.theme.extend.colors.default.light
                            : TWConf.theme.extend.colors.default.dark
                    "
                    :line-width="0.25"
                    :size="0.8"
                />
                <Controls>
                    <ControlButton @click="backgroundLines = !backgroundLines">
                        <TableCellsIcon class="bg-black" />
                    </ControlButton>
                </Controls>
                <CustomMap />
                <Dialog ref="dialog" @close="onInputDialogClose">
                    <template v-slot:title>Change Input</template>
                    <template v-slot:content>
                        <input
                            class="px-1 py-2 border border-black hover:border-blue-600 focus:border-transparent"
                            type="text"
                            v-model="dialogDraftValue"
                        />
                    </template>
                    <template v-slot:accept_button_text>Change Input</template>
                    <template v-slot:reject_button_text>Revert</template>
                </Dialog>
            </VueFlow>
            <GraphConsoleOverlay
                :open="consoleOpen"
                :minimized="consoleMinimized"
                :text="consoleText"
                @clear="clearConsole()"
                @minimize="consoleMinimized = true"
                @restore="consoleMinimized = false"
            />
            <NodeDetailsPanel
                :open="detailsPanelOpen"
                :width="detailsPanelWidth"
                :selected-node="selectedDetailNode"
                :result-value="selectedNodeResultValue"
                @close="detailsPanelOpen = false"
                @resize-start="mouseResizeStart"
            />
        </div>
    </div>
</template>

<script lang="ts" setup>
import Parser from '@/ParserOpenBIMRL';
import { darkModeKey, graphInjectionKey, parserInjectionKey } from '@/keys';
import {
    appendConsole,
    checkLoading,
    checkStatusText,
    clearConsole,
    consoleMinimized,
    consoleOpen,
    consoleText,
    toggleConsole,
} from '@/modules/checkSession';
import { models, selected, updateModels } from '@/modules/ifcViewer';
import { runGraphCheck, stopGraphCheck } from '@/modules/runGraphCheck';
import { TableCellsIcon } from '@heroicons/vue/24/outline';
import { Background, BackgroundVariant } from '@vue-flow/background';
import { ControlButton, Controls } from '@vue-flow/controls';
import {
    Edge,
    GraphEdge,
    GraphNode,
    NodeMouseEvent,
    VueFlow,
    isEdge,
    isNode,
    useVueFlow,
} from '@vue-flow/core';
import { Ref, computed, inject, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { Dialog, DialogReturnValue } from '../modals';
import CustomMap from './CustomMap.vue';
import GraphConsoleOverlay from './GraphConsoleOverlay.vue';
import GraphRunBar from './GraphRunBar.vue';
import NodeDetailsPanel from './NodeDetailsPanel.vue';
import type { CustomNode, GraphInject } from './Types';
import { multiSelectKeys, nodeTypes } from './config';
import { ConnectEvent, DoubleClickEvent, DragOverEvent, DropEvent } from './graphEvents';

import TWConf from '@/../tailwind.config';

const dialog = ref<typeof Dialog | null>(null);
const selectedNode = ref<number>(0);
const nodeDataIndex = ref<string>('name');
const dialogDraftValue = ref('');
const backgroundLines = ref<boolean>(true);
const selectedModelId = ref<string | null>(selected.value);
const detailsPanelOpen = ref(false);
const detailsPanelWidth = ref(window.innerWidth / 3.5);
const selectedDetailNodeId = ref<string | null>(null);

const resizeListener = (e: MouseEvent) => {
    const proposedWidth = window.innerWidth - e.x;
    detailsPanelWidth.value = Math.max(280, Math.min(window.innerWidth * 0.6, proposedWidth));
    window.addEventListener('mouseup', mouseResizeStop);
};

const mouseResizeStart = () => {
    window.addEventListener('mousemove', resizeListener);
};

const mouseResizeStop = () => {
    window.removeEventListener('mousemove', resizeListener);
    window.removeEventListener('mouseup', mouseResizeStop);
};

// injected from app level (main.ts)
const { graph, updateGraph, registerResetCallback } = inject(graphInjectionKey) as GraphInject;
const darkMode = inject(darkModeKey) as Ref<boolean>;
const parser = inject(parserInjectionKey) as Parser;

const { nodes, edges, addEdges, addNodes, project, vueFlowRef, removeEdges, removeNodes } =
    useVueFlow({
        maxZoom: 2,
        minZoom: 0.1,
        fitViewOnInit: true,
        edges: graph.value.elements.filter(e => isEdge(e)) as Array<Edge>,
        nodes: graph.value.elements.filter(e => isNode(e)) as Array<CustomNode>,
        nodeTypes: nodeTypes,
        multiSelectionKeyCode: multiSelectKeys,
    });

registerResetCallback(() => {
    const newNodes = graph.value.elements.filter(e => isNode(e)) as Array<GraphNode>,
        newEdges = graph.value.elements.filter(e => isEdge(e)) as Array<GraphEdge>;

    removeNodes(nodes.value);

    // this is necessary due to an issue where the elements are not removed properly when they have the same node ID
    nextTick(() => {
        addNodes(newNodes);
        addEdges(newEdges);
    });
});

watch([edges, nodes], ([newEdges, newNodes]) => updateGraph(newNodes, newEdges), { deep: true });

const onConnect = ConnectEvent(addEdges, removeEdges, edges);
const onNodeDoubleClick = DoubleClickEvent(
    nodes,
    selectedNode,
    nodeDataIndex,
    dialogDraftValue,
    dialog,
);
const onInputDialogClose = () => {
    if (dialog.value?.returnValue() !== DialogReturnValue.accept) return;

    const node = nodes.value[selectedNode.value];
    if (!node) return;

    node.data[nodeDataIndex.value] = dialogDraftValue.value;
};
const onDragOver = DragOverEvent();
const onDrop = DropEvent(vueFlowRef, project, addNodes);
const onNodeClick = (event: NodeMouseEvent) => {
    selectedDetailNodeId.value = event.node.id;
};

const modelOptions = computed(() => [...models.entries()]);
const selectedDetailNode = computed(
    () => nodes.value.find(node => node.id === selectedDetailNodeId.value) ?? null,
);
const selectedNodeResultValue = computed(() => selectedDetailNode.value?.data?.nodeResult);

const clearPerNodeResults = () => {
    nodes.value.forEach(node => {
        node.data.nodeResult = undefined;
    });
};

const syncNodeResultsFromGraph = () => {
    nodes.value.forEach(node => {
        const graphNode = graph.value.elements.find(
            element => isNode(element) && element.id === node.id,
        );
        if (!graphNode || !isNode(graphNode)) return;
        node.data.nodeResult = graphNode.data.nodeResult;
    });
};

const runCheck = async () => {
    if (!selectedModelId.value || checkLoading.value) return;
    selected.value = selectedModelId.value;
    clearPerNodeResults();
    await runGraphCheck(graph.value, parser, selectedModelId.value);
    syncNodeResultsFromGraph();
};

const stopCheck = () => {
    stopGraphCheck();
};

const compileGraph = () => {
    checkStatusText.value = 'Compiling graph wiring...';
    appendConsole(`[${new Date().toLocaleTimeString()}] Compile requested\n`);
    window.dispatchEvent(new CustomEvent('openbimrl:compile-graph'));
};

watch(selectedModelId, modelId => {
    selected.value = modelId;
});

watch(selected, modelId => {
    selectedModelId.value = modelId;
});

onMounted(() => {
    updateModels();
    window.addEventListener('openbimrl:compile-graph:done', onCompileFinished);
    window.addEventListener('openbimrl:graph-add-node', onGraphAddNode);
});

onUnmounted(() => {
    window.removeEventListener('openbimrl:compile-graph:done', onCompileFinished);
    window.removeEventListener('openbimrl:graph-add-node', onGraphAddNode);
    mouseResizeStop();
});

const onGraphAddNode = (event: Event) => {
    const node = (event as CustomEvent<CustomNode>).detail;
    if (!node) return;
    addNodes([node]);
};

const onCompileFinished = (event: Event) => {
    const detail = (event as CustomEvent<{ invalidCount: number; libraryName: string }>).detail;
    const invalidCount = detail?.invalidCount ?? 0;
    const libraryName = detail?.libraryName ?? 'library';
    checkStatusText.value =
        invalidCount === 0
            ? `Compile OK (${libraryName})`
            : `Compile found ${invalidCount} issue(s) (${libraryName})`;
    appendConsole(`[${new Date().toLocaleTimeString()}] ${checkStatusText.value}\n\n`);
};
</script>

<style>
/* import the required styles */
@import '@vue-flow/core/dist/style.css';

/* import the default theme (optional) */
@import '@vue-flow/core/dist/theme-default.css';

/* import control styles */
@import '@vue-flow/controls/dist/style.css';
</style>
