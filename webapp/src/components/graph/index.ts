import { defineAsyncComponent } from 'vue';

export const calcTopOffsetStyle = (index: number, len: number) => ({
    top: len > 1 ? ((index / len) * 100).toString() + '%' : '50%',
});

export const minHeight = (
    inputs: Array<unknown> = [],
    outputs: Array<unknown> = [], // here it doesn't matter which types are used cause it only needs the length
) => Math.max(inputs.length, outputs.length);

const Graph = defineAsyncComponent(() => import('./Graph.vue'));
const GraphNodeMenu = defineAsyncComponent(() => import('./modals/GraphNodeMenu.vue'));

export { Graph, GraphNodeMenu };
