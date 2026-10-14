import type { CodeNodeData, CodePortConnectorType, CustomNode } from '@/components/graph/Types';
import { compileScripts, isConnected as engineIsConnected } from '@/modules/apiConnection';
import { isTruncatedNodeResult } from '@/modules/checkResultLimits';
import { appendConsole, consoleText } from '@/modules/checkSession';
import { SCRIPT_TYPE_OPTIONS, validatePortName } from '@/modules/codeScaffold';
import { getLiveGraphEditor } from '@/modules/graphEditorBridge';
import { getFragments } from '@/modules/ifcViewer';
import {
    availableLibraries,
    currentLibraryName,
    instantiateLibraryNode,
} from '@/modules/nodeLibrary';
import router from '@/modules/router';
import { viewerSelectedGuid, viewerSelectedModelIdMap } from '@/modules/viewerElementSelection';
import { Edge, isNode, Position } from '@vue-flow/core';
import type { AiToolDefinition } from './client';
import {
    captureGraph,
    deleteEdges,
    deleteNodes,
    EditorContext,
    findGraphNode,
    fitGraphView,
    graphEdges,
    graphNodes,
    insertEdge,
    insertNode,
    moveNode,
    nodeInputs,
    nodeOutputs,
    PortHandle,
    refreshNodeHandles,
    selectedGraphNodeId,
    settleGraph,
} from './graphOps';

/** Expected failure that is reported back to the model instead of being logged. */
export class ToolError extends Error {}

type ToolArgs = Record<string, unknown>;

interface ToolSpec {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    /** Shown in the chat as a change; the actual undo decision compares graph snapshots. */
    mutates?: boolean;
    run: (args: ToolArgs, ctx: EditorContext) => unknown | Promise<unknown>;
}

export interface AiToolOutcome {
    ok: boolean;
    mutates: boolean;
    result: unknown;
}

const NODE_SPACING_X = 340;
const NODE_SPACING_Y = 170;
const OVERVIEW_NODE_LIMIT = 40;
const PLACEHOLDER_DESCRIPTIONS = new Set(['', 'none', 'Example Text Here']);
const SCRIPT_TYPES = SCRIPT_TYPE_OPTIONS as readonly string[];

// ---------------------------------------------------------------------------
// Argument helpers

function stringArg(args: ToolArgs, key: string): string {
    const value = args[key];
    if (typeof value === 'number') return String(value);
    if (typeof value !== 'string' || !value.trim()) {
        throw new ToolError(`Missing required argument '${key}'.`);
    }
    return value.trim();
}

function optionalString(args: ToolArgs, key: string): string | undefined {
    const value = args[key];
    if (value === undefined || value === null || value === '') return undefined;
    return typeof value === 'string' ? value : String(value);
}

function numberArg(args: ToolArgs, key: string, fallback: number, min: number, max: number) {
    const value = Number(args[key] ?? fallback);
    if (!Number.isFinite(value)) return fallback;
    return Math.min(max, Math.max(min, Math.round(value)));
}

function positionArg(args: ToolArgs, key: string): { x: number; y: number } | undefined {
    const value = args[key] as { x?: unknown; y?: unknown } | undefined;
    if (!value) return undefined;
    const x = Number(value.x);
    const y = Number(value.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
        throw new ToolError(`'${key}' must be an object like {"x": 400, "y": 120}.`);
    }
    return { x: Math.round(x), y: Math.round(y) };
}

// ---------------------------------------------------------------------------
// Graph helpers

const handleOf = (handle: string | null | undefined) => String(handle ?? '0');

const portLabel = (port: PortHandle) =>
    port.name ? `${port.index}:${port.name}` : String(port.index);

const nodeTitle = (node: CustomNode) =>
    node.data?.label ? `'${node.data.label}' (${node.data.name})` : `${node.data?.name}`;

/** Graph nodes always carry data; the Vue Flow type just declares it optional. */
const nodeData = (node: CustomNode) => node.data as CodeNodeData;

function isScriptNode(node: CustomNode) {
    return node.type === 'codeType' || Boolean(node.data?.name?.startsWith('script.'));
}

function requireNode(ctx: EditorContext, id: string): CustomNode {
    const node = findGraphNode(ctx, id);
    if (!node) throw new ToolError(`Node '${id}' not found. Use list_nodes to look up node ids.`);
    return node;
}

function requireScriptNode(ctx: EditorContext, id: string): CustomNode {
    const node = requireNode(ctx, id);
    if (!isScriptNode(node)) {
        throw new ToolError(`Node '${id}' is a ${node.data?.name} node, not a script node.`);
    }
    return node;
}

function resolvePort(node: CustomNode, side: 'input' | 'output', ref: string): PortHandle {
    const ports = side === 'input' ? nodeInputs(node) : nodeOutputs(node);
    if (!ports.length) throw new ToolError(`${nodeTitle(node)} has no ${side} ports.`);

    const byIndex = ports.find(port => String(port.index) === ref);
    if (byIndex) return { ...byIndex, index: String(byIndex.index) };

    const byName = ports.filter(port => port.name?.toLowerCase() === ref.toLowerCase());
    if (byName.length === 1) return { ...byName[0], index: String(byName[0].index) };

    const available = ports.map(portLabel).join(', ');
    if (byName.length > 1) {
        throw new ToolError(
            `Port name '${ref}' is ambiguous on ${nodeTitle(node)}; use the index (${available}).`,
        );
    }
    throw new ToolError(
        `${nodeTitle(node)} has no ${side} port '${ref}'. Available: ${available}.`,
    );
}

function compactNode(node: CustomNode, includePorts = false) {
    return {
        id: node.id,
        type: node.type,
        function: node.data?.name,
        label: node.data?.label,
        ...(includePorts
            ? { in: nodeInputs(node).map(portLabel), out: nodeOutputs(node).map(portLabel) }
            : {}),
        ...(node.data?.invalid ? { invalid: true } : {}),
    };
}

function truncateText(text: string, maxChars: number) {
    if (text.length <= maxChars) return { text, truncated: false };
    return { text: `${text.slice(0, maxChars)}…`, truncated: true };
}

