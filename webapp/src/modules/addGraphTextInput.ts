import { createUniqueID } from '@/ParserOpenBIMRL';
import type { CustomNode, GraphJSON } from '@/components/graph/Types';
import { Position } from '@vue-flow/core';
import type { Ref } from 'vue';

export function createTextInputNode(guid: string, position?: { x: number; y: number }): CustomNode {
    const label = guid.trim();
    return {
        id: createUniqueID(),
        type: 'inputType',
        position: position ?? { x: 96, y: 96 + Math.random() * 160 },
        targetPosition: Position.Left,
        sourcePosition: Position.Right,
        data: {
            name: 'input.textInput',
            icon: 'none',
            description: 'Ifc element GlobalId from model viewer selection',
            label,
            inputs: [],
            outputs: [
                {
                    index: '0',
                    name: 'String',
                    value: label,
                },
            ],
            selected: false,
        },
    };
}

export function addTextInputNodeToGraph(graph: Ref<GraphJSON>, guid: string) {
    const node = createTextInputNode(guid);
    graph.value = {
        ...graph.value,
        elements: [...graph.value.elements, node],
    };
    window.dispatchEvent(new CustomEvent('openbimrl:graph-add-node', { detail: node }));
    return node;
}
