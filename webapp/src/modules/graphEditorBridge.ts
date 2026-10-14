import type {
    AddEdges,
    AddNodes,
    FitView,
    GraphEdge,
    GraphNode,
    RemoveEdges,
    RemoveNodes,
    UpdateNode,
    UpdateNodeInternals,
} from '@vue-flow/core';
import type { Ref } from 'vue';

/**
 * Vue Flow actions of the currently mounted graph view.
 *
 * Code outside of Graph.vue (e.g. the AI chat tools) uses these so changes go through
 * the same store as manual edits. While the graph view is not mounted, callers fall back
 * to mutating the injected graph JSON, which Graph.vue loads on its next mount.
 */
export interface LiveGraphEditor {
    nodes: Ref<GraphNode[]>;
    edges: Ref<GraphEdge[]>;
    addNodes: AddNodes;
    removeNodes: RemoveNodes;
    addEdges: AddEdges;
    removeEdges: RemoveEdges;
    updateNode: UpdateNode;
    updateNodeInternals: UpdateNodeInternals;
    fitView: FitView;
    selectedNodeId: () => string | null;
}

let liveEditor: LiveGraphEditor | null = null;

export function registerLiveGraphEditor(editor: LiveGraphEditor): () => void {
    liveEditor = editor;
    return () => {
        if (liveEditor === editor) liveEditor = null;
    };
}

export function getLiveGraphEditor(): LiveGraphEditor | null {
    return liveEditor;
}
