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
                @node-context-menu="onNodeContextMenu"
                @pane-context-menu="onPaneContextMenu"
                @selection-context-menu="onSelectionContextMenu"
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
                <CodeEditorModal ref="codeEditor" @close="onCodeEditorClose" />
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
            <GraphContextMenu
                :open="contextMenu.open"
                :x="contextMenu.x"
                :y="contextMenu.y"
                :can-copy="contextMenu.canCopy"
                :can-paste="hasClipboard"
                @copy="onContextCopy"
                @paste="onContextPaste"
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
import {
    getGraphClipboard,
    hasGraphClipboard,
    isCopyPasteModifier,
    isEditableShortcutTarget,
    pasteGraphClipboard,
    snapshotGraphSelection,
    storeGraphClipboard,
} from '@/modules/graphClipboard';
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
import GraphContextMenu from './GraphContextMenu.vue';
import GraphRunBar from './GraphRunBar.vue';
import NodeDetailsPanel from './NodeDetailsPanel.vue';
import CodeEditorModal from './modals/CodeEditorModal.vue';
import type { CustomNode, GraphInject } from './Types';
import { multiSelectKeys, nodeTypes } from './config';
import { ConnectEvent, DoubleClickEvent, DragOverEvent, DropEvent } from './graphEvents';

import TWConf from '@/../tailwind.config';

const dialog = ref<typeof Dialog | null>(null);
const codeEditor = ref<InstanceType<typeof CodeEditorModal> | null>(null);
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

const {
    nodes,
    edges,
    addEdges,
    addNodes,
    addSelectedNodes,
    getSelectedNodes,
    project,
    removeSelectedElements,
    vueFlowRef,
    removeEdges,
    removeNodes,
} = useVueFlow({
    maxZoom: 2,
    minZoom: 0.1,
    fitViewOnInit: true,
    edges: graph.value.elements.filter(e => isEdge(e)) as Array<Edge>,
    nodes: graph.value.elements.filter(e => isNode(e)) as Array<CustomNode>,
    nodeTypes: nodeTypes,
    multiSelectionKeyCode: multiSelectKeys,
});

const contextMenu = ref({
    open: false,
    x: 0,
    y: 0,
    canCopy: false,
    flowPosition: null as { x: number; y: number } | null,
    copyNodes: [] as GraphNode[],
});
const hasClipboard = ref(false);

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
    codeEditor,
);
const onInputDialogClose = () => {
    if (dialog.value?.returnValue() !== DialogReturnValue.accept) return;

    const node = nodes.value[selectedNode.value];
    if (!node) return;

    node.data[nodeDataIndex.value] = dialogDraftValue.value;
};
const onCodeEditorClose = () => {
    if (codeEditor.value?.returnValue() !== DialogReturnValue.accept) return;
    const node = nodes.value[selectedNode.value];
    if (!node) return;
    const draft = codeEditor.value.getDraft();
    Object.assign(node.data, draft);
};
const onDragOver = DragOverEvent();
const onDrop = DropEvent(vueFlowRef, project, addNodes);
const onNodeClick = (event: NodeMouseEvent) => {
    selectedDetailNodeId.value = event.node.id;
};

const closeContextMenu = () => {
    contextMenu.value.open = false;
    contextMenu.value.copyNodes = [];
    contextMenu.value.flowPosition = null;
};

const flowPositionFromClient = (clientX: number, clientY: number) => {
    if (!vueFlowRef.value) return null;
    const { left, top } = vueFlowRef.value.getBoundingClientRect();
    return project({ x: clientX - left, y: clientY - top });
};

const nodesForCopy = (preferred: GraphNode[] = []) => {
    const selectedNodes = getSelectedNodes.value;
    if (preferred.length) {
        const preferredIds = new Set(preferred.map(node => node.id));
        if (selectedNodes.some(node => preferredIds.has(node.id))) return selectedNodes;
        return preferred;
    }
    return selectedNodes;
};

const copyNodes = (preferred: GraphNode[] = []) => {
    const payload = snapshotGraphSelection(nodesForCopy(preferred), edges.value);
    storeGraphClipboard(payload);
    hasClipboard.value = hasGraphClipboard();
    return Boolean(payload);
};

const pasteNodes = (origin?: { x: number; y: number }) => {
    const payload = getGraphClipboard();
    const cloned = pasteGraphClipboard(payload, origin ? { origin } : {});
    if (!cloned) return false;

    removeSelectedElements();
    addNodes(cloned.nodes);
    addEdges(cloned.edges);
    nextTick(() => {
        const pasted = cloned.nodes
            .map(node => nodes.value.find(existing => existing.id === node.id))
            .filter((node): node is GraphNode => Boolean(node));
        if (pasted.length) addSelectedNodes(pasted);
    });
    return true;
};

const openContextMenu = (event: MouseEvent, node?: GraphNode) => {
    event.preventDefault();
    const nodesToCopy = nodesForCopy(node ? [node] : []);
    const menuWidth = 176;
    const menuHeight = 72;
    contextMenu.value = {
        open: true,
        x: Math.min(event.clientX, window.innerWidth - menuWidth),
        y: Math.min(event.clientY, window.innerHeight - menuHeight),
        canCopy: nodesToCopy.length > 0,
        flowPosition: flowPositionFromClient(event.clientX, event.clientY),
        copyNodes: nodesToCopy,
    };
};

const onNodeContextMenu = (event: NodeMouseEvent) => {
    const mouseEvent = event.event;
    if (!(mouseEvent instanceof MouseEvent)) return;
    openContextMenu(mouseEvent, event.node);
};

const onPaneContextMenu = (event: MouseEvent) => {
    openContextMenu(event);
};

const onSelectionContextMenu = ({
    event,
    nodes: selected,
}: {
    event: MouseEvent;
    nodes: GraphNode[];
}) => {
    if (!(event instanceof MouseEvent)) return;
    openContextMenu(event, selected[0]);
};

const onContextCopy = () => {
    copyNodes(contextMenu.value.copyNodes);
    closeContextMenu();
};

const onContextPaste = () => {
    pasteNodes(contextMenu.value.flowPosition ?? undefined);
    closeContextMenu();
};

const onCopyPasteKeydown = (event: KeyboardEvent) => {
    if (!isCopyPasteModifier(event) || event.altKey) return;
    if (isEditableShortcutTarget(event.target)) return;

    const key = event.key.toLowerCase();
    if (key === 'c') {
        if (!copyNodes()) return;
        event.preventDefault();
        closeContextMenu();
        return;
    }

    if (key === 'v') {
        if (!hasGraphClipboard()) return;
        event.preventDefault();
        pasteNodes();
        closeContextMenu();
    }
};

const onPointerDownCloseMenu = (event: PointerEvent) => {
    if (!contextMenu.value.open) return;
    if (event.target instanceof Element && event.target.closest('[data-graph-context-menu]')) {
        return;
    }
    closeContextMenu();
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
    window.addEventListener('keydown', onCopyPasteKeydown);
    window.addEventListener('pointerdown', onPointerDownCloseMenu, true);
});

onUnmounted(() => {
    window.removeEventListener('openbimrl:compile-graph:done', onCompileFinished);
    window.removeEventListener('openbimrl:graph-add-node', onGraphAddNode);
    window.removeEventListener('keydown', onCopyPasteKeydown);
    window.removeEventListener('pointerdown', onPointerDownCloseMenu, true);
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