function resultPreview(value: unknown, maxChars: number) {
    if (value === undefined || value === null) return undefined;
    const payload = isTruncatedNodeResult(value)
        ? { message: value.message, preview: value.preview }
        : value;
    let text: string;
    try {
        text = JSON.stringify(payload) ?? String(payload);
    } catch {
        text = String(payload);
    }
    return truncateText(text, maxChars);
}

function describeNode(ctx: EditorContext, node: CustomNode, resultChars = 600) {
    const edges = graphEdges(ctx);
    const nodesById = new Map(graphNodes(ctx).map(entry => [entry.id, entry]));
    const portName = (other: CustomNode | undefined, side: 'in' | 'out', handle: string) =>
        other
            ? (side === 'in' ? nodeInputs(other) : nodeOutputs(other)).find(
                  port => String(port.index) === handle,
              )?.name
            : undefined;

    const inputs = nodeInputs(node).map(port => {
        const incoming = edges.find(
            edge => edge.target === node.id && handleOf(edge.targetHandle) === String(port.index),
        );
        const source = incoming ? nodesById.get(incoming.source) : undefined;
        return {
            index: String(port.index),
            name: port.name,
            typeHint: port.typeHint,
            collectionType: port.collectionType,
            value: port.value,
            from: incoming
                ? {
                      node_id: incoming.source,
                      node: source ? nodeTitle(source) : undefined,
                      port: handleOf(incoming.sourceHandle),
                      port_name: portName(source, 'out', handleOf(incoming.sourceHandle)),
                      edge_id: incoming.id,
                  }
                : null,
        };
    });

    const outputs = nodeOutputs(node).map(port => ({
        index: String(port.index),
        name: port.name,
        typeHint: port.typeHint,
        collectionType: port.collectionType,
        to: edges
            .filter(
                edge =>
                    edge.source === node.id && handleOf(edge.sourceHandle) === String(port.index),
            )
            .map(edge => {
                const target = nodesById.get(edge.target);
                return {
                    node_id: edge.target,
                    node: target ? nodeTitle(target) : undefined,
                    port: handleOf(edge.targetHandle),
                    port_name: portName(target, 'in', handleOf(edge.targetHandle)),
                    edge_id: edge.id,
                };
            }),
    }));

    const data = node.data as CodeNodeData;
    const description = PLACEHOLDER_DESCRIPTIONS.has(data.description ?? '')
        ? undefined
        : data.description;

    return {
        id: node.id,
        type: node.type,
        function: data.name,
        label: data.label,
        description,
        position: { x: Math.round(node.position.x), y: Math.round(node.position.y) },
        inputs,
        outputs,
        ...(isScriptNode(node)
            ? {
                  script: {
                      language: data.scriptLanguage || 'kotlin',
                      lines: data.scriptSource ? data.scriptSource.split('\n').length : 0,
                  },
              }
            : {}),
        ...(data.invalid ? { invalid_reason: data.invalidReason || 'invalid' } : {}),
        result: resultPreview(data.nodeResult, resultChars) ?? null,
    };
}

function freePosition(ctx: EditorContext, candidate: { x: number; y: number }) {
    const nodes = graphNodes(ctx);
    const position = { ...candidate };
    for (let attempt = 0; attempt < 50; attempt++) {
        const blocked = nodes.some(
            node =>
                Math.abs(node.position.x - position.x) < 280 &&
                Math.abs(node.position.y - position.y) < 130,
        );
        if (!blocked) break;
        position.y += NODE_SPACING_Y;
    }
    return { x: Math.round(position.x), y: Math.round(position.y) };
}

function defaultPosition(ctx: EditorContext, nearNodeId?: string) {
    if (nearNodeId) {
        const near = requireNode(ctx, nearNodeId);
        return freePosition(ctx, { x: near.position.x + NODE_SPACING_X, y: near.position.y });
    }
    const nodes = graphNodes(ctx);
    if (!nodes.length) return { x: 100, y: 100 };
    return freePosition(ctx, {
        x: Math.max(...nodes.map(node => node.position.x)) + NODE_SPACING_X,
        y: Math.min(...nodes.map(node => node.position.y)),
    });
}

interface LibraryTemplate {
    group: string;
    name: string;
    description?: string;
    node: CustomNode;
}

/** Node templates of all loaded libraries; the active library wins on duplicate names. */
function libraryTemplates(): LibraryTemplate[] {
    const libraryNames = [
        currentLibraryName.value,
        ...Object.keys(availableLibraries).filter(name => name !== currentLibraryName.value),
    ];
    const seen = new Set<string>();
    const templates: LibraryTemplate[] = [];
    for (const libraryName of libraryNames) {
        for (const group of availableLibraries[libraryName] ?? []) {
            for (const node of group.items ?? []) {
                const name = node.data?.name;
                if (!name || seen.has(name)) continue;
                seen.add(name);
                const description = node.data?.description ?? '';
                templates.push({
                    group: group.name,
                    name,
                    description: PLACEHOLDER_DESCRIPTIONS.has(description)
                        ? undefined
                        : description,
                    node,
                });
            }
        }
    }
    return templates;
}

function findTemplate(functionName: string): LibraryTemplate {
    const templates = libraryTemplates();
    const match =
        templates.find(template => template.name === functionName) ??
        templates.find(template => template.name.toLowerCase() === functionName.toLowerCase());
    if (!match) {
        throw new ToolError(
            `Unknown node function '${functionName}'. Use get_node_types to find valid names.`,
        );
    }
    return match;
}

// ---------------------------------------------------------------------------
// Script helpers

function normalizeScriptType(value: unknown, where: string): string {
    const raw = String(value ?? 'Any').trim() || 'Any';
    const match = SCRIPT_TYPES.find(type => type.toLowerCase() === raw.toLowerCase());
    if (!match) {
        throw new ToolError(
            `${where}: unknown type '${raw}'. Allowed: ${SCRIPT_TYPES.join(', ')}.`,
        );
    }
    return match;
}

