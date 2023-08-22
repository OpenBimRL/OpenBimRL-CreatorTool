import TWConf from '@/../tailwind.config';
import { Ref } from 'vue';
import { TreeNode } from './Tree';

export const treeStyle = {
    tree: {
        style: {
            overflowX: 'hidden',
        } as CSSStyleDeclaration,
    },
    row: {
        style: {
            overflowX: 'hidden',
            width: 'auto',
            minWidth: '0',
        } as CSSStyleDeclaration,
        child: {
            style: {
                display: 'inline-block',
            } as CSSStyleDeclaration,

            active: {
                style: {
                    display: 'inline-block',
                } as CSSStyleDeclaration,
            },
        },
    },
    selectIcon: {
        style: {
            display: 'none',
        } as CSSStyleDeclaration,
        active: {
            style: {
                display: 'none',
            } as CSSStyleDeclaration,
        },
    },
    text: {
        style: {
            display: 'inline-block',
            overflowX: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
        } as CSSStyleDeclaration,
        active: {
            style: {
                color: TWConf.theme.extend.colors.default.contrast,
                display: 'inline-block',
                overflowX: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
            } as CSSStyleDeclaration,
        },
    },
    expanded: {
        style: {
            color: 'yellow',
        } as CSSStyleDeclaration,
    },
};

export const treeOptions = (currentRule: Ref<TreeNode | null>, tree: Ref<any>) => ({
    treeEvents: {
        expanded: {
            state: false,
        },
        collapsed: {
            state: false,
        },
        selected: {
            state: true,
        },
        checked: {
            state: false,
        },
    },
    events: {
        expanded: {
            state: true,
        },
        selected: {
            state: true,
            fn(node: TreeNode) {
                tree.value.selectNode(node.id);
                currentRule.value = node;
            },
        },
        checked: {
            state: false,
        },
    },
    addNode: {
        state: true,
        fn: undefined,
        appearOnHover: false,
    },
    editNode: { state: false, fn: null, appearOnHover: false },
    deleteNode: {
        state: true,
        fn: undefined,
        appearOnHover: false,
    },
});
