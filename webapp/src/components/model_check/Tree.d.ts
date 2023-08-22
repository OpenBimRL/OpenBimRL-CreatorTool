import { Rule, RuleSet } from '../graph/Types';

export interface TreeData {
    treeDisplayData: Array<TreeNode>;
}

export interface TreeNode {
    text: string;
    state: TreeNodeState;
    nodes?: Array<TreeNode>;
    id: number | string;
    definition?: string;
    depth?: number;
    checkable?: boolean;
    selectable?: boolean;
    expandable?: boolean;
    tags?: Array<number>;
    data?: Rule | RuleSet;
}

export interface TreeNodeState {
    checked: boolean;
    selected: boolean;
    expanded: boolean;
}