function parseScriptPorts(value: unknown, side: 'inputs' | 'outputs'): CodePortConnectorType[] {
    if (!Array.isArray(value)) {
        throw new ToolError(
            `'${side}' must be an array like [{"name": "points", "type": "Collection"}].`,
        );
    }
    const seen = new Set<string>();
    return value.map((raw, index) => {
        const entry = (typeof raw === 'string' ? { name: raw } : raw ?? {}) as Record<
            string,
            unknown
        >;
        const name = String(entry.name ?? '').trim();
        const nameError = validatePortName(name);
        if (nameError) throw new ToolError(`${side}[${index}] '${name}': ${nameError}.`);
        if (seen.has(name)) throw new ToolError(`${side}: duplicate port name '${name}'.`);
        seen.add(name);

        const port: CodePortConnectorType = {
            index: String(index),
            name,
            typeHint: normalizeScriptType(entry.type ?? entry.typeHint, `${side}[${index}]`),
        };
        const collectionType = entry.collection_type ?? entry.collectionType;
        if (collectionType) {
            port.collectionType = normalizeScriptType(collectionType, `${side}[${index}]`);
        }
        return port;
    });
}

function assertDistinctPortNames(inputs: PortHandle[], outputs: PortHandle[]) {
    const inputNames = new Set(inputs.map(port => port.name));
    const clash = outputs.find(port => port.name && inputNames.has(port.name));
    if (clash) {
        throw new ToolError(
            `'${clash.name}' is used as input and output name; script variables must be unique.`,
        );
    }
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Cheap static checks for mistakes the engine's script wrapper would reject. */
function scriptWarnings(node: CustomNode, source: string): string[] {
    const warnings: string[] = [];
    if (/^\s*import\s+/m.test(source)) {
        warnings.push(
            '`import` lines are not allowed (the engine prepends output declarations before the script); use fully qualified names instead.',
        );
    }
    for (const output of nodeOutputs(node)) {
        if (!output.name) continue;
        const name = escapeRegExp(output.name);
        if (new RegExp(`\\b(val|var)\\s+${name}\\b`).test(source)) {
            warnings.push(
                `Output '${output.name}' is pre-declared as \`var ${output.name}: Any? = null\`; assign it instead of redeclaring it.`,
            );
        } else if (!new RegExp(`\\b${name}\\s*=(?!=)`).test(source)) {
            warnings.push(`Output '${output.name}' is never assigned.`);
        }
    }
    for (const input of nodeInputs(node)) {
        if (!input.name) continue;
        if (new RegExp(`\\b(val|var)\\s+${escapeRegExp(input.name)}\\b`).test(source)) {
            warnings.push(`Input '${input.name}' is injected by the engine; do not redeclare it.`);
        }
    }
    return warnings;
}

function setScriptSource(node: CustomNode, source: string) {
    const data = node.data as CodeNodeData;
    data.scriptSource = source;
    data.scriptLanguage = data.scriptLanguage || 'kotlin';
}

/** Applies new script ports and keeps edges whose port name still exists. */
function applyScriptPorts(
    ctx: EditorContext,
    node: CustomNode,
    inputs: CodePortConnectorType[] | undefined,
    outputs: CodePortConnectorType[] | undefined,
) {
    const oldInputs = nodeInputs(node);
    const oldOutputs = nodeOutputs(node);
    assertDistinctPortNames(inputs ?? oldInputs, outputs ?? oldOutputs);

    const removeIds: string[] = [];
    const dropped: string[] = [];
    const reconnect: Array<Pick<Edge, 'source' | 'sourceHandle' | 'target' | 'targetHandle'>> = [];

    for (const edge of graphEdges(ctx)) {
        if (inputs && edge.target === node.id) {
            const oldPort = oldInputs.find(
                port => String(port.index) === handleOf(edge.targetHandle),
            );
            const newPort = inputs.find(port => oldPort?.name && port.name === oldPort.name);
            if (newPort?.index === handleOf(edge.targetHandle)) continue;
            removeIds.push(edge.id);
            if (newPort) reconnect.push({ ...edge, targetHandle: newPort.index });
            else dropped.push(edge.id);
        } else if (outputs && edge.source === node.id) {
            const oldPort = oldOutputs.find(
                port => String(port.index) === handleOf(edge.sourceHandle),
            );
            const newPort = outputs.find(port => oldPort?.name && port.name === oldPort.name);
            if (newPort?.index === handleOf(edge.sourceHandle)) continue;
            removeIds.push(edge.id);
            if (newPort) reconnect.push({ ...edge, sourceHandle: newPort.index });
            else dropped.push(edge.id);
        }
    }

    deleteEdges(ctx, removeIds);
    if (inputs) nodeData(node).inputs = inputs;
    if (outputs) nodeData(node).outputs = outputs;
    reconnect.forEach(connection =>
        insertEdge(ctx, {
            source: connection.source,
            sourceHandle: connection.sourceHandle,
            target: connection.target,
            targetHandle: connection.targetHandle,
        }),
    );
    refreshNodeHandles([node.id]);

    return { dropped_edge_ids: dropped, remapped_edges: reconnect.length };
}

// ---------------------------------------------------------------------------
// Viewer helpers

/** Flattens ThatOpen item data ({value, type} attributes, nested relation arrays). */
function simplifyItemData(value: unknown, depth = 0): unknown {
    if (Array.isArray(value)) {
        if (depth > 4) return `[${value.length} items]`;
        return value.map(entry => simplifyItemData(entry, depth + 1));
    }
    if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        const keys = Object.keys(record);
        if ('value' in record && keys.length <= 2) return record.value;
        return Object.fromEntries(keys.map(key => [key, simplifyItemData(record[key], depth + 1)]));
    }
    return value;
}

// ---------------------------------------------------------------------------
// Tool specs

const nodeIdParam = { type: 'string', description: 'Node id (from list_nodes / get_node).' };
const portParam = {
    type: 'string',
    description: 'Port index (e.g. "0") or exact port name.',
};
const scriptPortsParam = {
    type: 'array',
    description: `Ports in order. type is one of ${SCRIPT_TYPES.join(
        ', ',
    )}; collection_type optionally types the elements of a Collection.`,
    items: {
        type: 'object',
        properties: {
            name: {
                type: 'string',
                description: 'Kotlin identifier, used as variable name in the script.',
            },
            type: { type: 'string' },
            collection_type: { type: 'string' },
        },
        required: ['name'],
    },
};

