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
        <div class="relative flex-1 min-h-0" @pointermove="onGraphPointerMove">
            <VueFlow
                :pan-activation-key-code="false"
                @connect="onConnect"
                @connect-start="onConnectStart"
                @connect-end="onConnectEnd"
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
            <GraphNodeSearch
                :open="nodeSearch.open"
                :x="nodeSearch.x"
                :y="nodeSearch.y"
                :entries="nodeSearchEntries"
                :placeholder="nodeSearchPlaceholder"
                @select="onNodeSearchSelect"
                @close="closeNodeSearch"
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
import {
    currentLibraryName,
    instantiateLibraryNode,
    listLibraryNodes,
    nodeHasHandle,
    pickHandleId,
    type LibraryNodeEntry,
} from '@/modules/nodeLibrary';
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
    OnConnectStartParams,
    Connection,
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
import GraphNodeSearch from './GraphNodeSearch.vue';
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
    panActivationKeyCode: false,
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

const NODE_SEARCH_WIDTH = 320;
const NODE_SEARCH_HEIGHT = 384;
const CONNECT_DROP_THRESHOLD = 8;

const lastPointer = ref({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
const nodeSearch = ref({
    open: false,
    x: 0,
    y: 0,
    flowPosition: null as { x: number; y: number } | null,
    pendingConnect: null as OnConnectStartParams | null,
});
const pendingConnectStart = ref<
    (OnConnectStartParams & { clientX: number; clientY: number }) | null
>(null);
const justConnected = ref(false);

const onGraphPointerMove = (event: PointerEvent) => {
    lastPointer.value = { x: event.clientX, y: event.clientY };
};

const clampSearchPosition = (clientX: number, clientY: number) => ({
    x: Math.min(Math.max(8, clientX), Math.max(8, window.innerWidth - NODE_SEARCH_WIDTH - 8)),
    y: Math.min(Math.max(8, clientY), Math.max(8, window.innerHeight - NODE_SEARCH_HEIGHT - 8)),
});

const focusGraphPane = () => {
    const pane =
        vueFlowRef.value ?? document.querySelector<HTMLElement>('.vue-flow, .vue-flow__pane');
    pane?.focus?.({ preventScroll: true });
};

const closeNodeSearch = () => {
    const wasOpen = nodeSearch.value.open;
    nodeSearch.value.open = false;
    nodeSearch.value.flowPosition = null;
    nodeSearch.value.pendingConnect = null;
    if (!wasOpen) return;
    nextTick(() => {
        const active = document.activeElement;
        if (active instanceof HTMLElement && active.closest('[data-graph-node-search]')) {
            active.blur();
        }
        focusGraphPane();
    });
};

const openNodeSearch = (
    clientX: number,
    clientY: number,
    pendingConnect: OnConnectStartParams | null = null,
) => {
    closeContextMenu();
    const flowPosition = flowPositionFromClient(clientX, clientY);
    const pos = clampSearchPosition(clientX, clientY);
    nodeSearch.value = {
        open: true,
        x: pos.x,
        y: pos.y,
        flowPosition,
        pendingConnect,
    };
};

const nodeSearchEntries = computed(() => {
    const entries = listLibraryNodes();
    const pending = nodeSearch.value.pendingConnect;
    if (!pending?.handleType) return entries;
    const needed = pending.handleType === 'source' ? 'target' : 'source';
    return entries.filter(entry => nodeHasHandle(entry.node, needed));
});

const nodeSearchPlaceholder = computed(() =>
    nodeSearch.value.pendingConnect
        ? 'Search nodes to connect…'
        : `Search ${currentLibraryName.value || 'library'}…`,
);

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

const applyConnection = ConnectEvent(addEdges, removeEdges, edges);
const onConnect = (connection: Connection) => {
    if (
        connection.source &&
        connection.sourceHandle &&
        connection.target &&
        connection.targetHandle
    ) {
        justConnected.value = true;
    }
    applyConnection(connection);
};
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

const pointerFromConnectEvent = (event?: MouseEvent | TouchEvent) => {
    if (!event) return null;
    if ('clientX' in event) return { x: event.clientX, y: event.clientY };
    const touch = event.changedTouches?.[0] ?? event.touches?.[0];
    if (!touch) return null;
    return { x: touch.clientX, y: touch.clientY };
};

const onConnectStart = ({
    event,
    nodeId,
    handleId,
    handleType,
}: {
    event?: MouseEvent | TouchEvent;
} & OnConnectStartParams) => {
    const point = pointerFromConnectEvent(event) ?? lastPointer.value;
    pendingConnectStart.value = {
        nodeId,
        handleId,
        handleType,
        clientX: point.x,
        clientY: point.y,
    };
    justConnected.value = false;
};

const onConnectEnd = (event?: MouseEvent | TouchEvent) => {
    const start = pendingConnectStart.value;
    pendingConnectStart.value = null;

    if (justConnected.value) {
        justConnected.value = false;
        return;
    }
    justConnected.value = false;
    if (!start?.nodeId || !start.handleType) return;

    const point = pointerFromConnectEvent(event);
    if (!point) return;
    if (Math.hypot(point.x - start.clientX, point.y - start.clientY) < CONNECT_DROP_THRESHOLD) {
        return;
    }

    const target = event && 'target' in event ? event.target : null;
    if (target instanceof Element && target.closest('.vue-flow__handle')) return;

    openNodeSearch(point.x, point.y, {
        nodeId: start.nodeId,
        handleId: start.handleId,
        handleType: start.handleType,
    });
};

const originatingHandleName = (pending: OnConnectStartParams) => {
    if (!pending.nodeId) return undefined;
    const origin = nodes.value.find(node => node.id === pending.nodeId);
    if (!origin) return undefined;
    const side = pending.handleType === 'target' ? 'target' : 'source';
    const handles =
        side === 'target'
            ? ((origin.data?.inputs ?? []) as Array<{ index?: string; name?: string }>)
            : ((origin.data?.outputs ?? []) as Array<{ index?: string; name?: string }>);
    return handles.find(handle => String(handle.index) === String(pending.handleId ?? ''))?.name;
};

const connectPendingToNode = (pending: OnConnectStartParams, nodeId: string) => {
    const node = nodes.value.find(existing => existing.id === nodeId);
    if (!node || !pending.nodeId || !pending.handleType) return;

    const preferredName = originatingHandleName(pending);
    if (pending.handleType === 'source') {
        const targetHandle = pickHandleId(node, 'target', preferredName);
        if (targetHandle == null) return;
        applyConnection({
            source: pending.nodeId,
            sourceHandle: pending.handleId ?? '0',
            target: nodeId,
            targetHandle,
        });
        return;
    }

    const sourceHandle = pickHandleId(node, 'source', preferredName);
    if (sourceHandle == null) return;
    applyConnection({
        source: nodeId,
        sourceHandle,
        target: pending.nodeId,
        targetHandle: pending.handleId ?? '0',
    });
};

const onNodeSearchSelect = (entry: LibraryNodeEntry) => {
    const flowPosition =
        nodeSearch.value.flowPosition ??
        flowPositionFromClient(lastPointer.value.x, lastPointer.value.y) ??
        flowPositionFromClient(nodeSearch.value.x, nodeSearch.value.y);
    const pending = nodeSearch.value.pendingConnect;
    closeNodeSearch();
    if (!flowPosition) return;

    const node = instantiateLibraryNode(entry.node, flowPosition);
    addNodes([node]);
    nextTick(() => {
        if (pending) connectPendingToNode(pending, node.id);
        const created = nodes.value.find(existing => existing.id === node.id);
        if (created) addSelectedNodes([created]);
    });
};

const closeContextMenu = () => {
    contextMenu.value.open = false;
    contextMenu.value.copyNodes = [];
    contextMenu.value.flowPosition = null;
};

const flowPositionFromClient = (clientX: number, clientY: number) => {
    const el = vueFlowRef.value ?? document.querySelector<HTMLElement>('.vue-flow');
    if (!el) return null;
    const { left, top } = el.getBoundingClientRect();
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
    closeNodeSearch();
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
        closeNodeSearch();
    }
};

const onNodeSearchKeydown = (event: KeyboardEvent) => {
    if (event.repeat) return;
    if (event.code !== 'Space' && event.key !== ' ') return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (isEditableShortcutTarget(event.target)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (nodeSearch.value.open) return;
    openNodeSearch(lastPointer.value.x, lastPointer.value.y);
};

const onPointerDownCloseMenu = (event: PointerEvent) => {
    const target = event.target;
    if (target instanceof Element && target.closest('[data-graph-context-menu]')) {
        return;
    }
    if (target instanceof Element && target.closest('[data-graph-node-search]')) {
        return;
    }
    closeContextMenu();
    closeNodeSearch();
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
    window.addEventListener('keydown', onNodeSearchKeydown, true);
    window.addEventListener('pointerdown', onPointerDownCloseMenu, true);
});

onUnmounted(() => {
    window.removeEventListener('openbimrl:compile-graph:done', onCompileFinished);
    window.removeEventListener('openbimrl:graph-add-node', onGraphAddNode);
    window.removeEventListener('keydown', onCopyPasteKeydown);
    window.removeEventListener('keydown', onNodeSearchKeydown, true);
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
