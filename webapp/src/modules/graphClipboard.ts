import { createUniqueID } from '@/ParserOpenBIMRL';
import type { CustomNode } from '@/components/graph/Types';
import type { Edge, GraphEdge, GraphNode, Node, XYPosition } from '@vue-flow/core';
import { Position } from '@vue-flow/core';

const CLIPBOARD_OFFSET = 40;

export interface GraphClipboardNode {
    id: string;
    type?: string;
    position: XYPosition;
    targetPosition?: Position;
    sourcePosition?: Position;
    data: CustomNode['data'];
}

export interface GraphClipboardEdge {
    source: string;
    sourceHandle?: string | null;
    target: string;
    targetHandle?: string | null;
    style?: Edge['style'];
}

export interface GraphClipboardPayload {
    nodes: GraphClipboardNode[];
    edges: GraphClipboardEdge[];
}

export interface ClonedGraphSelection {
    nodes: CustomNode[];
    edges: Edge[];
}

let clipboard: GraphClipboardPayload | null = null;
let pasteCount = 0;

function cloneJson<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

function serializeNodeData(data: GraphNode['data']): CustomNode['data'] {
    const cloned = cloneJson(data ?? {});
    cloned.selected = false;
    delete cloned.nodeResult;
    delete cloned.invalid;
    delete cloned.invalidReason;
    return cloned;
}

export function snapshotGraphSelection(
    nodes: Array<GraphNode | Node>,
    allEdges: Array<GraphEdge | Edge>,
): GraphClipboardPayload | null {
    if (!nodes.length) return null;

    const nodeIds = new Set(nodes.map(node => node.id));
    return {
        nodes: nodes.map(node => ({
            id: node.id,
            type: node.type,
            position: { ...node.position },
            targetPosition: node.targetPosition ?? Position.Left,
            sourcePosition: node.sourcePosition ?? Position.Right,
            data: serializeNodeData(node.data),
        })),
        edges: allEdges
            .filter(edge => nodeIds.has(edge.source) && nodeIds.has(edge.target))
            .map(edge => ({
                source: edge.source,
                sourceHandle: edge.sourceHandle,
                target: edge.target,
                targetHandle: edge.targetHandle,
                style: edge.style ? cloneJson(edge.style) : { strokeWidth: 4 },
            })),
    };
}

export function hasGraphClipboard() {
    return Boolean(clipboard?.nodes.length);
}

export function storeGraphClipboard(payload: GraphClipboardPayload | null) {
    clipboard = payload?.nodes.length ? cloneJson(payload) : null;
    pasteCount = 0;
}

export function getGraphClipboard(): GraphClipboardPayload | null {
    return clipboard ? cloneJson(clipboard) : null;
}

/**
 * Clone the stored (or provided) snapshot with new ids.
 * Pass `origin` to place the selection's top-left at that flow position.
 * Otherwise nodes are nudged by 40px for each consecutive paste.
 */
export function pasteGraphClipboard(
    payload: GraphClipboardPayload | null = clipboard,
    options: { origin?: XYPosition } = {},
): ClonedGraphSelection | null {
    if (!payload?.nodes.length) return null;

    pasteCount += 1;
    const origin = {
        x: Math.min(...payload.nodes.map(node => node.position.x)),
        y: Math.min(...payload.nodes.map(node => node.position.y)),
    };
    const offset = options.origin
        ? { x: options.origin.x - origin.x, y: options.origin.y - origin.y }
        : { x: CLIPBOARD_OFFSET * pasteCount, y: CLIPBOARD_OFFSET * pasteCount };

    const idMap = new Map<string, string>();
    const nodes: CustomNode[] = payload.nodes.map(node => {
        const id = createUniqueID();
        idMap.set(node.id, id);
        return {
            id,
            type: node.type,
            position: {
                x: node.position.x + offset.x,
                y: node.position.y + offset.y,
            },
            targetPosition: node.targetPosition ?? Position.Left,
            sourcePosition: node.sourcePosition ?? Position.Right,
            selected: true,
            data: serializeNodeData(node.data),
        };
    });

    const edges: Edge[] = payload.edges.flatMap(edge => {
        const source = idMap.get(edge.source);
        const target = idMap.get(edge.target);
        if (!source || !target) return [];
        return [
            {
                id: createUniqueID(),
                source,
                target,
                sourceHandle: edge.sourceHandle,
                targetHandle: edge.targetHandle,
                style: edge.style ?? { strokeWidth: 4 },
            },
        ];
    });

    return { nodes, edges };
}

export function isEditableShortcutTarget(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (target.isContentEditable) return true;
    return Boolean(
        target.closest(
            'input, textarea, select, [contenteditable="true"], .monaco-editor, .code-editor-dialog, dialog[open]',
        ),
    );
}

export function isCopyPasteModifier(event: KeyboardEvent) {
    return event.metaKey || event.ctrlKey;
}
