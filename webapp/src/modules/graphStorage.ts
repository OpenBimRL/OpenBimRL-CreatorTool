import defaultGraphExample from '@/assets/graph/defaultGraphExample.json';
import type { CustomNode, GraphJSON, NodeData } from '@/components/graph/Types';
import type { Edge } from '@vue-flow/core';
import type { Ref } from 'vue';
import { watch } from 'vue';

const GRAPH_STORAGE_KEY = 'openbimrl.graph';
const SAVE_DEBOUNCE_MS = 400;

export const defaultExampleGraph = defaultGraphExample as GraphJSON;

let saveTimeout: ReturnType<typeof setTimeout> | undefined;
let persistenceReady = false;

type NodeDataLike = NodeData<unknown, unknown>;

function isEdgeElement(element: GraphJSON['elements'][number]): element is Edge {
    return 'source' in element && 'target' in element;
}

function persistHandle(handle: Record<string, unknown>): Record<string, unknown> {
    const persisted: Record<string, unknown> = {
        index: handle.index,
    };

    if (handle.name !== undefined) persisted.name = handle.name;
    if (handle.value !== undefined) persisted.value = handle.value;

    return persisted;
}

function persistNodeData(data: NodeDataLike): NodeDataLike {
    const persisted: Record<string, unknown> = {
        name: data.name,
        icon: data.icon,
        description: data.description,
        label: data.label,
        selected: data.selected ?? false,
    };

    if (Array.isArray(data.inputs)) {
        persisted.inputs = data.inputs.map(input => persistHandle(input as Record<string, unknown>));
    }

    if (Array.isArray(data.outputs)) {
        persisted.outputs = data.outputs.map(output =>
            persistHandle(output as Record<string, unknown>),
        );
    }

    return persisted as unknown as NodeDataLike;
}

function persistElement(element: GraphJSON['elements'][number]): GraphJSON['elements'][number] {
    if (isEdgeElement(element)) {
        const edge: Edge = {
            id: element.id,
            source: element.source,
            sourceHandle: element.sourceHandle,
            target: element.target,
            targetHandle: element.targetHandle,
        };

        if (element.style) edge.style = element.style;

        return edge;
    }

    const node = element as CustomNode;
    const data = node.data as NodeDataLike;

    return {
        id: node.id,
        type: node.type,
        data: persistNodeData(data),
        position: {
            x: node.position.x,
            y: node.position.y,
        },
        targetPosition: node.targetPosition,
        sourcePosition: node.sourcePosition,
    } as CustomNode;
}

export function toPersistedGraph(graph: GraphJSON): GraphJSON {
    const nodes = graph.elements
        .filter(element => !isEdgeElement(element))
        .map(persistElement)
        .sort((left, right) => left.id.localeCompare(right.id));
    const edges = graph.elements
        .filter(isEdgeElement)
        .map(persistElement)
        .sort((left, right) => left.id.localeCompare(right.id));

    return {
        elements: [...nodes, ...edges],
        subChecks: graph.subChecks,
        resultSets: graph.resultSets,
    };
}

export function serializeGraphForStorage(graph: GraphJSON): string {
    return JSON.stringify(toPersistedGraph(graph));
}

const DEFAULT_GRAPH_SIGNATURE = serializeGraphForStorage(defaultExampleGraph);

export function graphsEqual(left: GraphJSON, right: GraphJSON): boolean {
    return serializeGraphForStorage(left) === serializeGraphForStorage(right);
}

export function isGraphDifferentFromDefault(graph: GraphJSON): boolean {
    return serializeGraphForStorage(graph) !== DEFAULT_GRAPH_SIGNATURE;
}

export function loadStoredGraph(): GraphJSON | null {
    if (typeof window === 'undefined') return null;

    const raw = window.localStorage.getItem(GRAPH_STORAGE_KEY);
    if (!raw) return null;

    try {
        return JSON.parse(raw) as GraphJSON;
    } catch {
        window.localStorage.removeItem(GRAPH_STORAGE_KEY);
        return null;
    }
}

export function saveGraph(graph: GraphJSON): void {
    if (typeof window === 'undefined') return;

    window.localStorage.setItem(GRAPH_STORAGE_KEY, serializeGraphForStorage(graph));
}

export function enableGraphPersistence(): void {
    persistenceReady = true;
}

export function setupGraphPersistence(graph: Ref<GraphJSON>): void {
    if (typeof window === 'undefined') return;

    watch(
        graph,
        value => {
            if (!persistenceReady) return;

            if (saveTimeout) clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => saveGraph(value), SAVE_DEBOUNCE_MS);
        },
        { deep: true },
    );
}
