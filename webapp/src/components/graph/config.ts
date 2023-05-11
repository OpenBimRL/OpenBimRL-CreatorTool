import json from '@/assets/defaultGraphExample.json';
import { Edge, isEdge, isNode, NodeTypesObject } from '@vue-flow/core';
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

export const nodes = elements.filter(element => isNode(element)) as Array<CustomNode>;

export const edges = elements.filter(element => isEdge(element)) as Array<Edge>;
