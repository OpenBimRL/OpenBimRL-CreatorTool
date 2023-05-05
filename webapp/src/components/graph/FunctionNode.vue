<template>
    <div
        class="min-w-[12rem] rounded border border-black bg-white shadow-black"
        :class="{ 'shadow-lg': selected }"
        :style="`width: ${minWidth}rem`"
    >
        <div class="node-head bg-cyan-100 bg-opacity-60 px-2">
            <p class="heading p-2 text-center">
                <span>({{ data.name }})</span>
            </p>
        </div>
        <div class="node-body relative mt-4 min-h-[1.5rem]" :style="`height: ${minHeight}rem`">
            <Handle
                v-for="(input, index) in data.inputs"
                :id="input.index"
                type="target"
                class="flex items-center"
                :position="Position.Left"
                :style="calcTopOffsetStyle(index, data.inputs.length)"
            >
                <span class="pl-2" style="display: ruby">{{ input.name }}</span>
            </Handle>
            <Handle
                v-for="(output, index) in data.outputs"
                :id="output.index"
                type="source"
                :position="Position.Right"
                class="flex items-center justify-end"
                :style="calcTopOffsetStyle(index, data.outputs.length)"
            >
                <span class="pr-2" style="display: ruby">{{ output.name }}</span>
            </Handle>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { NodeProps, Handle, Position } from '@vue-flow/core';
    import type { FunctionNodeData } from './Types';
    import { calcTopOffsetStyle, minHeight as heightFunction } from '.';

    const props = defineProps<NodeProps<FunctionNodeData>>();

    const minHeight = heightFunction(props.data.inputs, props.data.outputs) + 1;

    const minWidth =
        (Math.max(...props.data.inputs.map<number>((element) => element.name.length)) +
            Math.max(...props.data.outputs.map<number>((element) => element.name.length))) /
        1.5;
</script>

<style scoped></style>
