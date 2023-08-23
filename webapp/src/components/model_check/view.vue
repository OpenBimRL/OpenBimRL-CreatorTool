<template>
    <div class="grid w-full h-full dark:bg-default-dark p-5">
        <div style="grid-area: header" class="flex">
            <h1 class="text-2xl my-auto">Checks</h1>
        </div>
        <div style="grid-area: sidebar" class="p-2 mr-2 rounded-lg border select-none">
            <Tree
                :nodes="data"
                :custom-styles="treeStyle"
                :custom-options="treeOptions"
                ref="tree"
                @dblclick="doubleClickEvent"
            />
        </div>
        <div
            style="grid-area: main"
            class="relative overflow-hidden p-10 border rounded-lg bg-default-medium dark:bg-default-darkest dark:bg-opacity-50"
        >
            <div v-if="currentRule">
                <p>
                    <span v-for="(id, index) in tree.findNodePath(currentRule.id)">
                        <span v-if="index != 0">&nbsp;/&nbsp;</span>
                        <!-- I've never seen more inefficient code... Well 'git blame Florian' -->
                        <button
                            @mouseenter="tree.selectNode(id)"
                            @mouseleave="tree.selectNode(currentRule.id)"
                            @click="selectNode(tree.findNode(id))"
                        >
                            {{ (tree.findNode(id) as TreeNode).text }}
                        </button>
                    </span>
                </p>
                <hr class="border-default-dark" />
                <!-- check wheather it's a rule or ruleset -->
                <div v-if="currentRule.data?.type === RuleOrRuleSetType.RULESET">
                    <RuleSetForm :rule-set="(currentRule.data as RuleSet)" />
                </div>
                <div v-else-if="currentRule.data?.type === RuleOrRuleSetType.RULE">
                    <RuleForm :rule="(currentRule.data as Rule)" />
                </div>
                <div v-else-if="currentRule.data?.type === 'resultSet'">
                    <ResultSetForm
                        :result-set="(currentRule.data as ResultSet)"
                        :graph-nodes="graph.elements"
                        :sub-checks="graph.subChecks"
                    />
                </div>
                <div v-else-if="currentRule.data?.hasOwnProperty('name')">
                    <p class="my-1">
                        <span class="text-xl">Edit Name</span>
                    </p>
                    <InputField class="my-1" v-model="(currentRule.data as SubCheck).name">
                        <span>Name</span>
                    </InputField>
                </div>
                <div v-else><span class="text-2xl">Error! Could not get type!</span></div>
            </div>
            <div v-else><span class="text-xl">Select a node</span></div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { graphInjectionKey } from '@/keys';
import { Ref, inject, reactive, ref } from 'vue';
import type { GraphInject, ResultSet, Rule, RuleSet, SubCheck } from '../graph/Types';
import type { TreeNode } from './Tree';
import { treeOptions as treeOptionsFunc, treeStyle } from './TreeConfig';
import { convertResultSets, convertSubChecks } from './TreeConverter';
import { ResultSetForm, RuleForm, RuleSetForm } from './forms';

// @ts-ignore
import Tree from 'vuejs-tree';
import InputField from '../InputField.vue';
import { RuleOrRuleSetType } from '../graph/enums';

const currentRule = ref<TreeNode | null>(null);

const { graph } = inject(graphInjectionKey) as GraphInject;

const data: Ref<Array<TreeNode>> = ref<Array<TreeNode>>([] as Array<TreeNode>);
data.value.push(
    ...convertSubChecks(graph.value.subChecks),
    ...convertResultSets(graph.value.resultSets),
);
const tree = ref<any>(null);

const doubleClickEvent = (event: MouseEvent) => {
    const node = tree.value.findNode(
        (event.target as HTMLElement).closest('li')?.getAttribute('data-id'),
    ) as TreeNode | null;

    if (!node) return;

    node.state.expanded = !node.state.expanded;

    selectNode(node);
};

const selectNode = (node: TreeNode) => {
    if (node.selectable === false) return;
    tree.value.selectNode(node.id);

    currentRule.value = reactive(node);
};

const treeOptions = treeOptionsFunc(currentRule, tree);
</script>

<style scoped>
div.grid {
    grid-template-areas:
        'header header'
        'sidebar main';

    grid-template-columns: 30rem 1fr;
    grid-template-rows: 4rem 1fr;
}
</style>
<style>
span.icon_parent {
    @apply !align-top;
}

i.expanded_icon {
    @apply mr-1 align-super;
}
</style>
