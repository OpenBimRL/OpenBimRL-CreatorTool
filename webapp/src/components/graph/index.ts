import { defineAsyncComponent } from 'vue';

export const calcTopOffsetStyle = (index: number, len: number) => ({
    top: `${((index + 1) / (len + 1)) * 100}%`,
});

export const minHeight = (
    inputs: Array<unknown> = [],
    outputs: Array<unknown> = [], // here it doesn't matter which types are used cause it only needs the length
) => {
    const portCount = Math.max(inputs.length, outputs.length, 1);
    return Math.max(3.5, portCount * 2.25);
};

const maxNameLength = (names: Array<{ name?: string }> = []) =>
    names.reduce((max, entry) => Math.max(max, entry.name?.length ?? 0), 0);

/** Approximate minimum node width (rem) from header and port label text lengths. */
export const calcNodeMinWidth = (options: {
    name: string;
    inputs?: Array<{ name?: string }>;
    outputs?: Array<{ name?: string }>;
    label?: string;
}) => {
    const portWidth = (maxNameLength(options.inputs) + maxNameLength(options.outputs)) / 1.45;
    const headerWidth = options.name.length / 1.45;
    const labelWidth = options.label ? options.label.length / 1.45 : 0;

    return Math.max(12, portWidth, headerWidth, labelWidth);
};

const Graph = defineAsyncComponent(() => import('./Graph.vue'));
const GraphNodeMenu = defineAsyncComponent(() => import('./modals/GraphNodeMenu.vue'));

export { Graph, GraphNodeMenu };
