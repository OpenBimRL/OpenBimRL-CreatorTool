import Parser from '@/ParserOpenBIMRL';
import type { CustomNode, GraphInject, GraphJSON } from '@/components/graph/Types';
import { getLiveGraphEditor } from '@/modules/graphEditorBridge';
import { Edge, isEdge, isNode } from '@vue-flow/core';
import { nextTick } from 'vue';

export interface EditorContext {
    graph: GraphInject;
    parser: Parser;
}

export interface PortHandle {
    index: string;
    name?: string;
    value?: string;
    typeHint?: string;
    collectionType?: string;
}

const EDGE_STYLE = { strokeWidth: 4 };

/** Data keys that change without user edits (check results, validation flags). */
const SIGNATURE_IGNORED_KEYS = new Set(['nodeResult', 'invalid', 'invalidReason', 'selected']);

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export function graphNodes(ctx: EditorContext): CustomNode[] {
    const live = getLiveGraphEditor();
    if (live) return live.nodes.value as unknown as CustomNode[];
    return ctx.graph.graph.value.elements.filter(element => isNode(element)) as CustomNode[];
}

export function graphEdges(ctx: EditorContext): Edge[] {
    const live = getLiveGraphEditor();
    if (live) return live.edges.value;
    return ctx.graph.graph.value.elements.filter(element => isEdge(element)) as Edge[];
}

export function findGraphNode(ctx: EditorContext, id: string): CustomNode | undefined {
    return graphNodes(ctx).find(node => node.id === id);
}

export function nodeInputs(node: CustomNode): PortHandle[] {
    return (node.data?.inputs ?? []) as PortHandle[];
}

export function nodeOutputs(node: CustomNode): PortHandle[] {
    return (node.data?.outputs ?? []) as PortHandle[];
}

export function edgeIdFor(edge: Pick<Edge, 'source' | 'sourceHandle' | 'target' | 'targetHandle'>) {
    // Same format Vue Flow generates for connections made by hand.
    return `vueflow__edge-${edge.source}${edge.sourceHandle ?? ''}-${edge.target}${
        edge.targetHandle ?? ''
    }`;
}

function setElements(ctx: EditorContext, elements: GraphJSON['elements']) {
    ctx.graph.graph.value.elements = elements;
}

export function insertNode(ctx: EditorContext, node: CustomNode) {
    const live = getLiveGraphEditor();
    if (live) live.addNodes([node]);
    else setElements(ctx, [...ctx.graph.graph.value.elements, node]);
}

/** Removes nodes and their connected edges; returns the removed edge ids. */
export function deleteNodes(ctx: EditorContext, ids: string[]): string[] {
    const idSet = new Set(ids);
    const connected = graphEdges(ctx)
        .filter(edge => idSet.has(edge.source) || idSet.has(edge.target))
        .map(edge => edge.id);

    const live = getLiveGraphEditor();
    if (live) {
        live.removeNodes(ids, true);
    } else {
        const removedEdges = new Set(connected);
        setElements(
            ctx,
            ctx.graph.graph.value.elements.filter(element =>
                isEdge(element) ? !removedEdges.has(element.id) : !idSet.has(element.id),
            ),
        );
    }
    return connected;
}

export function insertEdge(
    ctx: EditorContext,
    connection: Pick<Edge, 'source' | 'sourceHandle' | 'target' | 'targetHandle'>,
): Edge {
    const edge: Edge = {
        id: edgeIdFor(connection),
        source: connection.source,
        sourceHandle: connection.sourceHandle,
        target: connection.target,
        targetHandle: connection.targetHandle,
        style: { ...EDGE_STYLE },
    };
    const live = getLiveGraphEditor();
    if (live) live.addEdges([edge]);
    else setElements(ctx, [...ctx.graph.graph.value.elements, edge]);
    return edge;
}

export function deleteEdges(ctx: EditorContext, ids: string[]) {
    if (!ids.length) return;
    const live = getLiveGraphEditor();
    if (live) {
        live.removeEdges(ids);
        return;
    }
    const idSet = new Set(ids);
    setElements(
        ctx,
        ctx.graph.graph.value.elements.filter(
            element => !isEdge(element) || !idSet.has(element.id),
        ),
    );
}

export function moveNode(ctx: EditorContext, id: string, position: { x: number; y: number }) {
    const live = getLiveGraphEditor();
    if (live) {
        live.updateNode(id, { position: { ...position } });
        return;
    }
    const node = findGraphNode(ctx, id);
    if (node) node.position = { ...position };
}

/** Re-measures handles after ports were added/removed so edges attach to the right place. */
export function refreshNodeHandles(ids: string[]) {
    void nextTick(() => getLiveGraphEditor()?.updateNodeInternals(ids));
}

export function fitGraphView() {
    void nextTick(() => getLiveGraphEditor()?.fitView({ padding: 0.2 }));
}

export function selectedGraphNodeId(): string | null {
    return getLiveGraphEditor()?.selectedNodeId() ?? null;
}

/** Waits until Vue Flow changes have been mirrored into the injected graph JSON. */
export async function settleGraph() {
    await nextTick();
}

/** Full, detached copy of the editor graph (nodes incl. scripts, edges, positions, checks). */
export function captureGraph(ctx: EditorContext): GraphJSON {
    const nodes = graphNodes(ctx).map(node => ({
        id: node.id,
        type: node.type,
        position: { x: node.position.x, y: node.position.y },
        targetPosition: node.targetPosition,
        sourcePosition: node.sourcePosition,
        data: node.data,
    }));
    const edges = graphEdges(ctx).map(edge => ({
        id: edge.id,
        source: edge.source,
        sourceHandle: edge.sourceHandle,
        target: edge.target,
        targetHandle: edge.targetHandle,
        style: edge.style,
    }));
    return clone({
        elements: [...nodes, ...edges],
        subChecks: ctx.graph.graph.value.subChecks ?? [],
        resultSets: ctx.graph.graph.value.resultSets ?? [],
    }) as GraphJSON;
}

export function graphSignature(graph: GraphJSON): string {
    return JSON.stringify(graph, (key, value) =>
        SIGNATURE_IGNORED_KEYS.has(key) ? undefined : value,
    );
}

/** Loads a captured graph into the editor through the regular reset path. */
export function restoreGraph(ctx: EditorContext, graph: GraphJSON) {
    ctx.graph.resetGraph(clone(graph));
}
