import type { RuleSetElement } from '@/components/graph/modals/Types';
import type { CustomNode } from '@/components/graph/Types';
import { createUniqueID } from '@/ParserOpenBIMRL';
import { computed, reactive, ref, toRaw } from 'vue';

export interface LibraryNodeEntry {
    id: string;
    groupName: string;
    groupColor: string;
    node: CustomNode;
}

interface NamedHandle {
    index?: string;
    name?: string;
}

const importedLibraries: Record<string, { default: Array<RuleSetElement> }> = import.meta.glob(
    '@/assets/graph/libs/*.json',
    {
        eager: true,
    },
);

export const availableLibraries: { [key: string]: Array<RuleSetElement> } = reactive({});

for (const file in importedLibraries) {
    const baseName = file.split('/').pop()?.split('.')[0];
    if (!baseName) continue;
    availableLibraries[baseName] = importedLibraries[file].default;
}

export const loadedLibraries = ref(Object.keys(availableLibraries));
export const currentLibraryName = ref(loadedLibraries.value[0] ?? '');

export const currentLibraryGroups = computed(
    () => availableLibraries[currentLibraryName.value] ?? [],
);

export function listLibraryNodes(libraryName = currentLibraryName.value): LibraryNodeEntry[] {
    const groups = availableLibraries[libraryName] ?? [];
    return groups.flatMap(group =>
        (group.items ?? []).map(node => ({
            id: node.id,
            groupName: group.name,
            groupColor: group.color,
            node,
        })),
    );
}

export function instantiateLibraryNode(
    template: CustomNode,
    position: { x: number; y: number },
): CustomNode {
    const node = JSON.parse(JSON.stringify(toRaw(template))) as CustomNode;
    node.id = createUniqueID();
    node.position = { ...position };
    if (node.data) {
        node.data.selected = false;
        node.data.invalid = false;
        node.data.invalidReason = '';
        node.data.nodeResult = undefined;
    }
    return node;
}

function handlesOf(node: CustomNode, side: 'source' | 'target'): NamedHandle[] {
    const data = node.data as { inputs?: NamedHandle[]; outputs?: NamedHandle[] } | undefined;
    if (side === 'target') return data?.inputs ?? [];
    return data?.outputs ?? [];
}

export function nodeHasHandle(node: CustomNode, side: 'source' | 'target') {
    return handlesOf(node, side).length > 0;
}

export function pickHandleId(
    node: CustomNode,
    side: 'source' | 'target',
    preferredName?: string,
): string | null {
    const handles = handlesOf(node, side);
    if (!handles.length) return null;
    if (preferredName) {
        const match = handles.find(
            handle => handle.name?.toLowerCase() === preferredName.toLowerCase(),
        );
        if (match?.index != null) return String(match.index);
    }
    const first = handles[0];
    return first?.index != null ? String(first.index) : null;
}