const TOOL_SPECS: ToolSpec[] = [
    {
        name: 'get_graph_overview',
        description:
            'Compact summary of the graph: counts, script nodes, rule identifiers, invalid nodes, selection, current view. Includes a compact node list for small graphs. Start here.',
        parameters: { type: 'object', properties: {} },
        run: (_args, ctx) => {
            const nodes = graphNodes(ctx);
            const edges = graphEdges(ctx);
            const nodesByType: Record<string, number> = {};
            nodes.forEach(node => {
                const type = node.type ?? 'unknown';
                nodesByType[type] = (nodesByType[type] ?? 0) + 1;
            });
            const connectedInputs = new Set(
                edges.map(edge => `${edge.target}:${handleOf(edge.targetHandle)}`),
            );
            const unconnectedInputs = nodes.reduce(
                (count, node) =>
                    count +
                    nodeInputs(node).filter(
                        port => !connectedInputs.has(`${node.id}:${port.index}`),
                    ).length,
                0,
            );
            const graph = ctx.graph.graph.value;
            return {
                current_view: String(router.currentRoute.value.name ?? ''),
                graph_view_open: Boolean(getLiveGraphEditor()),
                node_count: nodes.length,
                edge_count: edges.length,
                nodes_by_type: nodesByType,
                script_nodes: nodes
                    .filter(isScriptNode)
                    .map(node => ({ id: node.id, label: node.data?.label })),
                rule_identifiers: nodes
                    .filter(node => node.type === 'ruleIdentifier')
                    .map(node => ({ id: node.id, label: node.data?.label })),
                invalid_nodes: nodes
                    .filter(node => node.data?.invalid)
                    .map(node => ({ id: node.id, reason: node.data?.invalidReason })),
                unconnected_input_count: unconnectedInputs,
                nodes_with_results: nodes.filter(
                    node => node.data?.nodeResult !== undefined && node.data?.nodeResult !== null,
                ).length,
                selected_node_id: selectedGraphNodeId(),
                sub_check_count: graph.subChecks?.length ?? 0,
                result_set_count: graph.resultSets?.length ?? 0,
                node_library: currentLibraryName.value,
                ...(nodes.length <= OVERVIEW_NODE_LIMIT
                    ? { nodes: nodes.map(node => compactNode(node)) }
                    : { nodes: 'Graph is large; use list_nodes with filters.' }),
            };
        },
    },
    {
        name: 'list_nodes',
        description:
            'List nodes compactly (id, type, function, label). Filter by type or a search term matched against id/function/label.',
        parameters: {
            type: 'object',
            properties: {
                type: {
                    type: 'string',
                    enum: [
                        'functionType',
                        'inputType',
                        'ruleIdentifier',
                        'visualizeType',
                        'codeType',
                    ],
                },
                search: { type: 'string', description: 'Case-insensitive substring.' },
                include_ports: {
                    type: 'boolean',
                    description: 'Also list ports as "index:name".',
                },
                limit: { type: 'integer', description: 'Default 100.' },
                offset: { type: 'integer' },
            },
        },
        run: (args, ctx) => {
            const type = optionalString(args, 'type');
            const search = optionalString(args, 'search')?.toLowerCase();
            const matches = graphNodes(ctx).filter(
                node =>
                    (!type || node.type === type) &&
                    (!search ||
                        `${node.id} ${node.data?.name} ${node.data?.label}`
                            .toLowerCase()
                            .includes(search)),
            );
            const offset = numberArg(args, 'offset', 0, 0, 100_000);
            const limit = numberArg(args, 'limit', 100, 1, 300);
            const page = matches.slice(offset, offset + limit);
            return {
                total: matches.length,
                returned: page.length,
                nodes: page.map(node => compactNode(node, Boolean(args.include_ports))),
            };
        },
    },
    {
        name: 'get_node',
        description:
            'Full details of one node: ports with their connections (from/to), label, description, position, script info and a short result preview.',
        parameters: {
            type: 'object',
            properties: { node_id: nodeIdParam },
            required: ['node_id'],
        },
        run: (args, ctx) => describeNode(ctx, requireNode(ctx, stringArg(args, 'node_id'))),
    },
    {
        name: 'list_connections',
        description:
            'List edges (optionally only those touching one node) with port indices and names.',
        parameters: {
            type: 'object',
            properties: {
                node_id: { type: 'string', description: 'Only edges into or out of this node.' },
                limit: { type: 'integer', description: 'Default 200.' },
            },
        },
        run: (args, ctx) => {
            const nodeId = optionalString(args, 'node_id');
            const nodesById = new Map(graphNodes(ctx).map(node => [node.id, node]));
            const portName = (nodeIdValue: string, side: 'in' | 'out', handle: string) => {
                const node = nodesById.get(nodeIdValue);
                if (!node) return undefined;
                return (side === 'in' ? nodeInputs(node) : nodeOutputs(node)).find(
                    port => String(port.index) === handle,
                )?.name;
            };
            const edges = graphEdges(ctx).filter(
                edge => !nodeId || edge.source === nodeId || edge.target === nodeId,
            );
            const limit = numberArg(args, 'limit', 200, 1, 500);
            return {
                total: edges.length,
                edges: edges.slice(0, limit).map(edge => ({
                    id: edge.id,
                    source: edge.source,
                    source_port: handleOf(edge.sourceHandle),
                    source_port_name: portName(edge.source, 'out', handleOf(edge.sourceHandle)),
                    target: edge.target,
                    target_port: handleOf(edge.targetHandle),
                    target_port_name: portName(edge.target, 'in', handleOf(edge.targetHandle)),
                })),
            };
        },
    },
    {
        name: 'get_node_types',
        description:
            'Available node types from the node library. Without arguments: function names per group. With search/group: ports and descriptions, needed to create valid nodes.',
        parameters: {
            type: 'object',
            properties: {
                search: {
                    type: 'string',
                    description: 'Words matched against function name, description and group.',
                },
                group: { type: 'string', description: 'Exact group name, e.g. "IFC Functions".' },
                limit: { type: 'integer', description: 'Default 30.' },
            },
        },
        run: args => {
            const templates = libraryTemplates();
            const search = optionalString(args, 'search')?.toLowerCase();
            const group = optionalString(args, 'group')?.toLowerCase();
            if (!search && !group) {
                const groups = new Map<string, string[]>();
                templates.forEach(template =>
                    groups.set(template.group, [
                        ...(groups.get(template.group) ?? []),
                        template.name,
                    ]),
                );
                return {
                    library: currentLibraryName.value,
                    groups: [...groups].map(([name, functions]) => ({ group: name, functions })),
                    hint: 'Call again with search or group to get ports.',
                };
            }

            const inGroup = templates.filter(
                template => !group || template.group.toLowerCase() === group,
            );
            const terms = search?.split(/\s+/).filter(Boolean) ?? [];
            const haystack = (template: LibraryTemplate) =>
                `${template.name} ${template.description ?? ''} ${template.group}`.toLowerCase();
            let matches = inGroup.filter(template =>
                terms.every(term => haystack(template).includes(term)),
            );
            if (!matches.length && terms.length > 1) {
                matches = inGroup.filter(template =>
                    terms.some(term => haystack(template).includes(term)),
                );
            }
            const limit = numberArg(args, 'limit', 30, 1, 100);
            return {
                total: matches.length,
                types: matches.slice(0, limit).map(template => ({
                    function: template.name,
                    type: template.node.type,
                    group: template.group,
                    description: template.description,
                    inputs: nodeInputs(template.node).map(portLabel),
                    outputs: nodeOutputs(template.node).map(portLabel),
                })),
            };
        },
    },
    {
        name: 'get_console',
        description:
            'Read the Check Console (check/compile logs, engine errors, script println output). Returns the last lines, optionally filtered.',
        parameters: {
            type: 'object',
            properties: {
                tail_lines: { type: 'integer', description: 'Default 60, max 400.' },
                search: { type: 'string', description: 'Only lines containing this text.' },
            },
        },
        run: args => {
            const lines = consoleText.value.split('\n');
            while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
            const search = optionalString(args, 'search')?.toLowerCase();
            const filtered = search
                ? lines.filter(line => line.toLowerCase().includes(search))
                : lines;
            const selected = filtered.slice(-numberArg(args, 'tail_lines', 60, 1, 400));
            return {
                total_lines: lines.length,
                ...(search ? { matching_lines: filtered.length } : {}),
                returned: selected.length,
                text: selected.join('\n'),
            };
        },
    },
    {
        name: 'get_selected_node',
        description:
            'The node currently selected in the graph editor (what the Node Details panel shows), with details and result preview.',
        parameters: { type: 'object', properties: {} },
        run: (_args, ctx) => {
            const id = selectedGraphNodeId();
            const node = id ? findGraphNode(ctx, id) : undefined;
            if (!node) {
                return {
                    selected: null,
                    hint: getLiveGraphEditor()
                        ? 'No node is selected in the graph.'
                        : 'The graph view is not open, so there is no node selection.',
                };
            }
            return { selected: describeNode(ctx, node, 1500) };
        },
    },
    {
        name: 'get_node_result',
        description:
            'Result value of a node from the last check run (JSON, truncated). Results exist only after the user ran a check.',
        parameters: {
            type: 'object',
            properties: {
                node_id: nodeIdParam,
                max_chars: { type: 'integer', description: 'Default 4000, max 20000.' },
            },
            required: ['node_id'],
        },
        run: (args, ctx) => {
            const node = requireNode(ctx, stringArg(args, 'node_id'));
            const preview = resultPreview(
                node.data?.nodeResult,
                numberArg(args, 'max_chars', 4000, 200, 20_000),
            );
            if (!preview) return { node_id: node.id, available: false };
            return {
                node_id: node.id,
                available: true,
                stored_truncated: isTruncatedNodeResult(node.data?.nodeResult),
                truncated: preview.truncated,
                json: preview.text,
            };
        },
    },
    {
        name: 'get_script',
        description: 'Kotlin source and port definitions of a script (script.customScript) node.',
        parameters: {
            type: 'object',
            properties: { node_id: nodeIdParam },
            required: ['node_id'],
        },
        run: (args, ctx) => {
            const node = requireScriptNode(ctx, stringArg(args, 'node_id'));
            const data = node.data as CodeNodeData;
            const ports = (list: PortHandle[]) =>
                list.map(port => ({
                    index: String(port.index),
                    name: port.name,
                    type: port.typeHint || 'Any',
                    ...(port.collectionType ? { collection_type: port.collectionType } : {}),
                }));
            return {
                node_id: node.id,
                label: data.label,
                language: data.scriptLanguage || 'kotlin',
                inputs: ports(nodeInputs(node)),
                outputs: ports(nodeOutputs(node)),
                source: data.scriptSource ?? '',
                ...(data.scriptSource ? {} : { note: 'No script yet.' }),
            };
        },
    },
    {
        name: 'get_model_checks',
        description:
            'Read-only: model sub checks (applicability + rules that compare rule identifiers) and result sets, as edited in the Sub Checks view.',
        parameters: {
            type: 'object',
            properties: { max_chars: { type: 'integer', description: 'Default 6000.' } },
        },
        run: (args, ctx) => {
            const graph = ctx.graph.graph.value;
            const preview = truncateText(
                JSON.stringify({
                    subChecks: graph.subChecks ?? [],
                    resultSets: graph.resultSets ?? [],
                }),
                numberArg(args, 'max_chars', 6000, 500, 20_000),
            );
            return { truncated: preview.truncated, json: preview.text };
        },
    },
    {
        name: 'get_viewer_selection',
        description:
            'IFC element selected in the Model Viewer: GlobalId plus attributes and property sets (what the Element properties panel shows).',
        parameters: {
            type: 'object',
            properties: { max_chars: { type: 'integer', description: 'Default 6000.' } },
        },
        run: async args => {
            const selection = Object.entries(viewerSelectedModelIdMap.value).filter(
                ([, ids]) => ids.size > 0,
            );
            if (!selection.length) {
                return {
                    selected: false,
                    hint: 'Nothing is selected in the Model Viewer. The user can click an element there.',
                };
            }
            const fragments = getFragments();
            const items: unknown[] = [];
            for (const [modelId, ids] of selection) {
                const model = fragments?.list.get(modelId);
                if (!model) continue;
                const data = await model.getItemsData([...ids].slice(0, 5), {
                    attributesDefault: true,
                    relations: {
                        IsDefinedBy: { attributes: true, relations: true },
                        DefinesOccurrence: { attributes: false, relations: false },
                    },
                });
                items.push(...data.map(item => simplifyItemData(item)));
            }
            const preview = truncateText(
                JSON.stringify(items),
                numberArg(args, 'max_chars', 6000, 500, 20_000),
            );
            return {
                selected: true,
                guid: viewerSelectedGuid.value,
                truncated: preview.truncated,
                items: preview.text,
            };
        },
    },
    {
        name: 'add_node',
        description:
            'Create a node from the node library. label is the alias for function/script nodes, the constant text for input.textInput and the identifier name for RuleIdentifier. For script.customScript you can pass ports and source directly.',
        mutates: true,
        parameters: {
            type: 'object',
            properties: {
                function: {
                    type: 'string',
                    description:
                        'Exact function name from get_node_types, e.g. "ifc.getProperty", "input.textInput", "RuleIdentifier", "script.customScript".',
                },
                label: { type: 'string' },
                position: {
                    type: 'object',
                    properties: { x: { type: 'number' }, y: { type: 'number' } },
                    description: 'Canvas position; omit to place automatically.',
                },
                near_node_id: {
                    type: 'string',
                    description: 'Place to the right of this node (when position is omitted).',
                },
                script_inputs: scriptPortsParam,
                script_outputs: scriptPortsParam,
                script_source: { type: 'string', description: 'Kotlin script body.' },
            },
            required: ['function'],
        },
        run: (args, ctx) => {
            const template = findTemplate(stringArg(args, 'function'));
            const position =
                positionArg(args, 'position') ??
                defaultPosition(ctx, optionalString(args, 'near_node_id'));
            const node = instantiateLibraryNode(template.node, position);
            node.targetPosition = Position.Left;
            node.sourcePosition = Position.Right;

            const label = optionalString(args, 'label');
            if (label !== undefined) nodeData(node).label = label;
            if (node.type === 'inputType') {
                const output = nodeOutputs(node)[0];
                if (output) output.value = nodeData(node).label;
            }

            const warnings: string[] = [];
            if (isScriptNode(node)) {
                const inputs =
                    args.script_inputs !== undefined
                        ? parseScriptPorts(args.script_inputs, 'inputs')
                        : undefined;
                const outputs =
                    args.script_outputs !== undefined
                        ? parseScriptPorts(args.script_outputs, 'outputs')
                        : undefined;
                if (outputs && !outputs.length)
                    throw new ToolError('A script node needs at least one output.');
                assertDistinctPortNames(inputs ?? nodeInputs(node), outputs ?? nodeOutputs(node));
                if (inputs) nodeData(node).inputs = inputs;
                if (outputs) nodeData(node).outputs = outputs;
                const source = optionalString(args, 'script_source');
                if (source !== undefined) {
                    setScriptSource(node, source);
                    warnings.push(...scriptWarnings(node, source));
                }
            } else if (args.script_source || args.script_inputs || args.script_outputs) {
                warnings.push('script_* arguments were ignored: this is not a script node.');
            }

            insertNode(ctx, node);
            return {
                ok: true,
                node: compactNode(node, true),
                position,
                ...(warnings.length ? { warnings } : {}),
            };
        },
    },
    {
        name: 'update_node',
        description:
            'Change a node label (alias / input text / identifier name) and/or move it. Use set_script* tools for scripts and connect/disconnect for edges.',
        mutates: true,
        parameters: {
            type: 'object',
            properties: {
                node_id: nodeIdParam,
                label: { type: 'string' },
                position: {
                    type: 'object',
                    properties: { x: { type: 'number' }, y: { type: 'number' } },
                },
            },
            required: ['node_id'],
        },
        run: (args, ctx) => {
            const node = requireNode(ctx, stringArg(args, 'node_id'));
            const label = optionalString(args, 'label');
            const position = positionArg(args, 'position');
            if (label === undefined && !position) {
                throw new ToolError('Nothing to update: pass label and/or position.');
            }
            if (label !== undefined) {
                nodeData(node).label = label;
                if (node.type === 'inputType') {
                    const output = nodeOutputs(node)[0];
                    if (output) output.value = label;
                }
            }
            if (position) moveNode(ctx, node.id, position);
            return { ok: true, node: compactNode(node) };
        },
    },
    {
        name: 'remove_nodes',
        description: 'Delete nodes and all their connections.',
        mutates: true,
        parameters: {
            type: 'object',
            properties: { node_ids: { type: 'array', items: { type: 'string' } } },
            required: ['node_ids'],
        },
        run: (args, ctx) => {
            const ids = Array.isArray(args.node_ids) ? args.node_ids.map(String) : [];
            if (!ids.length) throw new ToolError('node_ids must be a non-empty array.');
            const existing = ids.filter(id => findGraphNode(ctx, id));
            const missing = ids.filter(id => !existing.includes(id));
            const removedEdges = existing.length ? deleteNodes(ctx, existing) : [];
            return {
                ok: existing.length > 0,
                removed_node_ids: existing,
                removed_edge_count: removedEdges.length,
                ...(missing.length ? { not_found: missing } : {}),
            };
        },
    },
    {
        name: 'connect',
        description:
            'Connect an output port to an input port. An input accepts one edge, so an existing edge on that input is replaced. Outputs may feed many inputs.',
        mutates: true,
        parameters: {
            type: 'object',
            properties: {
                source_node_id: nodeIdParam,
                source_port: portParam,
                target_node_id: nodeIdParam,
                target_port: portParam,
            },
            required: ['source_node_id', 'source_port', 'target_node_id', 'target_port'],
        },
        run: (args, ctx) => {
            const source = requireNode(ctx, stringArg(args, 'source_node_id'));
            const target = requireNode(ctx, stringArg(args, 'target_node_id'));
            if (source.id === target.id)
                throw new ToolError('A node cannot be connected to itself.');
            const sourcePort = resolvePort(source, 'output', stringArg(args, 'source_port'));
            const targetPort = resolvePort(target, 'input', stringArg(args, 'target_port'));

            const intoTarget = graphEdges(ctx).filter(
                edge =>
                    edge.target === target.id && handleOf(edge.targetHandle) === targetPort.index,
            );
            const existing = intoTarget.find(
                edge =>
                    edge.source === source.id && handleOf(edge.sourceHandle) === sourcePort.index,
            );
            if (existing) return { ok: true, edge_id: existing.id, note: 'Already connected.' };

            const replaced = intoTarget.map(edge => edge.id);
            deleteEdges(ctx, replaced);
            const edge = insertEdge(ctx, {
                source: source.id,
                sourceHandle: sourcePort.index,
                target: target.id,
                targetHandle: targetPort.index,
            });
            return {
                ok: true,
                edge_id: edge.id,
                from: `${nodeTitle(source)} out ${portLabel(sourcePort)}`,
                to: `${nodeTitle(target)} in ${portLabel(targetPort)}`,
                ...(replaced.length ? { replaced_edge_ids: replaced } : {}),
            };
        },
    },
    {
        name: 'disconnect',
        description:
            'Remove connections: by edge_id, or every edge matching source_node_id and/or target_node_id (+ optional target_port).',
        mutates: true,
        parameters: {
            type: 'object',
            properties: {
                edge_id: { type: 'string' },
                source_node_id: { type: 'string' },
                target_node_id: { type: 'string' },
                target_port: portParam,
            },
        },
        run: (args, ctx) => {
            const edgeId = optionalString(args, 'edge_id');
            let matches: Edge[];
            if (edgeId) {
                matches = graphEdges(ctx).filter(edge => edge.id === edgeId);
                if (!matches.length) {
                    throw new ToolError(`Edge '${edgeId}' not found. Use list_connections.`);
                }
            } else {
                const sourceId = optionalString(args, 'source_node_id');
                const targetId = optionalString(args, 'target_node_id');
                const targetPortRef = optionalString(args, 'target_port');
                if (!sourceId && !targetId) {
                    throw new ToolError('Pass edge_id, or source_node_id and/or target_node_id.');
                }
                if (targetPortRef !== undefined && !targetId) {
                    throw new ToolError('target_port requires target_node_id.');
                }
                const targetPort =
                    targetId && targetPortRef !== undefined
                        ? resolvePort(requireNode(ctx, targetId), 'input', targetPortRef).index
                        : undefined;
                matches = graphEdges(ctx).filter(
                    edge =>
                        (!sourceId || edge.source === sourceId) &&
                        (!targetId || edge.target === targetId) &&
                        (targetPort === undefined || handleOf(edge.targetHandle) === targetPort),
                );
            }
            if (!matches.length)
                return { ok: true, removed_edge_ids: [], note: 'No matching edge.' };
            deleteEdges(
                ctx,
                matches.map(edge => edge.id),
            );
            return { ok: true, removed_edge_ids: matches.map(edge => edge.id) };
        },
    },
    {
        name: 'set_script',
        description:
            'Replace the whole Kotlin source of a script node. Prefer edit_script for small changes. Returns static warnings.',
        mutates: true,
        parameters: {
            type: 'object',
            properties: {
                node_id: nodeIdParam,
                source: { type: 'string', description: 'Complete Kotlin script body.' },
            },
            required: ['node_id', 'source'],
        },
        run: (args, ctx) => {
            const node = requireScriptNode(ctx, stringArg(args, 'node_id'));
            if (typeof args.source !== 'string')
                throw new ToolError("Missing required argument 'source'.");
            setScriptSource(node, args.source);
            const warnings = scriptWarnings(node, args.source);
            return {
                ok: true,
                line_count: args.source.split('\n').length,
                ...(warnings.length ? { warnings } : {}),
            };
        },
    },
    {
        name: 'edit_script',
        description:
            'Edit part of a script by exact text replacement. old_text must match the current source exactly (whitespace included) and be unique unless replace_all is true.',
        mutates: true,
        parameters: {
            type: 'object',
            properties: {
                node_id: nodeIdParam,
                old_text: { type: 'string' },
                new_text: { type: 'string' },
                replace_all: { type: 'boolean' },
            },
            required: ['node_id', 'old_text', 'new_text'],
        },
        run: (args, ctx) => {
            const node = requireScriptNode(ctx, stringArg(args, 'node_id'));
            const oldText = args.old_text;
            const newText = args.new_text;
            if (typeof oldText !== 'string' || !oldText) {
                throw new ToolError("Missing required argument 'old_text'.");
            }
            if (typeof newText !== 'string')
                throw new ToolError("Missing required argument 'new_text'.");

            const source = (node.data as CodeNodeData).scriptSource ?? '';
            if (!source) throw new ToolError('The script is empty; use set_script.');
            const occurrences = source.split(oldText).length - 1;
            if (!occurrences) {
                throw new ToolError(
                    'old_text was not found. Re-read the script with get_script and copy the exact text.',
                );
            }
            if (occurrences > 1 && !args.replace_all) {
                throw new ToolError(
                    `old_text occurs ${occurrences} times; include more surrounding text or set replace_all.`,
                );
            }
            const next = args.replace_all
                ? source.split(oldText).join(newText)
                : source.replace(oldText, () => newText);
            setScriptSource(node, next);
            const warnings = scriptWarnings(node, next);
            return {
                ok: true,
                replacements: args.replace_all ? occurrences : 1,
                line_count: next.split('\n').length,
                ...(warnings.length ? { warnings } : {}),
            };
        },
    },
    {
        name: 'set_script_ports',
        description:
            'Define the input and/or output ports of a script node. Edges stay connected when a port with the same name still exists. Update the script if names change.',
        mutates: true,
        parameters: {
            type: 'object',
            properties: {
                node_id: nodeIdParam,
                inputs: scriptPortsParam,
                outputs: scriptPortsParam,
            },
            required: ['node_id'],
        },
        run: (args, ctx) => {
            const node = requireScriptNode(ctx, stringArg(args, 'node_id'));
            const inputs =
                args.inputs !== undefined ? parseScriptPorts(args.inputs, 'inputs') : undefined;
            const outputs =
                args.outputs !== undefined ? parseScriptPorts(args.outputs, 'outputs') : undefined;
            if (!inputs && !outputs) throw new ToolError('Pass inputs and/or outputs.');
            if (outputs && !outputs.length)
                throw new ToolError('A script node needs at least one output.');

            const edgeChanges = applyScriptPorts(ctx, node, inputs, outputs);
            const source = (node.data as CodeNodeData).scriptSource;
            const warnings = source ? scriptWarnings(node, source) : [];
            return {
                ok: true,
                inputs: nodeInputs(node).map(portLabel),
                outputs: nodeOutputs(node).map(portLabel),
                ...edgeChanges,
                ...(warnings.length ? { warnings } : {}),
            };
        },
    },
    {
        name: 'auto_layout',
        description:
            'Re-arrange all nodes left-to-right along the data flow. Only use when asked or after building larger structures.',
        mutates: true,
        parameters: { type: 'object', properties: {} },
        run: (_args, ctx) => {
            const elements = [
                ...graphNodes(ctx).map(node => ({
                    id: node.id,
                    type: node.type,
                    position: { ...node.position },
                    data: {},
                })),
                ...graphEdges(ctx).map(edge => ({
                    id: edge.id,
                    source: edge.source,
                    target: edge.target,
                })),
            ];
            const laidOut = ctx.parser.getLayoutedElements(elements as never, 'LR') ?? [];
            let moved = 0;
            laidOut.forEach(element => {
                if (!isNode(element)) return;
                moveNode(ctx, element.id, {
                    x: Math.round(element.position.x),
                    y: Math.round(element.position.y),
                });
                moved += 1;
            });
            fitGraphView();
            return { ok: true, moved_nodes: moved };
        },
    },
    {
        name: 'compile_scripts',
        description:
            'Compile all script nodes with the OpenBIMRL Engine (no model needed) and return per-node compiler messages. Requires a connected Engine API. Output is also written to the console.',
        parameters: { type: 'object', properties: {} },
        run: async (_args, ctx) => {
            const scriptCount = graphNodes(ctx).filter(isScriptNode).length;
            if (!scriptCount) return { ok: true, note: 'The graph has no script nodes.' };
            if (!(await engineIsConnected())) {
                throw new ToolError(
                    'The OpenBIMRL Engine API is not connected (Settings → API Connection), so scripts cannot be compiled.',
                );
            }

            const graph = captureGraph(ctx);
            const xml = ctx.parser.build(
                graph.elements,
                graph.subChecks,
                graph.resultSets,
                'graph.openbimrl',
            );
            const time = () => new Date().toLocaleTimeString();
            appendConsole(`[${time()}] Compiling scripts via Engine API (AI assistant)...\n`);
            const result = await compileScripts(xml);
            if (result.console?.length) appendConsole(result.console.join('\n') + '\n');
            const failed = result.reports.filter(report => !report.ok).length;
            appendConsole(
                `[${time()}] ${
                    failed === 0
                        ? `Scripts compiled OK (${result.reports.length})`
                        : `Script compile found ${failed} issue(s)`
                }\n\n`,
            );
            return {
                ok: failed === 0,
                reports: result.reports.map(report => ({
                    node_id: report.nodeId,
                    script: report.scriptName,
                    ok: report.ok,
                    messages: report.reports.slice(0, 15),
                })),
            };
        },
    },
];

