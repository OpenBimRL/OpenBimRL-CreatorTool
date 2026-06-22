import { createUniqueID } from '@/ParserOpenBIMRL';
import type { CustomNode, GroupNodeData } from '@/components/graph/Types';
import { Edge, GraphNode, isNode, Node } from '@vue-flow/core';

export const DEFAULT_GROUP_COLOR = '#fcba03';

const GROUP_PADDING = 40;
const DEFAULT_NODE_WIDTH = 450;
const DEFAULT_NODE_HEIGHT = 150;

export function isGroupableNode(node: GraphNode): boolean {
    return node.type !== 'groupType' && node.type !== 'ruleIdentifier';
}

export function getGroupedNodeIds(nodes: Array<GraphNode>): Set<string> {
    const ids = new Set<string>();
    for (const node of nodes) {
        if (node.type !== 'groupType') continue;
        const children = (node.data as GroupNodeData | undefined)?.children;
        children?.forEach(childId => ids.add(childId));
    }
    return ids;
}

function getAbsoluteBounds(node: GraphNode) {
    const x = node.computedPosition?.x ?? node.position.x;
    const y = node.computedPosition?.y ?? node.position.y;
    const width = node.dimensions?.width ?? DEFAULT_NODE_WIDTH;
    const height = node.dimensions?.height ?? DEFAULT_NODE_HEIGHT;
    return { x, y, width, height };
}

function boundsFromNodes(nodes: Array<{ position: { x: number; y: number } }>) {
    const minX = Math.min(...nodes.map(n => n.position.x));
    const minY = Math.min(...nodes.map(n => n.position.y));
    const maxX = Math.max(...nodes.map(n => n.position.x + DEFAULT_NODE_WIDTH));
    const maxY = Math.max(...nodes.map(n => n.position.y + DEFAULT_NODE_HEIGHT));
    return {
        position: { x: minX - GROUP_PADDING, y: minY - GROUP_PADDING },
        width: maxX - minX + GROUP_PADDING * 2,
        height: maxY - minY + GROUP_PADDING * 2,
    };
}

/** Strip vue-flow runtime state before writing nodes back to the store. */
export function stripGraphNode(node: GraphNode): CustomNode {
    const {
        computedPosition: _computedPosition,
        dimensions: _dimensions,
        isParent: _isParent,
        selected: _selected,
        resizing: _resizing,
        dragging: _dragging,
        initialized: _initialized,
        events: _events,
        handleBounds: _handleBounds,
        ...cleanNode
    } = node;

    return {
        ...cleanNode,
        position: { x: node.position.x, y: node.position.y },
        data: node.data,
        parentNode: undefined,
        extent: undefined,
        expandParent: undefined,
    };
}

export function createGroupFromSelection(
    selectedNodes: Array<GraphNode>,
    allNodes: Array<GraphNode>,
    label = 'New Group',
    color = DEFAULT_GROUP_COLOR,
): Node<GroupNodeData> | null {
    const alreadyGrouped = getGroupedNodeIds(allNodes);
    const members = selectedNodes.filter(
        node => isGroupableNode(node) && !alreadyGrouped.has(node.id),
    );
    if (members.length === 0) return null;

    const bounds = members.map(getAbsoluteBounds);
    const minX = Math.min(...bounds.map(b => b.x));
    const minY = Math.min(...bounds.map(b => b.y));
    const maxX = Math.max(...bounds.map(b => b.x + b.width));
    const maxY = Math.max(...bounds.map(b => b.y + b.height));

    const groupPosition = { x: minX - GROUP_PADDING, y: minY - GROUP_PADDING };
    const groupWidth = maxX - minX + GROUP_PADDING * 2;
    const groupHeight = maxY - minY + GROUP_PADDING * 2;

    return {
        id: createUniqueID(),
        type: 'groupType',
        position: groupPosition,
        width: groupWidth,
        height: groupHeight,
        zIndex: -1,
        data: {
            name: 'Group',
            icon: 'none',
            description: 'Precalculation node group',
            label,
            color,
            children: members.map(member => member.id),
            selected: false,
            inputs: [],
            outputs: [],
        },
        style: {
            width: `${groupWidth}px`,
            height: `${groupHeight}px`,
        },
        connectable: false,
        selectable: true,
        dragHandle: '.group-drag-handle',
    };
}

export function applyGroupsAfterLayout(
    elements: Array<CustomNode | Edge>,
    groups: Array<{ id: string; label: string; color: string; children: Array<string> }>,
): Array<CustomNode | Edge> {
    if (groups.length === 0) return elements;

    const nodeElements = elements.filter(el => isNode(el)) as Array<CustomNode>;
    const edgeElements = elements.filter(el => !isNode(el));
    const nodeById = new Map(nodeElements.map(node => [node.id, node]));

    const groupNodes: Array<Node<GroupNodeData>> = [];

    for (const group of groups) {
        const children = group.children
            .map(childId => nodeById.get(childId))
            .filter((node): node is CustomNode => node !== undefined);
        if (children.length === 0) continue;

        const { position, width, height } = boundsFromNodes(children);

        groupNodes.push({
            id: group.id,
            type: 'groupType',
            position,
            width,
            height,
            zIndex: -1,
            data: {
                name: 'Group',
                icon: 'none',
                description: 'Precalculation node group',
                label: group.label,
                color: group.color,
                children: group.children,
                selected: false,
                inputs: [],
                outputs: [],
            },
            style: {
                width: `${width}px`,
                height: `${height}px`,
            },
            connectable: false,
            selectable: true,
            dragHandle: '.group-drag-handle',
        });
    }

    return [...groupNodes, ...nodeElements.filter(node => node.type !== 'groupType'), ...edgeElements] as Array<
        CustomNode | Edge
    >;
}

export function moveGroupChildren(
    nodes: Array<GraphNode>,
    groupNode: GraphNode,
    delta: { x: number; y: number },
): Array<CustomNode> {
    const children = new Set((groupNode.data as GroupNodeData).children ?? []);
    return nodes.map(node => {
        if (!children.has(node.id)) return stripGraphNode(node);
        return {
            ...stripGraphNode(node),
            position: {
                x: node.position.x + delta.x,
                y: node.position.y + delta.y,
            },
        };
    });
}
