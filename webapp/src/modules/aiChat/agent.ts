import { AiApiError, AiChatMessage, AiToolCall, createChatCompletion } from './client';
import type { EditorContext } from './graphOps';
import type { AiToolMode } from './settings';
import { AI_SYSTEM_PROMPT, jsonToolProtocolPrompt } from './systemPrompt';
import { aiToolDefinitions, executeAiTool, isMutatingTool } from './tools';

/** Upper bound of model round trips per prompt. */
export const MAX_AGENT_STEPS = 16;
const MAX_TOOL_RESULT_CHARS = 12_000;

export interface AgentToolEvent {
    id: string;
    name: string;
    args: string;
    status: 'running' | 'ok' | 'error';
    mutates: boolean;
    error?: string;
}

export interface AgentCallbacks {
    onStatus?: (text: string) => void;
    onToolStart?: (event: AgentToolEvent) => void;
    onToolEnd?: (event: AgentToolEvent) => void;
    onNotice?: (text: string) => void;
}

export interface AgentRunOptions {
    /** Previous turns (user/assistant only); tool traffic of earlier prompts is not resent. */
    history: AiChatMessage[];
    prompt: string;
    ctx: EditorContext;
    toolMode: AiToolMode;
    signal: AbortSignal;
    callbacks: AgentCallbacks;
}

export interface AgentRunResult {
    content: string;
    toolMode: AiToolMode;
    stepLimitReached: boolean;
}

interface JsonToolCall {
    name: string;
    arguments: unknown;
}

const STEP_LIMIT_MESSAGE =
    'Step limit reached. Do not call more tools. Summarize briefly what you changed and what is still open.';

function throwIfAborted(signal: AbortSignal) {
    if (signal.aborted) throw new DOMException('Request stopped', 'AbortError');
}

function normalizeToolCalls(calls: AiToolCall[], step: number): AiToolCall[] {
    return calls.map((call, index) => {
        const args = call.function?.arguments as unknown;
        return {
            id: call.id || `call_${step}_${index}`,
            type: 'function',
            function: {
                name: call.function?.name ?? '',
                arguments: typeof args === 'string' ? args : JSON.stringify(args ?? {}),
            },
        };
    });
}

