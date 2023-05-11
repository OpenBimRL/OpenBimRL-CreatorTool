import type { AddEdges, Connection, Edge, GraphNode, NodeMouseEvent } from '@vue-flow/core';
import type { Ref } from 'vue';
import { Dialog } from '../modals';

export function ConnectEvent(addEdges: AddEdges): (connection: Connection) => void {
    return connection => {
        const edge = connection as Edge;
        edge.style = {
            strokeWidth: 4,
        };
        addEdges([edge]);
    };
}

export function DoubleClickEvent(
    nodes: Ref<Array<GraphNode<any, any, string>>>,
    selectedNode: Ref<number>,
    nodeDataIndex: Ref<string>,
    dialog: Ref<typeof Dialog | null>,
): (event: NodeMouseEvent) => void {
    return event => {
        selectedNode.value = nodes.value.findIndex(
            (element: GraphNode) => element.id == event.node.id,
        );

        switch (event.node.type) {
            case 'inputType':
            case 'ruleIdentifier':
            default:
                nodeDataIndex.value = 'label';
                break;
        }

        dialog.value?.open();
    };
}
