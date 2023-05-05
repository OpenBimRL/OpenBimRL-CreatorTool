import json from '@/assets/defaultGraphExample.json';
import type { Edge, NodeTypesObject } from '@vue-flow/core';
import { markRaw } from 'vue';
import FunctionNodeVue from './FunctionNode.vue';
import InputType from './InputType.vue';
import RuleIdentifier from './RuleIdentifier.vue';
import type { CustomNode } from './Types';

export const multiSelectKeys = ['Shift', 'Control'];
const elements = json.elements as Array<CustomNode | Edge>;

export const nodeTypes = {
    functionType: markRaw(FunctionNodeVue),
    inputType: markRaw(InputType),
    ruleIdentifier: markRaw(RuleIdentifier),
} as NodeTypesObject;

export const nodes = elements.filter(
    element => element.type && Object.keys(nodeTypes).includes(element.type),
) as Array<CustomNode>;

export const edges = elements.filter(
    element => (element as Edge).target && (element as Edge).source,
) as Array<Edge>;
