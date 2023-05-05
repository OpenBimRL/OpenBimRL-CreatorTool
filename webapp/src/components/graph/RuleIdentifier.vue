<template>
    <div
        class="min-w-[12rem] rounded border border-black bg-white shadow-black"
        :class="{ 'shadow-lg': selected }"
    >
        <div class="node-head bg-red-300 bg-opacity-60 px-2">
            <p class="heading text-center">
                <span>({{ data.name }})</span>
            </p>
        </div>
        <div class="node-body relative mt-4 min-h-[1.5rem]" :style="`height: ${minHeight}rem`">
            <p class="text-center">
                <span class="pr-2" style="display: ruby">{{ data.label }}</span>
            </p>
            <Handle
                v-for="(input, index) in data.inputs"
                :id="input.index"
                type="target"
                class="flex items-center"
                :position="Position.Left"
                :style="calcTopOffsetStyle(index, data.inputs.length)"
            >
            </Handle>
            <Handle
                v-for="(output, index) in data.outputs"
                :id="output.index"
                type="source"
                :position="Position.Right"
                class="flex items-center justify-end"
                :style="calcTopOffsetStyle(index, data.outputs.length)"
            >
            </Handle>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { Handle, NodeProps, Position } from '@vue-flow/core';
    import { calcTopOffsetStyle, minHeight as heightFunction } from '.';
    import type { RuleIdentifierNodeData } from './Types';

    const props = defineProps<NodeProps<RuleIdentifierNodeData>>();

    const minHeight = heightFunction(props.data.inputs, props.data.outputs);
</script>

<style scoped></style>
