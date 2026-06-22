import type { FragmentIdMap, FragmentsGroup } from '@thatopen/fragments';
import { Color, Material } from 'three';
import { readonly, ref, watch } from 'vue';
import { getHighlighter, getSelected, selected } from './ifcViewer';

const fragmentMap = new Map<string, FragmentIdMap>();
const displayedGuids = ref<Array<string>>([]);

/** Per-instance dimming: fragment meshes use instanceColor, not mesh.material.opacity. */
const DIM_DISPLAY_COLOR = /* @__PURE__ */ new Color().setRGB(0.22, 0.22, 0.22);

export function highlight(guid: string) {
    getSelected().then(model => {
        if (!model) return;
        convertToExpressID(model, guid).then(expressID => {
            fragmentMap.set(guid, model.getFragmentMap([expressID]));

            console.log('highlighting item with e-id: ' + expressID);

            const highlighter = getHighlighter();
            if (!highlighter) return;

            fragmentMap.forEach(map => highlighter.highlightByID('select', map, false, false));
        });
    });
}

export function unHighlight(guid: string) {
    // fragmentMap.delete(guid);
    // fragmentMap.forEach(map => getHighlighter().highlightByID('select', map));
}

function setModelMaterialsOpacity(model: FragmentsGroup, opacity: number) {
    for (const fragment of model.items) {
        const mesh = fragment.mesh;
        const raw = mesh.material as Material | Array<Material> | undefined;
        const materials = Array.isArray(raw) ? raw : raw ? [raw] : [];
        for (const material of materials) {
            material.transparent = opacity < 1;
            material.opacity = opacity;
            material.needsUpdate = true;
        }
    }
}

function resetFragmentDisplayColors(model: FragmentsGroup) {
    for (const fragment of model.items) {
        if (!fragment.mesh.instanceColor) continue;
        try {
            fragment.resetColor();
        } catch {
            /* ignore incomplete color backup state */
        }
    }
    setModelMaterialsOpacity(model, 1);
}

function canonicalGlobalId(s: string): string {
    return s.trim().replace(/[{}]/g, '').replace(/-/g, '').toLowerCase();
}

/**
 * One pass over IDs that are actually present in model geometry data:
 * GlobalId → express id (compatible with getFragmentMap()).
 */
async function buildGlobalIdIndex(model: FragmentsGroup): Promise<Map<string, number>> {
    const index = new Map<string, number>();
    for (const expressId of model.data.keys()) {
        const item = await model.getProperties(expressId);
        if (!item) continue;
        const rawGuid = item.GlobalId?.value;
        if (rawGuid === undefined || rawGuid === null) continue;
        const itemGuid = String(rawGuid).trim();
        const key = canonicalGlobalId(itemGuid);
        // Use the key from getAllPropertiesIDs() as canonical express ID for getFragmentMap().
        if (key) index.set(key, expressId);
    }
    return index;
}

function resolveExpressId(index: Map<string, number>, globalId: string): number | undefined {
    const keys = [
        ...new Set([
            canonicalGlobalId(globalId),
            canonicalGlobalId(globalId.trim()),
            canonicalGlobalId(globalId.trim().toUpperCase()),
            canonicalGlobalId(globalId.trim().toLowerCase()),
        ]),
    ].filter(Boolean);
    for (const k of keys) {
        const hit = index.get(k);
        if (hit !== undefined) return hit;
    }
    return undefined;
}

async function applyDisplayedGuids() {
    const model = await getSelected();
    if (!model) return;

    resetFragmentDisplayColors(model);

    if (!displayedGuids.value.length) return;

    const index = await buildGlobalIdIndex(model);
    const selectedExpressIds = new Set<number>();
    const selectedIdsByFragment = new Map<string, Set<number>>();
    for (const guid of displayedGuids.value) {
        const eid = resolveExpressId(index, guid);
        if (eid === undefined) continue;
        const map = model.getFragmentMap([eid]);
        if (!Object.keys(map).length) continue;
        selectedExpressIds.add(eid);
        for (const [fragmentId, ids] of Object.entries(map)) {
            if (!selectedIdsByFragment.has(fragmentId))
                selectedIdsByFragment.set(fragmentId, new Set<number>());
            const fragmentSelected = selectedIdsByFragment.get(fragmentId)!;
            for (const id of ids) fragmentSelected.add(id);
        }
    }

    if (!selectedExpressIds.size) return;

    for (const fragment of model.items) {
        const selectedInThisFragment = selectedIdsByFragment.get(fragment.id);
        const fragmentHasSelection = !!selectedInThisFragment?.size;
        setFragmentMaterialOpacity(fragment, fragmentHasSelection ? 1 : 0.2);

        // Best-effort per-instance dimming for mixed fragments (selected + non-selected).
        if (!fragmentHasSelection || !fragment.mesh.instanceColor) continue;

        const toDim: number[] = [];
        for (const id of fragment.ids) {
            if (!selectedInThisFragment.has(id)) toDim.push(id);
        }
        if (!toDim.length) continue;

        try {
            fragment.setColor(DIM_DISPLAY_COLOR, toDim);
        } catch {
            /* fragment without working instance colors */
        }
    }
}

function setFragmentMaterialOpacity(fragment: FragmentsGroup['items'][number], opacity: number) {
    const mesh = fragment.mesh;
    const raw = mesh.material as Material | Array<Material> | undefined;
    const materials = Array.isArray(raw) ? raw : raw ? [raw] : [];
    for (const material of materials) {
        material.transparent = opacity < 1;
        material.opacity = opacity;
        material.needsUpdate = true;
    }
}

export async function setDisplayedGuids(guids: Array<string>) {
    const uniqueGuids = [...new Set(guids.filter(Boolean))];
    displayedGuids.value = uniqueGuids;
    await applyDisplayedGuids();
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

async function convertToExpressID(model: FragmentsGroup, globalId: string): Promise<number> {
    if (!model) throw new TypeError('is not a non-null object');
    const index = await buildGlobalIdIndex(model);
    const eid = resolveExpressId(index, globalId);
    if (eid === undefined) throw new TypeError('expressID is null');
    return eid;
}
