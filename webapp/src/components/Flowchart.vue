<!-- Flowchart.vue -->
<script lang="ts" setup>
    import { Background, BackgroundVariant } from '@vue-flow/background';
    import { Controls } from '@vue-flow/controls';
    import { VueFlow } from '@vue-flow/core';
    import { ref } from 'vue';
    import { nodeTypes } from './graph';

    import json from '../assets/defaultGraphExample.json';

    const multiSelectKeys = ['Shift', 'Control'];

    const elements = ref<Array<any>>(json.elements);
</script>

<template>
    <VueFlow :node-types="nodeTypes" v-model="elements" :multi-selection-key-code="multiSelectKeys">
        <Background :variant="BackgroundVariant.Lines" :pattern-color="'#efefef'" :size="0.8" />
        <Controls />
    </VueFlow>
</template>