const TOOLS_BY_NAME = new Map(TOOL_SPECS.map(spec => [spec.name, spec]));

export const aiToolDefinitions: AiToolDefinition[] = TOOL_SPECS.map(spec => ({
    type: 'function',
    function: { name: spec.name, description: spec.description, parameters: spec.parameters },
}));

export function isMutatingTool(name: string): boolean {
    return Boolean(TOOLS_BY_NAME.get(name)?.mutates);
}

export async function executeAiTool(
    name: string,
    rawArgs: string | ToolArgs | undefined,
    ctx: EditorContext,
): Promise<AiToolOutcome> {
    const spec = TOOLS_BY_NAME.get(name);
    if (!spec) {
        return {
            ok: false,
            mutates: false,
            result: {
                error: `Unknown tool '${name}'. Available: ${[...TOOLS_BY_NAME.keys()].join(
                    ', ',
                )}.`,
            },
        };
    }

    let args: ToolArgs;
    try {
        const parsed =
            typeof rawArgs === 'string' ? (rawArgs.trim() ? JSON.parse(rawArgs) : {}) : rawArgs;
        if (
            parsed !== undefined &&
            (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
        ) {
            throw new Error('not an object');
        }
        args = (parsed ?? {}) as ToolArgs;
    } catch {
        return { ok: false, mutates: false, result: { error: 'Arguments must be a JSON object.' } };
    }

    try {
        const result = await spec.run(args, ctx);
        if (spec.mutates) await settleGraph();
        return { ok: true, mutates: Boolean(spec.mutates), result };
    } catch (error) {
        if (spec.mutates) await settleGraph();
        if (!(error instanceof ToolError)) console.error(error);
        const message =
            error instanceof ToolError
                ? error.message
                : `Tool failed: ${(error as Error)?.message ?? String(error)}`;
        return { ok: false, mutates: false, result: { error: message } };
    }
}

/** Plain-text tool catalogue for the JSON-protocol fallback (no native tool calling). */
export function describeToolsForPrompt(): string {
    return TOOL_SPECS.map(spec => {
        const properties = (spec.parameters.properties ?? {}) as Record<string, { type?: string }>;
        const required = new Set((spec.parameters.required as string[] | undefined) ?? []);
        const params = Object.entries(properties)
            .map(
                ([key, schema]) => `${key}${required.has(key) ? '' : '?'}: ${schema.type ?? 'any'}`,
            )
            .join(', ');
        return `- ${spec.name}(${params}): ${spec.description}`;
    }).join('\n');
}
