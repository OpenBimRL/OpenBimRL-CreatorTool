<template>
    <div class="relative min-w-[12rem]" :style="widthStyle">
        <div
            class="relative z-20 rounded shadow-[0_0_0_1px] aria-selected:shadow-[0_0_0_2px] shadow-gray-500 bg-default-light dark:shadow-default-medium dark:bg-default-darkest"
            :class="{ 'shadow-[0_0_0_2px] !shadow-red-500': invalid }"
            :aria-selected="selected"
            :title="invalidReason || ''"
        >
            <span
                v-if="hasDisplayableIfcResult"
                class="absolute top-2 right-2 z-30"
            >
                <button
                    class="h-5 w-5 rounded text-white p-0.5"
                    :class="
                        isNodeGuidSelectionActive
                            ? 'bg-green-600/90 hover:bg-green-500'
                            : 'bg-blue-600/90 hover:bg-blue-500'
                    "
                    title="Display IFC element result (GUID)"
                    @click.stop="displayIfcResult"
                >
                    <ComputerDesktopIcon />
                </button>
            </span>
            <span
                v-if="invalid"
                class="absolute -top-2 -right-2 z-30 h-6 w-6 rounded-full bg-red-600 text-white text-center leading-6 font-bold"
            >
                !
            </span>
            <slot />
        </div>
        <details
            v-if="hasNodeResult"
            class="absolute top-full left-1 right-1 z-10 rounded-b border border-t-0 border-neutral-400 dark:border-neutral-600 bg-neutral-200/95 dark:bg-neutral-800/95 px-2 py-1 text-xs shadow-md"
        >
            <summary class="cursor-pointer select-none font-medium">Result</summary>
            <div class="mt-1 flex items-center justify-end">
                <button
                    class="px-1.5 py-0.5 rounded border border-neutral-400 dark:border-neutral-600 text-[10px] hover:bg-neutral-300/70 dark:hover:bg-neutral-700/70"
                    @click.stop="expanded = !expanded"
                >
                    {{ expanded ? 'Compact' : 'Expand' }}
                </button>
            </div>
            <pre
                class="mt-1 overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words pr-1"
                :class="expanded ? 'max-h-80' : 'max-h-36'"
            >{{ formattedNodeResult }}</pre>
        </details>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { ComputerDesktopIcon } from '@heroicons/vue/24/outline';
import {
    displayedGuidsReadonly,
    getDisplayedGuids,
    setDisplayedGuids,
} from '@/modules/ifcViewerInteraction';

const props = defineProps<{
    selected: boolean;
    minWidth?: number;
    invalid?: boolean;
    invalidReason?: string;
    nodeResult?: unknown;
}>();

const widthStyle = computed(() => (props.minWidth ? `width: ${props.minWidth}rem` : ''));
const hasNodeResult = computed(() => props.nodeResult !== undefined && props.nodeResult !== null);
const formattedNodeResult = computed(() => JSON.stringify(props.nodeResult, null, 2));
const expanded = ref(false);

const guidStringFromObject = (obj: Record<string, unknown>): string | null => {
    if (typeof obj.guid === 'string') return obj.guid;
    if (typeof obj.GUID === 'string') return obj.GUID;
    const gid = obj.GlobalId ?? obj.globalId;
    if (typeof gid === 'string') return gid;
    if (gid && typeof gid === 'object' && 'value' in gid) {
        const v = (gid as { value: unknown }).value;
        if (typeof v === 'string') return v;
    }
    return null;
};

const hasGuidLikeProperty = (value: unknown): boolean => {
    if (!value || typeof value !== 'object') return false;
    return guidStringFromObject(value as Record<string, unknown>) !== null;
};

const hasDisplayableIfcResult = computed(() => {
    const seen = new Set<unknown>();
    const maxDepth = 8;
    const maxNodes = 5000;
    let visited = 0;

    const walk = (value: unknown, depth: number): boolean => {
        if (visited++ > maxNodes || depth > maxDepth) return false;
        if (!value || typeof value !== 'object') return false;
        if (seen.has(value)) return false;
        seen.add(value);

        if (hasGuidLikeProperty(value)) return true;
        if (Array.isArray(value)) return value.some(item => walk(item, depth + 1));
        return Object.values(value as Record<string, unknown>).some(item => walk(item, depth + 1));
    };

    return walk(props.nodeResult, 0);
});

const extractGuids = (value: unknown): Array<string> => {
    const found = new Set<string>();
    const seen = new Set<unknown>();
    const maxDepth = 8;
    const maxNodes = 5000;
    let visited = 0;

    const walk = (entry: unknown, depth: number) => {
        if (visited++ > maxNodes || depth > maxDepth) return;
        if (!entry || typeof entry !== 'object') return;
        if (seen.has(entry)) return;
        seen.add(entry);

        const obj = entry as Record<string, unknown>;
        const guid = guidStringFromObject(obj);
        if (guid) found.add(guid);

        if (Array.isArray(entry)) {
            entry.forEach(item => walk(item, depth + 1));
        } else {
            Object.values(obj).forEach(item => walk(item, depth + 1));
        }
    };

    walk(value, 0);
    return [...found];
};

const nodeGuids = computed(() => extractGuids(props.nodeResult));
const isNodeGuidSelectionActive = computed(() => {
    if (!nodeGuids.value.length) return false;
    const selectedGuids = new Set(displayedGuidsReadonly.value);
    return nodeGuids.value.every(guid => selectedGuids.has(guid));
});

const displayIfcResult = () => {
    const combined = [...getDisplayedGuids(), ...nodeGuids.value];
    setDisplayedGuids(combined);
};
</script>

<style scoped></style>
