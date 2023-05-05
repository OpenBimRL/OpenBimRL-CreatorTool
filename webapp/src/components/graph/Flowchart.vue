<!-- Flowchart.vue -->
<script lang="ts" setup>
import { Background, BackgroundVariant } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import { Connection, Edge, GraphNode, NodeMouseEvent, useVueFlow, VueFlow } from '@vue-flow/core';
import { ref } from 'vue';
import { Dialog } from '../modals';
import { edges as initialEdges, multiSelectKeys, nodes as initialNodes, nodeTypes } from './config';

const dialog = ref<typeof Dialog | null>(null);
const selectedNode = ref<number>(0);
const nodeDataIndex = ref<string>('name');

const { nodes, edges, addEdges } = useVueFlow({
    edges: initialEdges,
    nodes: initialNodes,
    nodeTypes: nodeTypes,
    multiSelectionKeyCode: multiSelectKeys,
});

const onConnect = (connection: Connection) => {
    const edge = connection as Edge;
    edge.style = {
        strokeWidth: 4,
    };
    addEdges([edge]);
};

const onNodeDoubleClick = (event: NodeMouseEvent) => {
    selectedNode.value = nodes.value.findIndex((element: GraphNode) => element.id == event.node.id);

    switch (event.node.type) {
        case 'inputType':
        case 'ruleIdentifier':
        default:
            nodeDataIndex.value = 'label';
            break;
    }

    dialog.value?.open();
};
</script>

<template>
    <VueFlow @connect="onConnect" @node-double-click="onNodeDoubleClick">
        <Background :variant="BackgroundVariant.Lines" :pattern-color="'#efefef'" :size="0.8" />
        <Controls />
        <Dialog ref="dialog" @close="">
            <template v-slot:title>Change Input</template>
            <template v-slot:content>
                <input
                    class="px-1 py-2 border border-black hover:border-blue-600 focus:border-transparent"
                    type="text"
                    v-model.value="nodes[selectedNode].data[nodeDataIndex]"
                />
            </template>
            <template v-slot:accept_button_text>Change Input</template>
            <template v-slot:reject_button_text>Revert</template>
        </Dialog>
    </VueFlow>
</template>
