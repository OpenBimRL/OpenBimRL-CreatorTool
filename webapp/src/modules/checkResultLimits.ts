import type { VisualData } from './visualizer';

export const TRUNCATED_RESULT_MARKER = '__openbimrl_truncated__' as const;

export type TruncatedNodeResult = {
    [TRUNCATED_RESULT_MARKER]: true;
    approximateBytes: number;
    preview: unknown;
    message: string;
};

export const MAX_CONSOLE_CHARS = 100_000;
export const MAX_NODE_RESULT_BYTES = 512_000;
export const MAX_JSON_DISPLAY_BYTES = 256_000;
export const MAX_VISUAL_ENTRIES = 5_000;

export function formatBytes(bytes: number): string {
    if (bytes < 0) return 'large';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function structuralWeight(value: unknown, depth = 0): number {
    if (depth > 4) return 1;
    if (Array.isArray(value)) {
        return (
            value.length +
            value.slice(0, 8).reduce((sum, entry) => sum + structuralWeight(entry, depth + 1), 0)
        );
    }
    if (value && typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>);
        return (
            entries.length +
            entries
                .slice(0, 8)
                .reduce((sum, [, entry]) => sum + structuralWeight(entry, depth + 1), 0)
        );
    }
    return 1;
}

function isObviouslyTooLarge(value: unknown): boolean {
    if (Array.isArray(value) && value.length > 2_000) return true;
    if (value && typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>);
        if (entries.length > 500) return true;
        for (const [, entry] of entries.slice(0, 8)) {
            if (Array.isArray(entry) && entry.length > 2_000) return true;
        }
    }
    return structuralWeight(value) > 8_000;
}

export function isTruncatedNodeResult(value: unknown): value is TruncatedNodeResult {
    return (
        typeof value === 'object' &&
        value !== null &&
        TRUNCATED_RESULT_MARKER in value &&
        (value as TruncatedNodeResult)[TRUNCATED_RESULT_MARKER] === true
    );
}

export function estimateJsonBytes(value: unknown): number {
    try {
        return JSON.stringify(value).length;
    } catch {
        return Number.POSITIVE_INFINITY;
    }
}

export function isResultTooLargeForDisplay(value: unknown): boolean {
    if (isTruncatedNodeResult(value)) return true;
    if (isObviouslyTooLarge(value)) return true;
    return estimateJsonBytes(value) > MAX_JSON_DISPLAY_BYTES;
}

function buildPreview(value: unknown, depth = 0): unknown {
    if (value === null || typeof value !== 'object') return value;
    if (depth >= 2) return '[…]';

    if (Array.isArray(value)) {
        return value.slice(0, 5).map(item => buildPreview(item, depth + 1));
    }

    const preview: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>).slice(0, 12)) {
        preview[key] = buildPreview(entry, depth + 1);
    }
    if (Object.keys(value as object).length > 12) {
        preview['…'] = `${Object.keys(value as object).length - 12} more keys`;
    }
    return preview;
}

export function truncateNodeResult(result: unknown): unknown {
    if (result === undefined || result === null) return result;

    if (isObviouslyTooLarge(result)) {
        return {
            [TRUNCATED_RESULT_MARKER]: true,
            approximateBytes: -1,
            preview: buildPreview(result),
            message: 'Result too large to store in the graph.',
        } satisfies TruncatedNodeResult;
    }

    let approximateBytes: number;
    try {
        approximateBytes = JSON.stringify(result).length;
    } catch {
        return {
            [TRUNCATED_RESULT_MARKER]: true,
            approximateBytes: 0,
            preview: null,
            message: 'Result could not be serialized.',
        } satisfies TruncatedNodeResult;
    }

    if (approximateBytes <= MAX_NODE_RESULT_BYTES) return result;

    return {
        [TRUNCATED_RESULT_MARKER]: true,
        approximateBytes,
        preview: buildPreview(result),
        message: `Result too large to store in the graph (${formatBytes(approximateBytes)}).`,
    } satisfies TruncatedNodeResult;
}

export function resultValueForInspection(value: unknown): unknown {
    if (isTruncatedNodeResult(value)) return value.preview;
    return value;
}

export function formatResultForDisplay(value: unknown): string {
    if (isTruncatedNodeResult(value)) {
        return JSON.stringify(
            {
                message: value.message,
                approximateBytes: value.approximateBytes,
                preview: value.preview,
            },
            null,
            2,
        );
    }

    if (isResultTooLargeForDisplay(value)) {
        return `Result too large to display (${formatBytes(
            estimateJsonBytes(value),
        )}). Open the check console summary or export from the API.`;
    }

    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return 'Result could not be displayed.';
    }
}

export function countVisualEntries(data: VisualData | null | undefined): number {
    if (!data) return 0;
    return Object.values(data).reduce((sum, entries) => sum + entries.length, 0);
}

export function capGraphicOutputs(outputs: unknown): {
    data: VisualData | null;
    originalCount: number;
    cappedCount: number;
} {
    if (!outputs || typeof outputs !== 'object') {
        return { data: null, originalCount: 0, cappedCount: 0 };
    }

    const capped: VisualData = {};
    let originalCount = 0;
    let cappedCount = 0;

    for (const [key, entries] of Object.entries(outputs as Record<string, unknown>)) {
        if (!Array.isArray(entries)) continue;
        originalCount += entries.length;

        const remaining = MAX_VISUAL_ENTRIES - cappedCount;
        if (remaining <= 0) continue;

        if (entries.length > remaining) {
            capped[key] = entries.slice(0, remaining) as VisualData[string];
            cappedCount += remaining;
        } else {
            capped[key] = entries as VisualData[string];
            cappedCount += entries.length;
        }
    }

    return {
        data: cappedCount > 0 ? capped : null,
        originalCount,
        cappedCount,
    };
}

export function summarizeCheckContent(content: unknown, glb?: Uint8Array | null): string {
    if (!content || typeof content !== 'object') {
        return 'Check returned no content.';
    }

    const record = content as Record<string, unknown>;
    const nodeResults = record.nodes;
    const nodeCount =
        nodeResults && typeof nodeResults === 'object'
            ? Object.keys(nodeResults as Record<string, unknown>).length
            : 0;

    const hasVisuals = glb !== undefined && glb !== null && glb.byteLength > 0;
    const visualSizeKb = hasVisuals ? Math.ceil(glb!.byteLength / 1024) : 0;

    const resultKeys =
        record.results && typeof record.results === 'object'
            ? Object.keys(record.results as Record<string, unknown>)
            : [];

    const lines = [
        `Node results: ${nodeCount}`,
        hasVisuals ? `Visual mesh: ${visualSizeKb.toLocaleString()} KB GLB` : 'Visual mesh: none',
    ];

    if (resultKeys.length) {
        lines.push(`Aggregated result keys: ${resultKeys.slice(0, 12).join(', ')}`);
        if (resultKeys.length > 12) {
            lines.push(`…and ${resultKeys.length - 12} more`);
        }
    }

    if (nodeResults && typeof nodeResults === 'object') {
        lines.push('Node result keys:');
        for (const key of Object.keys(nodeResults as Record<string, unknown>).slice(0, 20)) {
            lines.push(`  - ${key}`);
        }
        const remaining = Object.keys(nodeResults as Record<string, unknown>).length - 20;
        if (remaining > 0) {
            lines.push(`  …and ${remaining} more`);
        }
    }

    lines.push('Full JSON omitted to keep the UI responsive.');
    return lines.join('\n');
}
