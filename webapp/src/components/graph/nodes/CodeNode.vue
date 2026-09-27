<template>
    <NodeBase
        :selected="selected"
        :min-width="minWidth"
        :invalid="Boolean(data.invalid)"
        :invalid-reason="data.invalidReason"
        :node-result="data.nodeResult"
    >
        <div class="node-head bg-emerald-100 bg-opacity-60 dark:bg-emerald-700">
            <p class="heading">
                <span>{{ data.name }}</span>
            </p>
        </div>
        <div class="node-body" :style="`min-height: ${minHeight}rem`">
            <p class="px-2 text-center text-xs text-slate-600 dark:text-slate-300">
                {{ data.label || 'ScriptName' }}
            </p>
            <CustomHandle
                v-for="(input, index) in data.inputs"
                :key="'in-' + input.index"
                :id="input.index"
                type="target"
                :position="Position.Left"
                :style="calcTopOffsetStyle(index, data.inputs.length)"
            >
                {{ input.name }}
            </CustomHandle>
            <CustomHandle
                v-for="(output, index) in data.outputs"
                :key="'out-' + output.index"
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
import type { CodeNodeData } from '../Types';
import NodeBase from './NodeBase.vue';

const props = defineProps<NodeProps<CodeNodeData>>();

const minHeight = heightFunction(props.data.inputs, props.data.outputs);
const minWidth = calcNodeMinWidth({
    name: props.data.name,
    inputs: props.data.inputs,
    outputs: props.data.outputs,
    label: props.data.label,
});
</script>

<style scoped></style>
