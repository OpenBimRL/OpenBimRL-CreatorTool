import { Ref } from 'vue';
import { ResultSet, Rule, RuleSet, SubCheck } from '../graph/Types';

export interface TreeNode {
    text: string | Ref<string>;
    state: TreeNodeState;
    nodes?: Array<TreeNode>;
    id: number | string;
    definition?: string;
    depth?: number;
    checkable?: boolean;
    selectable?: boolean;
    expandable?: boolean;
    tags?: Array<number>;
    data?: Rule | RuleSet | SubCheck | ResultSet;
}

export interface TreeNodeState {
    checked: boolean;
    selected: boolean;
    expanded: boolean;
}
