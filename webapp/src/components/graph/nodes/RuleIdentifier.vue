<template>
    <NodeBase
        :selected="selected"
        :min-width="minWidth"
        :invalid="Boolean(data.invalid)"
        :invalid-reason="data.invalidReason"
        :node-result="data.nodeResult"
    >
        <div class="node-head bg-red-300 bg-opacity-60 dark:bg-red-600">
            <p class="heading">
                <span>{{ data.name }}</span>
            </p>
        </div>
        <div class="node-body" :style="`min-height: ${minHeight}rem`">
            <p class="text-center" :class="{ 'text-blue-600': hovering }">
                <span class="pr-2" style="display: ruby">{{ data.label }}</span>
            </p>
            <CustomHandle
                v-for="(input, index) in data.inputs"
                :key="input.index"
                @mouseenter="hovering = true"
                @mouseleave="hovering = false"
                :id="input.index"
                type="target"
                :position="Position.Left"
                :style="calcTopOffsetStyle(index, data.inputs.length)"
            />
        </div>
    </NodeBase>
</template>

<script setup lang="ts">
import { NodeProps, Position } from '@vue-flow/core';
import { ref } from 'vue';
import { CustomHandle } from '.';
import { calcNodeMinWidth, calcTopOffsetStyle, minHeight as heightFunction } from '..';
import type { RuleIdentifierNodeData } from '../Types';
import NodeBase from './NodeBase.vue';

const props = defineProps<NodeProps<RuleIdentifierNodeData>>();

const hovering = ref(false);

const minHeight = heightFunction(props.data.inputs, props.data.outputs);
const minWidth = calcNodeMinWidth({
    name: props.data.name,
    label: props.data.label,
});
</script>

<style scoped></style>
