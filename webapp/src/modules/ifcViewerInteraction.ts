import type { ModelIdMap } from '@thatopen/components';
import type { FragmentsModel } from '@thatopen/fragments';
import { readonly, ref, watch } from 'vue';
import { getFragments, getHighlighter, getSelected, selected } from './ifcViewer';

const displayedGuids = ref<Array<string>>([]);
let lastAffectedModelId: string | null = null;
const lastAffectedLocalIds = new Set<number>();

function canonicalGlobalId(value: string): string {
    return value.trim().replace(/[{}]/g, '').replace(/-/g, '').toLowerCase();
}

async function guidsForLookup(model: FragmentsModel, guids: string[]): Promise<string[]> {
    const candidates = new Set<string>();
    for (const guid of guids) {
        const trimmed = guid.trim();
        if (!trimmed) continue;
        candidates.add(trimmed);
        candidates.add(trimmed.toUpperCase());
        candidates.add(trimmed.toLowerCase());
        candidates.add(canonicalGlobalId(trimmed));
    }

    const modelGuids = await model.getGuids();
    const byCanonical = new Map<string, string>();
    for (const guid of modelGuids) {
        byCanonical.set(canonicalGlobalId(guid), guid);
    }

    const resolved: string[] = [];
    for (const candidate of candidates) {
        const hit = byCanonical.get(canonicalGlobalId(candidate));
        if (hit) resolved.push(hit);
    }

    return [...new Set(resolved)];
}

async function buildModelIdMap(model: FragmentsModel, guids: string[]): Promise<ModelIdMap> {
    const lookupGuids = await guidsForLookup(model, guids);
    const localIds = (await model.getLocalIdsByGuids(lookupGuids)).filter(
        (id): id is number => id !== null,
    );

    return localIds.length ? { [model.modelId]: new Set(localIds) } : {};
}

export function highlight(guid: string) {
    void (async () => {
        const model = await getSelected();
        const highlighter = getHighlighter();
        if (!model || !highlighter) return;

        const modelIdMap = await buildModelIdMap(model, [guid]);
        if (!Object.keys(modelIdMap).length) return;

        await highlighter.highlightByID('select', modelIdMap, false, false);
    })();
}

export function unHighlight(_guid: string) {
    /* no-op for now */
}

async function clearStoredDisplayEffects() {
    if (!lastAffectedLocalIds.size) {
        lastAffectedModelId = null;
        return;
    }

    const fragments = getFragments();
    const model =
        (lastAffectedModelId ? fragments?.list.get(lastAffectedModelId) : null) ??
        (await getSelected());

    const ids = [...lastAffectedLocalIds];
    lastAffectedLocalIds.clear();
    const modelId = lastAffectedModelId;
    lastAffectedModelId = null;

    if (!model || model.modelId !== modelId) return;

    try {
        await model.resetOpacity(ids);
        await model.resetColor(ids);
    } catch (error) {
        console.error(error);
    }
}

async function applyDisplayedGuids() {
    await clearStoredDisplayEffects();

    if (!selected.value) return;

    const model = await getSelected();
    if (!model) return;

    if (!displayedGuids.value.length) return;

    const fragments = getFragments();
    const lookupGuids = await guidsForLookup(model, displayedGuids.value);
    const modelIdMap = fragments
        ? await fragments.guidsToModelIdMap(lookupGuids)
        : await buildModelIdMap(model, displayedGuids.value);

    const selectedIds = modelIdMap[model.modelId];
    if (!selectedIds?.size) return;

    const allIds = await model.getLocalIds();
    const toDim = allIds.filter(id => !selectedIds.has(id));

    try {
        if (toDim.length) await model.setOpacity(toDim, 0.2);
        await model.setOpacity([...selectedIds], 1);

        lastAffectedModelId = model.modelId;
        lastAffectedLocalIds.clear();
        toDim.forEach(id => lastAffectedLocalIds.add(id));
        selectedIds.forEach(id => lastAffectedLocalIds.add(id));
    } catch (error) {
        console.error(error);
        lastAffectedModelId = null;
        lastAffectedLocalIds.clear();
    }
}

export async function setDisplayedGuids(guids: Array<string>) {
    const uniqueGuids = [...new Set(guids.filter(Boolean))];
    displayedGuids.value = uniqueGuids;
    try {
        await applyDisplayedGuids();
    } catch (error) {
        console.error(error);
    }
}

export function getDisplayedGuids() {
    return [...displayedGuids.value];
}

export const displayedGuidsReadonly = readonly(displayedGuids);

watch(selected, () => {
    void applyDisplayedGuids().catch(error => {
        console.error(error);
    });
});
