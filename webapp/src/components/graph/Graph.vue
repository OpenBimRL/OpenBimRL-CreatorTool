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
                @node-drag-start="onNodeDragStart"
                @node-drag-stop="onNodeDragStop"
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
                @clear="consoleText = ''"
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
import { checkGraph as apiCheckGraph } from '@/modules/apiConnection';
import { createGroupFromSelection, getGroupedNodeIds, isGroupableNode, moveGroupChildren, stripGraphNode } from '@/modules/groupUtils';
import { models, selected, updateModels } from '@/modules/ifcViewer';
import { updateVisuals } from '@/modules/visualizer';
import { TableCellsIcon } from '@heroicons/vue/24/outline';
import { Background, BackgroundVariant } from '@vue-flow/background';
import { ControlButton, Controls } from '@vue-flow/controls';
import {
    Edge,
    GraphEdge,
    GraphNode,
    NodeDragEvent,
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
const checkLoading = ref(false);
const checkStatusText = ref('Idle');
const consoleOpen = ref(false);
const consoleMinimized = ref(false);
const consoleText = ref('Ready.\n');
const detailsPanelOpen = ref(false);
const detailsPanelWidth = ref(window.innerWidth / 3.5);
const selectedDetailNodeId = ref<string | null>(null);
let currentCheckController: AbortController | null = null;

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

const { nodes, edges, addEdges, addNodes, project, vueFlowRef, removeEdges, removeNodes, setNodes } =
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

const groupDragStarts = new Map<string, { x: number; y: number }>();

const onNodeDragStart = (event: NodeDragEvent) => {
    if (event.node.type !== 'groupType') return;
    groupDragStarts.set(event.node.id, { x: event.node.position.x, y: event.node.position.y });
};

const onNodeDragStop = (event: NodeDragEvent) => {
    if (event.node.type !== 'groupType') return;
    const start = groupDragStarts.get(event.node.id);
    groupDragStarts.delete(event.node.id);
    if (!start) return;

    const delta = {
        x: event.node.position.x - start.x,
        y: event.node.position.y - start.y,
    };
    if (delta.x === 0 && delta.y === 0) return;

    setNodes(moveGroupChildren(nodes.value, event.node, delta));
};

const toggleConsole = () => {
    consoleOpen.value = !consoleOpen.value;
    if (consoleOpen.value) consoleMinimized.value = false;
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

const applyPerNodeResults = (content: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodeResults = (content as any)?.nodes as Record<string, unknown> | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aggregatedResults = (content as any)?.results as Record<string, unknown> | undefined;
    if (!nodeResults) return;
    nodes.value.forEach(node => {
        const key = `${node.data.name}${node.id}`;
        let result = nodeResults[key];
        if (result === undefined && node.type === 'ruleIdentifier') {
            const identifierLabel = node.data.label;
            if (identifierLabel) result = aggregatedResults?.[identifierLabel];
        }
        node.data.nodeResult = result;
    });
};

const runCheck = async () => {
    if (!selectedModelId.value || checkLoading.value) return;
    selected.value = selectedModelId.value;
    const graphString = parser.build(
        graph.value.elements,
        graph.value.subChecks,
        graph.value.resultSets,
        'graph.openbimrl',
    );
    checkLoading.value = true;
    checkStatusText.value = 'Running check...';
    clearPerNodeResults();
    currentCheckController = new AbortController();
    try {
        const response = await apiCheckGraph(
            selectedModelId.value,
            graphString,
            currentCheckController.signal,
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        updateVisuals((response.content as any | undefined)?.graphicOutputs || null);
        applyPerNodeResults(response.content);
        checkStatusText.value = 'Check complete';
        consoleText.value += `[${new Date().toLocaleTimeString()}] Check complete\n${JSON.stringify(
            response.content,
            null,
            2,
        )}\n\n`;
    } catch (error) {
        if ((error as Error).name === 'AbortError') {
            checkStatusText.value = 'Check stopped';
            consoleText.value += `[${new Date().toLocaleTimeString()}] Check stopped by user\n\n`;
        } else {
            console.error(error);
            checkStatusText.value = 'Check failed';
            consoleText.value += `[${new Date().toLocaleTimeString()}] Check failed\n${String(
                error,
            )}\n\n`;
        }
    } finally {
        checkLoading.value = false;
        currentCheckController = null;
    }
};

const compileGraph = () => {
    checkStatusText.value = 'Compiling graph wiring...';
    consoleText.value += `[${new Date().toLocaleTimeString()}] Compile requested\n`;
    window.dispatchEvent(new CustomEvent('openbimrl:compile-graph'));
};

const stopCheck = () => {
    currentCheckController?.abort();
};

watch(selectedModelId, modelId => {
    selected.value = modelId;
});

watch(selected, modelId => {
    selectedModelId.value = modelId;
});

const onCreateGroup = () => {
    const allSelected = nodes.value.filter(node => node.selected);
    const alreadyGrouped = getGroupedNodeIds(nodes.value);
    const groupable = allSelected.filter(
        node => isGroupableNode(node) && !alreadyGrouped.has(node.id),
    );
    const skippedRuleIds = allSelected.filter(node => node.type === 'ruleIdentifier').length;

    if (groupable.length === 0) {
        checkStatusText.value = 'Select precalculation nodes to group (Shift/Ctrl + click)';
        consoleText.value += `[${new Date().toLocaleTimeString()}] Select at least one precalculation node to create a group.\n\n`;
        return;
    }

    const group = createGroupFromSelection(groupable, nodes.value);
    if (!group) return;

    setNodes([
        group,
        ...nodes.value.filter(node => node.type !== 'groupType').map(stripGraphNode),
    ]);

    const childCount = group.data?.children.length ?? 0;
    const skippedNote = skippedRuleIds > 0 ? ` (${skippedRuleIds} RuleIdentifier node(s) skipped)` : '';
    checkStatusText.value = `Grouped ${childCount} node(s)${skippedNote}`;
    consoleText.value += `[${new Date().toLocaleTimeString()}] Created group "${group.data?.label ?? 'Group'}" with ${childCount} node(s)${skippedNote}.\n\n`;
};

onMounted(() => {
    updateModels();
    window.addEventListener('openbimrl:compile-graph:done', onCompileFinished);
    window.addEventListener('openbimrl:create-group', onCreateGroup);
});

onUnmounted(() => {
    window.removeEventListener('openbimrl:compile-graph:done', onCompileFinished);
    window.removeEventListener('openbimrl:create-group', onCreateGroup);
    mouseResizeStop();
});

const onCompileFinished = (event: Event) => {
    const detail = (event as CustomEvent<{ invalidCount: number; libraryName: string }>).detail;
    const invalidCount = detail?.invalidCount ?? 0;
    const libraryName = detail?.libraryName ?? 'library';
    checkStatusText.value =
        invalidCount === 0
            ? `Compile OK (${libraryName})`
            : `Compile found ${invalidCount} issue(s) (${libraryName})`;
    consoleText.value += `[${new Date().toLocaleTimeString()}] ${checkStatusText.value}\n\n`;
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
