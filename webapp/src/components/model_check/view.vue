<template>
    <div class="grid w-full h-full dark:bg-default-dark p-5">
        <div style="grid-area: header" class="flex">
            <h1 class="text-2xl my-auto">{{ title }}</h1>
        </div>
        <div style="grid-area: sidebar" class="p-2 mr-2 rounded-lg border select-none">
            <Tree
                :nodes="convertedData.treeDisplayData"
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
                <hr class="border-default-dark">
                <!-- check wheather it's a rule or ruleset -->
                <div v-if="currentRule.data?.hasOwnProperty('rulesOrRuleSets')">
                    <p><span class="text-xl"> Edit RuleSet </span></p>
                    <InputField v-model="(currentRule.data as RuleSet).label">
                        <span>Label</span>
                    </InputField>
                </div>
                <div v-else>
                    <p><span class="text-xl">Edit Rule</span></p>
                </div>
            </div>
            <div v-else><span class="text-xl">Select a node</span></div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { graphInjectionKey } from '@/keys';
import { inject, reactive, ref } from 'vue';
import { GraphInject, ResultSets, RuleSet, SubChecks } from '../graph/Types';
import { convert } from './TreeConverter';
import { ModelCheckProps } from './Types';

// @ts-ignore
import Tree from 'vuejs-tree';
import { TreeNode } from './Tree';
import { treeOptions as treeOptionsFunc, treeStyle } from './TreeConfig';
import InputField from '../InputField.vue';

const props = defineProps<ModelCheckProps>();

const currentRule = ref<TreeNode | null>(null);

const data = (inject(graphInjectionKey) as GraphInject).graph.value[props.bindData] as
    | SubChecks
    | ResultSets;

const convertedData = ref(convert(data as SubChecks));
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
        '. header'
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
