<!-- eslint-disable vue/no-mutating-props -->
<template>
    <ul class="checks-tree-list space-y-0.5">
        <li v-for="(node, index) in elements" :key="node.id" class="list-none">
            <ChecksTreeRow
                :node="node"
                :depth="depth"
                :has-children="hasChildren(node, index)"
                deletable
                @select="$emit('select', node.id)"
                @toggle-expand="toggleExpanded(node)"
                @add="addToNode(index)"
                @delete="data.splice(index, 1)"
            />

            <div v-if="isSubCheck(data[index])" v-show="node.state.expanded" class="checks-tree-children">
                <CategoryNode
                    :nodes="nodes"
                    :data="(data[index] as SubCheck).applicability"
                    :parent="node"
                    header="Applicability"
                    :depth="depth + 1"
                    @select="$emit('select', $event)"
                    @add="(data[index] as SubCheck).applicability.push(getDefaultRule())"
                />
                <CategoryNode
                    :nodes="nodes"
                    :data="(data[index] as SubCheck).rulesOrRuleSets"
                    :parent="node"
                    header="Rules & Sets"
                    :depth="depth + 1"
                    @select="$emit('select', $event)"
                    @add="(data[index] as SubCheck).rulesOrRuleSets.push(getDefaultRule())"
                />
            </div>

            <TreeNode
                v-else-if="node.type === RuleOrRuleSetType.RULESET"
                v-show="node.state.expanded"
                :nodes="nodes"
                :data="(data[index] as RuleSet).rulesOrRuleSets"
                :parent="node"
                :depth="depth + 1"
                @select="$emit('select', $event)"
            />
        </li>
    </ul>
</template>

<script setup lang="ts">
import { createUniqueID } from '@/ParserOpenBIMRL';
import { Rule, RuleSet, SubCheck } from '@/components/graph/Types';
import {
    RuleOperator,
    RuleOrRuleSetType,
    RuleQuantifier,
    RuleSetOperator,
} from '@/components/graph/enums';
import { computed, onUnmounted, reactive, ref } from 'vue';
import { Node, NodeTypes, classifyNode, isRule, isRuleSet, isSubCheck } from '../utils';
import CategoryNode from './CategoryNode.vue';
import ChecksTreeRow from './ChecksTreeRow.vue';
import { TreeNodeState, TreeNode as TreeNodeType } from './Types';

const props = defineProps<{
    nodes: Map<string, TreeNodeType>;
    data: Array<Node>;
    parent?: TreeNodeType;
    depth?: number;
}>();

const depth = computed(() => props.depth ?? 0);
const states = ref(new Array<TreeNodeState>());

const toggleExpanded = (node: TreeNodeType) => {
    node.state.expanded = !node.state.expanded;
    if (node.state.expanded) return;
    emits('select', node.id);
};

const hasChildren = (node: TreeNodeType, index: number) => {
    if (node.nodes.length > 0) return true;
    const item = props.data[index];
    if (isSubCheck(item)) return item.applicability.length > 0 || item.rulesOrRuleSets.length > 0;
    if (isRuleSet(item)) return item.rulesOrRuleSets.length > 0;
    return false;
};

const getDefaultRule = () =>
    structuredClone({
        label: 'new Rule',
        operand1: '',
        operand2: '',
        operator: RuleOperator.EQUALS,
        quantifier: RuleQuantifier.EXISTS,
        type: RuleOrRuleSetType.RULE,
    } as Rule);

const addToNode = (at: number) => {
    const item = props.data[at];
    if (isRuleSet(item)) {
        item.rulesOrRuleSets.push(getDefaultRule());
    } else if (isRule(item)) {
        props.data[at] = {
            label: 'new Rule Set',
            operator: RuleSetOperator.OR,
            rulesOrRuleSets: [item],
            type: RuleOrRuleSetType.RULESET,
        } as RuleSet;
    }
};

const elements = computed(() =>
    props.data.map((element, index) => {
        const type = classifyNode(element);
        const id = `${type}_${createUniqueID()}`;

        props.parent?.nodes.push(id);

        const state =
            states.value[index] ||
            reactive({
                expanded: false,
                hover: false,
                selected: false,
            });

        states.value[index] = state;

        const node = {
            addable: [
                RuleOrRuleSetType.RULESET,
                NodeTypes.SUB_CHECK,
                RuleOrRuleSetType.RULE,
            ].includes(type),
            id,
            nodes: reactive(new Array<string>()),
            path: [...(props.parent?.path || []), id],
            selectable: true,
            state,
            text: (element as { name: string }).name || element.label || type,
            data: element,
            type,
        } as TreeNodeType;

        props.nodes.set(id, node);

        return node;
    }),
);

onUnmounted(() => elements.value.forEach(element => props.nodes.delete(element.id)));

const emits = defineEmits<{
    (event: 'select', node: string): void;
}>();
</script>
