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
let clickSelectCleanup: (() => void) | null = null;

const CLICK_MOVE_THRESHOLD = 5;

function isPrimaryPointer(event: PointerEvent) {
    if (event.pointerType === 'touch' || event.pointerType === 'pen') return true;
    return event.button === 0;
}

/**
 * Drive Highlighter from pointerup instead of mouseup.
 * Safari/macOS often suppresses compatibility mouse events after camera-controls
 * calls preventDefault() on pointermove, so autoHighlightOnClick never fires.
 */
export function bindViewerClickSelect(canvas: HTMLElement, highlighter: OBCF.Highlighter) {
    clickSelectCleanup?.();

    let pointerDown = false;
    let startX = 0;
    let startY = 0;

    const onPointerDown = (event: PointerEvent) => {
        if (!isPrimaryPointer(event)) return;
        pointerDown = true;
        startX = event.clientX;
        startY = event.clientY;
    };

    const onPointerUp = (event: PointerEvent) => {
        if (!pointerDown) return;
        pointerDown = false;
        if (!isPrimaryPointer(event)) return;

        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        if (Math.hypot(dx, dy) > CLICK_MOVE_THRESHOLD) return;

        // Keep ThatOpen's GPU picker mouse position in sync (it only listens to pointermove).
        canvas.dispatchEvent(
            new PointerEvent('pointermove', {
                bubbles: true,
                clientX: event.clientX,
                clientY: event.clientY,
                pointerId: event.pointerId,
                pointerType: event.pointerType,
            }),
        );

        const removePrevious =
            highlighter.multiple === 'none' ? true : !event[highlighter.multiple];
        void highlighter.highlight(
            highlighter.config.selectName,
            removePrevious,
            highlighter.zoomToSelection,
        );
    };

    const onPointerCancel = () => {
        pointerDown = false;
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);

    clickSelectCleanup = () => {
        canvas.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerCancel);
        clickSelectCleanup = null;
    };
}

export function unbindViewerClickSelect() {
    clickSelectCleanup?.();
}

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