/** Extracts `{"tool_calls": [...]}` from a JSON-protocol reply; null means final answer. */
function parseJsonToolCalls(content: string): JsonToolCall[] | null {
    let text = content.trim();
    const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)```$/);
    if (fenced) text = fenced[1].trim();
    if (!text.startsWith('{')) {
        const start = text.indexOf('{"tool_calls"');
        if (start < 0) return null;
        text = text.slice(start);
    }
    text = text.slice(0, text.lastIndexOf('}') + 1);
    try {
        const parsed = JSON.parse(text) as { tool_calls?: unknown };
        if (!Array.isArray(parsed.tool_calls)) return null;
        const calls = parsed.tool_calls
            .filter(
                (call): call is JsonToolCall =>
                    typeof call === 'object' && call !== null && typeof call.name === 'string',
            )
            .map(call => ({ name: call.name, arguments: call.arguments ?? {} }));
        return calls.length ? calls : null;
    } catch {
        return null;
    }
}

async function runToolCall(
    options: AgentRunOptions,
    id: string,
    name: string,
    rawArgs: string | Record<string, unknown>,
): Promise<string> {
    throwIfAborted(options.signal);
    const args = typeof rawArgs === 'string' ? rawArgs : JSON.stringify(rawArgs);
    const event: AgentToolEvent = {
        id,
        name,
        args,
        status: 'running',
        mutates: isMutatingTool(name),
    };
    options.callbacks.onToolStart?.(event);
    options.callbacks.onStatus?.(`Running ${name}…`);

    const outcome = await executeAiTool(name, rawArgs, options.ctx);
    let text = JSON.stringify(outcome.result) ?? 'null';
    if (text.length > MAX_TOOL_RESULT_CHARS) {
        text = `${text.slice(0, MAX_TOOL_RESULT_CHARS)} …[truncated, request less data]`;
    }
    options.callbacks.onToolEnd?.({
        ...event,
        status: outcome.ok ? 'ok' : 'error',
        mutates: event.mutates && outcome.ok,
        error: outcome.ok ? undefined : (outcome.result as { error?: string })?.error,
    });
    return text;
}

async function runNativeLoop(options: AgentRunOptions): Promise<AgentRunResult> {
    const messages: AiChatMessage[] = [
        { role: 'system', content: AI_SYSTEM_PROMPT },
        ...options.history,
        { role: 'user', content: options.prompt },
    ];

    for (let step = 0; step < MAX_AGENT_STEPS; step++) {
        throwIfAborted(options.signal);
        options.callbacks.onStatus?.(step === 0 ? 'Thinking…' : 'Reviewing tool results…');
        const completion = await createChatCompletion({
            messages,
            tools: aiToolDefinitions,
            signal: options.signal,
        });

        if (!completion.toolCalls.length) {
            return {
                content: completion.content?.trim() || '_The model returned an empty answer._',
                toolMode: 'native',
                stepLimitReached: false,
            };
        }

        const toolCalls = normalizeToolCalls(completion.toolCalls, step);
        messages.push({
            role: 'assistant',
            content: completion.content ?? null,
            tool_calls: toolCalls,
        });
        for (const call of toolCalls) {
            const content = await runToolCall(
                options,
                call.id,
                call.function.name,
                call.function.arguments,
            );
            messages.push({ role: 'tool', tool_call_id: call.id, content });
        }
    }

    options.callbacks.onStatus?.('Summarizing…');
    messages.push({ role: 'user', content: STEP_LIMIT_MESSAGE });
    const final = await createChatCompletion({
        messages,
        tools: aiToolDefinitions,
        toolChoice: 'none',
        signal: options.signal,
    });
    return {
        content: final.content?.trim() || '_Stopped after reaching the step limit._',
        toolMode: 'native',
        stepLimitReached: true,
    };
}

async function runJsonLoop(options: AgentRunOptions): Promise<AgentRunResult> {
    const messages: AiChatMessage[] = [
        { role: 'system', content: AI_SYSTEM_PROMPT + jsonToolProtocolPrompt() },
        ...options.history,
        { role: 'user', content: options.prompt },
    ];

    for (let step = 0; step < MAX_AGENT_STEPS; step++) {
        throwIfAborted(options.signal);
        options.callbacks.onStatus?.(step === 0 ? 'Thinking…' : 'Reviewing tool results…');
        const completion = await createChatCompletion({ messages, signal: options.signal });
        const content = completion.content ?? '';
        const calls = parseJsonToolCalls(content);
        if (!calls) {
            return {
                content: content.trim() || '_The model returned an empty answer._',
                toolMode: 'json',
                stepLimitReached: false,
            };
        }

        messages.push({ role: 'assistant', content });
        const results: string[] = [];
        for (const [index, call] of calls.entries()) {
            const text = await runToolCall(
                options,
                `json_${step}_${index}`,
                call.name,
                (call.arguments ?? {}) as Record<string, unknown>,
            );
            results.push(`${call.name}: ${text}`);
        }
        messages.push({ role: 'user', content: `TOOL RESULTS\n${results.join('\n')}` });
    }

    options.callbacks.onStatus?.('Summarizing…');
    messages.push({ role: 'user', content: STEP_LIMIT_MESSAGE });
    const final = await createChatCompletion({ messages, signal: options.signal });
    return {
        content: final.content?.trim() || '_Stopped after reaching the step limit._',
        toolMode: 'json',
        stepLimitReached: true,
    };
}

/** Runs one prompt: model ↔ tool round trips until the model answers without tool calls. */
export async function runAgent(options: AgentRunOptions): Promise<AgentRunResult> {
    if (options.toolMode === 'json') return runJsonLoop(options);

    let toolsUsed = false;
    const trackingOptions: AgentRunOptions = {
        ...options,
        callbacks: {
            ...options.callbacks,
            onToolStart: event => {
                toolsUsed = true;
                options.callbacks.onToolStart?.(event);
            },
        },
    };
    try {
        return await runNativeLoop(trackingOptions);
    } catch (error) {
        if (!(error instanceof AiApiError) || !error.isToolSupportError || toolsUsed) throw error;
        options.callbacks.onNotice?.(
            'This model rejected native tool calling, so the JSON tool protocol is used instead. You can set this permanently in Settings → AI Chatbot.',
        );
        return runJsonLoop(options);
    }
}
