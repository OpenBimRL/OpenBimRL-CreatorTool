<template>
    <div
        class="min-w-[12rem] rounded border border-black bg-white shadow-black"
        :class="{ 'shadow': selected }"
        :style="`width: ${minWidth}rem`"
    >
        <div class="node-head bg-cyan-100 bg-opacity-60 px-2">
            <p class="heading p-2 text-center">
                <span>{{ data.name }}</span>
            </p>
        </div>
        <div class="node-body relative mt-4 min-h-[1.5rem]" :style="`height: ${minHeight}rem`">
            <CustomHandle
                v-for="(input, index) in data.inputs"
                :id="input.index"
                type="target"
                :position="Position.Left"
                :style="calcTopOffsetStyle(index, data.inputs.length)"
            >
                {{ input.name }}
            </CustomHandle>
            <CustomHandle
                v-for="(output, index) in data.outputs"
                :id="output.index"
                type="source"
                :position="Position.Right"
                :style="calcTopOffsetStyle(index, data.outputs.length)"
            >
                {{ output.name }}
            </CustomHandle>
        </div>
    </div>
</template>

<script setup lang="ts">
import { NodeProps, Position } from '@vue-flow/core';
import { calcTopOffsetStyle, CustomHandle, minHeight as heightFunction } from '.';
import type { FunctionNodeData } from './Types';

const props = defineProps<NodeProps<FunctionNodeData>>();

const minHeight = heightFunction(props.data.inputs, props.data.outputs) + 1;

const minWidth =
    (Math.max(...props.data.inputs.map<number>(element => element.name.length)) +
        Math.max(...props.data.outputs.map<number>(element => element.name.length))) /
    1.45;
</script>

<style scoped></style>
