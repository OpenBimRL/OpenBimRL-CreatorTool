<!-- eslint-disable vue/no-mutating-props -->
<template>
    <div class="checks-category">
        <ChecksTreeRow
            :node="node!"
            :depth="depth"
            :has-children="data.length > 0"
            :deletable="false"
            @toggle-expand="node!.state.expanded = !node!.state.expanded"
            @add="
                $emit('add');
                node!.state.expanded = true;
            "
        />

        <div v-show="node!.state.expanded" class="checks-tree-children">
            <TreeNode
                :nodes="nodes"
                :data="data"
                :parent="node!"
                :depth="depth + 1"
                @select="$emit('select', $event)"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { createUniqueID } from '@/ParserOpenBIMRL';
import { ResultSets, RulesOrRuleSets, SubChecks } from '@/components/graph/Types';
import { computed, reactive, watchEffect } from 'vue';
import ChecksTreeRow from './ChecksTreeRow.vue';
import TreeNode from './TreeNode.vue';
import { TreeNode as TreeNodeType } from './Types';

const props = defineProps<{
    nodes: Map<string, TreeNodeType>;
    data: RulesOrRuleSets | SubChecks | ResultSets;
    parent?: TreeNodeType;
    header: string;
    open?: boolean;
    depth?: number;
}>();

const depth = computed(() => props.depth ?? 0);

const id = `${props.header}_${createUniqueID()}`;

props.nodes.set(id, {
    addable: true,
    id,
    text: props.header,
    nodes: reactive(new Array<string>()),
    path: [...(props.parent?.path || []), id],
    selectable: false,
    type: 'CATEGORY',
    state: {
        expanded: props.open || false,
        hover: false,
        selected: false,
    },
} as TreeNodeType);

watchEffect(() => props.parent?.nodes.push(id));

const node = computed(() => props.nodes.get(id));

defineEmits<{
    (event: 'select', node: string): void;
    (event: 'add'): void;
}>();
</script>
