import { ref, watch } from 'vue';

export const HANDLE_SIZE_STORAGE_KEY = 'openbimrl-graph-handle-size';

export const DEFAULT_HANDLE_SIZE_SCALE = 100;
export const MIN_HANDLE_SIZE_SCALE = 50;
export const MAX_HANDLE_SIZE_SCALE = 150;

const BASE_VISIBLE_REM = 1;
const BASE_HIT_REM = 1.75;
const BASE_OFFSET_PX = 8;

function clampScale(value: number): number {
    return Math.min(MAX_HANDLE_SIZE_SCALE, Math.max(MIN_HANDLE_SIZE_SCALE, value));
}

function loadHandleSizeScale(): number {
    const raw = window.localStorage.getItem(HANDLE_SIZE_STORAGE_KEY);
    if (!raw) return DEFAULT_HANDLE_SIZE_SCALE;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? clampScale(parsed) : DEFAULT_HANDLE_SIZE_SCALE;
}

export function applyHandleSizeCssVariables(scale: number) {
    const factor = scale / 100;
    const root = document.documentElement;
    root.style.setProperty('--openbimrl-handle-size', `${BASE_VISIBLE_REM * factor}rem`);
    root.style.setProperty('--openbimrl-handle-hit', `${BASE_HIT_REM * factor}rem`);
    root.style.setProperty('--openbimrl-handle-offset', `${BASE_OFFSET_PX * factor}px`);
}

export const handleSizeScale = ref(loadHandleSizeScale());

watch(handleSizeScale, scale => {
    const clamped = clampScale(scale);
    if (clamped !== scale) {
        handleSizeScale.value = clamped;
        return;
    }
    window.localStorage.setItem(HANDLE_SIZE_STORAGE_KEY, String(clamped));
    applyHandleSizeCssVariables(clamped);
});

export function initHandleSize() {
    applyHandleSizeCssVariables(handleSizeScale.value);
}
