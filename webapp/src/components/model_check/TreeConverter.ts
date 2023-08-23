import { createUniqueID } from '@/ParserOpenBIMRL';
import { computed, reactive, ref } from 'vue';
import { ResultSets, RuleSet, RulesOrRuleSets, SubChecks } from '../graph/Types';
import { TreeNode, TreeNodeState } from './Tree';

const defaultState: TreeNodeState = {
    checked: false,
    expanded: false,
    selected: false,
};

export const convertResultSets = (data: ResultSets): Array<TreeNode> => [
    {
        id: createUniqueID(),
        text: 'resultSets',
        state: {
            checked: false,
            expanded: true,
            selected: false,
        },
        selectable: false,
        nodes: data.map(element => ({
            id: createUniqueID(),
            state: structuredClone(defaultState),
            text: computed(() => element.name),
            data: element,
        }))
    },
];

export const convertSubChecks = (data: SubChecks): Array<TreeNode> => [
    {
        id: createUniqueID(),
        text: 'subChecks',
        nodes: data.map(element => ({
            id: createUniqueID(),
            text: computed(() => element.name),
            state: structuredClone(defaultState),
            data: element,
            nodes: [
                {
                    text: 'applicability',
                    id: createUniqueID(),
                    state: structuredClone(defaultState),
                    nodes: convertRecursiveRules(element.applicability),
                    selectable: false,
                },
                {
                    text: 'rulesOrRuleSets',
                    id: createUniqueID(),
                    state: structuredClone(defaultState),
                    nodes: convertRecursiveRules(element.rulesOrRuleSets),
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
    },
];

const convertRecursiveRules = (data: RulesOrRuleSets): Array<TreeNode> => {
    return data.map(element => ({
        text: computed(() => element.label),
        id: createUniqueID(),
        state: structuredClone(defaultState),
        data: reactive(element),
        // the following is borrowed straight from hell
        nodes:
            (element as RuleSet).rulesOrRuleSets &&
            Array.isArray((element as RuleSet).rulesOrRuleSets)
                ? convertRecursiveRules((element as RuleSet).rulesOrRuleSets)
                : undefined,
    }));
};
