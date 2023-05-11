import json from '@/assets/graph/defaultGraphExample.json';
import { Edge, isEdge, isNode, NodeTypesObject } from '@vue-flow/core';
import { markRaw } from 'vue';
import { FunctionNode, InputType, RuleIdentifier } from './nodes';
import type { CustomNode } from './Types';

export const multiSelectKeys = ['Shift', 'Control'];
const elements = json.elements as Array<CustomNode | Edge>;

export const nodeTypes = {
    functionType: markRaw(FunctionNode),
    inputType: markRaw(InputType),
    ruleIdentifier: markRaw(RuleIdentifier),
} as NodeTypesObject;

export const nodes = elements.filter(element => isNode(element)) as Array<CustomNode>;

export const edges = elements.filter(element => isEdge(element)) as Array<Edge>;
