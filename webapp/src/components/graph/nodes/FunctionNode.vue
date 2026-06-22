<template>
    <NodeBase
        :selected="selected"
        :min-width="minWidth"
        :invalid="Boolean(data.invalid)"
        :invalid-reason="data.invalidReason"
        :node-result="data.nodeResult"
    >
        <div class="node-head bg-cyan-100 bg-opacity-60 dark:bg-cyan-600">
            <p class="heading">
                <span>{{ data.name }}</span>
            </p>
        </div>
        <div class="node-body" :style="`min-height: ${minHeight}rem`">
            <CustomHandle
                v-for="(input, index) in data.inputs"
                :key="input.index"
                :id="input.index"
                type="target"
                :position="Position.Left"
                :style="calcTopOffsetStyle(index, data.inputs.length)"
            >
                {{ input.name }}
            </CustomHandle>
            <CustomHandle
                v-for="(output, index) in data.outputs"
                :key="output.index"
                :id="output.index"
                type="source"
                :position="Position.Right"
                :style="calcTopOffsetStyle(index, data.outputs.length)"
            >
                {{ output.name }}
            </CustomHandle>
        </div>
    </NodeBase>
</template>

<script setup lang="ts">
import { NodeProps, Position } from '@vue-flow/core';
import { CustomHandle } from '.';
import { calcNodeMinWidth, calcTopOffsetStyle, minHeight as heightFunction } from '..';
import type { FunctionNodeData } from '../Types';
import NodeBase from './NodeBase.vue';

const props = defineProps<NodeProps<FunctionNodeData>>();

const minHeight = heightFunction(props.data.inputs, props.data.outputs);

const minWidth = calcNodeMinWidth({
    name: props.data.name,
    inputs: props.data.inputs,
    outputs: props.data.outputs,
});
</script>

<style scoped></style>
