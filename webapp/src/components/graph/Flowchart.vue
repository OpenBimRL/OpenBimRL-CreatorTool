<!-- Flowchart.vue -->
<script lang="ts" setup>
    import { Background, BackgroundVariant } from '@vue-flow/background';
    import { Controls } from '@vue-flow/controls';
    import { Edge, VueFlow } from '@vue-flow/core';
    import { ref } from 'vue';
    import { Dialog } from '../modals';
    import {
        edges as initialEdges,
        multiSelectKeys,
        nodes as initialNodes,
        nodeTypes,
    } from './config';
    import type { CustomNode } from './Types';

    const dialog = ref<typeof Dialog | null>(null);

    const nodes = ref<Array<CustomNode>>(initialNodes);
    const edges = ref<Array<Edge>>(initialEdges);

    nodes.value?.forEach(
        element =>
            (element.events = {
                doubleClick: () => {
                    console.log('double clicked');
                },
            }),
    );
</script>

<template>
    <VueFlow
        :node-types="nodeTypes"
        v-model:nodes="nodes"
        v-model:edges="edges"
        :multi-selection-key-code="multiSelectKeys"
    >
        <Background :variant="BackgroundVariant.Lines" :pattern-color="'#efefef'" :size="0.8" />
        <Controls />
        <Dialog ref="dialog" @close="">
            <template v-slot:title>Change Input</template>
            <template v-slot:content>
                <input
                    class="px-1 py-2 border border-black hover:border-blue-600 focus:border-transparent"
                    type="text"
                />
            </template>
            <template v-slot:accept_button_text>Change Input</template>
            <template v-slot:reject_button_text>Revert</template>
        </Dialog>
    </VueFlow>
</template>
