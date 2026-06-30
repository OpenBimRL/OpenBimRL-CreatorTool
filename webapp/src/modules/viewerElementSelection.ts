import * as OBC from '@thatopen/components';
import type * as OBCF from '@thatopen/components-front';
import { readonly, ref } from 'vue';

export type ViewerModelIdMap = Record<string, Set<number>>;

const selectedModelIdMap = ref<ViewerModelIdMap>({});
const selectedGuid = ref<string | null>(null);
const hasSelection = ref(false);

function isEmptyMap(map: ViewerModelIdMap) {
    return !Object.values(map).some(ids => ids.size > 0);
}

async function syncGuidFromSelection(components: OBC.Components, modelIdMap: ViewerModelIdMap) {
    if (isEmptyMap(modelIdMap)) {
        selectedGuid.value = null;
        return;
    }

    try {
        const fragments = components.get(OBC.FragmentsManager);
        const guids = await fragments.modelIdMapToGuids(modelIdMap);
        selectedGuid.value = guids.find(Boolean) ?? null;
    } catch (error) {
        console.error(error);
        selectedGuid.value = null;
    }
}

let selectionSetupDone = false;

export function setupViewerSelection(highlighter: OBCF.Highlighter, components: OBC.Components) {
    if (selectionSetupDone) return;
    selectionSetupDone = true;

    const onHighlight = (modelIdMap: ViewerModelIdMap) => {
        selectedModelIdMap.value = modelIdMap;
        hasSelection.value = !isEmptyMap(modelIdMap);
        void syncGuidFromSelection(components, modelIdMap);
    };

    const onClear = () => {
        selectedModelIdMap.value = {};
        selectedGuid.value = null;
        hasSelection.value = false;
    };

    highlighter.events.select.onHighlight.add(onHighlight);
    highlighter.events.select.onClear.add(onClear);
}

export const viewerSelectedModelIdMap = readonly(selectedModelIdMap);
export const viewerSelectedGuid = readonly(selectedGuid);
export const viewerHasSelection = readonly(hasSelection);
