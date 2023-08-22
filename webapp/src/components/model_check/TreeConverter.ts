import { createUniqueID } from '@/ParserOpenBIMRL';
import { computed, reactive } from 'vue';
import { RuleSet, RulesOrRuleSets, SubChecks } from '../graph/Types';
import { TreeData, TreeNode, TreeNodeState } from './Tree';

const defaultState: TreeNodeState = {
    checked: false,
    expanded: false,
    selected: false,
};

export const convert = (data: SubChecks): TreeData => {
    const tree = {} as TreeData;

    const rootElement: TreeNode = {
        id: createUniqueID(),
        text: 'subChecks',
        nodes: data.map(element => ({
            id: createUniqueID(),
            text: element.name,
            selectable: false,
            state: structuredClone(defaultState),
            nodes: [
                {
                    text: 'applicability',
                    id: createUniqueID(),
                    state: structuredClone(defaultState),
                    nodes: convertRecursive(element.applicability),
                    selectable: false,
                },
                {
                    text: 'rulesOrRuleSets',
                    id: createUniqueID(),
                    state: structuredClone(defaultState),
                    nodes: convertRecursive(element.rulesOrRuleSets),
                    selectable: false,
                },
            ],
        })),
        state: {
            checked: false,
            expanded: true,
            selected: false,
        },
        selectable: false,
    };
    tree.treeDisplayData = [rootElement];

    return tree;
};

const convertRecursive = (data: RulesOrRuleSets): Array<TreeNode> => {
    return data.map(element => ({
        text: computed(() => element.label),
        id: createUniqueID(),
        state: structuredClone(defaultState),
        data: reactive(element),
        // the following is borrowed straight from hell
        nodes:
            (element as RuleSet).rulesOrRuleSets &&
            Array.isArray((element as RuleSet).rulesOrRuleSets)
                ? convertRecursive((element as RuleSet).rulesOrRuleSets)
                : undefined,
    }));
};
