import Parser from '@/ParserOpenBIMRL';
import type { GraphJSON } from '@/components/graph/Types';
import { isNode } from '@vue-flow/core';
import { checkGraph as apiCheckGraph } from './apiConnection';
import { appendConsole, checkLoading, checkStatusText } from './checkSession';
import { updateVisuals } from './visualizer';

let currentCheckController: AbortController | null = null;

function applyPerNodeResults(graph: GraphJSON, content: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodeResults = (content as any)?.nodes as Record<string, unknown> | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aggregatedResults = (content as any)?.results as Record<string, unknown> | undefined;
    if (!nodeResults) return;

    graph.elements = graph.elements.map(element => {
        if (!isNode(element)) return element;

        const key = `${element.data.name}${element.id}`;
        let result = nodeResults[key];
        if (result === undefined && element.type === 'ruleIdentifier') {
            const identifierLabel = element.data.label;
            if (identifierLabel) result = aggregatedResults?.[identifierLabel];
        }

        return {
            ...element,
            data: {
                ...element.data,
                nodeResult: result,
            },
        };
    });
}

function clearPerNodeResults(graph: GraphJSON) {
    graph.elements = graph.elements.map(element => {
        if (!isNode(element)) return element;
        return {
            ...element,
            data: {
                ...element.data,
                nodeResult: undefined,
            },
        };
    });
}

export function stopGraphCheck() {
    currentCheckController?.abort();
}

export async function runGraphCheck(graph: GraphJSON, parser: Parser, modelId: string) {
    if (!modelId || checkLoading.value) return;

    const graphString = parser.build(
        graph.elements,
        graph.subChecks,
        graph.resultSets,
        'graph.openbimrl',
    );

    checkLoading.value = true;
    checkStatusText.value = 'Running check...';
    clearPerNodeResults(graph);
    currentCheckController = new AbortController();

    try {
        const response = await apiCheckGraph(modelId, graphString, currentCheckController.signal);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        updateVisuals((response.content as any | undefined)?.graphicOutputs || null);
        applyPerNodeResults(graph, response.content);
        checkStatusText.value = 'Check complete';
        appendConsole(
            `[${new Date().toLocaleTimeString()}] Check complete\n${JSON.stringify(
                response.content,
                null,
                2,
            )}\n\n`,
        );
    } catch (error) {
        if ((error as Error).name === 'AbortError') {
            checkStatusText.value = 'Check stopped';
            appendConsole(`[${new Date().toLocaleTimeString()}] Check stopped by user\n\n`);
        } else {
            console.error(error);
            checkStatusText.value = 'Check failed';
            appendConsole(`[${new Date().toLocaleTimeString()}] Check failed\n${String(error)}\n\n`);
        }
    } finally {
        checkLoading.value = false;
        currentCheckController = null;
    }
}
