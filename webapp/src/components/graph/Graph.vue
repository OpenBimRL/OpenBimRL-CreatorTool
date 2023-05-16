<!-- Flowchart.vue -->
<script lang="ts" setup>
import { Background, BackgroundVariant } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import { useVueFlow, VueFlow } from '@vue-flow/core';
import { ref } from 'vue';
import { Dialog } from '../modals';
import { edges as initialEdges, multiSelectKeys, nodes as initialNodes, nodeTypes } from './config';
import { ConnectEvent, DoubleClickEvent, DragOverEvent, DropEvent } from './graphEvents';

const dialog = ref<typeof Dialog | null>(null);
const selectedNode = ref<number>(0);
const nodeDataIndex = ref<string>('name');

const { nodes, edges, addEdges, addNodes, project, vueFlowRef } = useVueFlow({
    edges: initialEdges,
    nodes: initialNodes,
    nodeTypes: nodeTypes,
    multiSelectionKeyCode: multiSelectKeys,
});

const onConnect = ConnectEvent(addEdges);
const onNodeDoubleClick = DoubleClickEvent(nodes, selectedNode, nodeDataIndex, dialog);
const onDragOver = DragOverEvent();
const onDrop = DropEvent(vueFlowRef, project, addNodes);
</script>

<template>
    <VueFlow
        @connect="onConnect"
        @node-double-click="onNodeDoubleClick"
        @dragover.prevent="onDragOver"
        @drop="onDrop"
    >
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
