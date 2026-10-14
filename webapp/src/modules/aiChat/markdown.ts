/**
 * Minimal Markdown tokenizer for chat answers. Produces plain tokens that templates render
 * as text, so model output is never injected as HTML.
 */

export interface MarkdownInline {
    kind: 'text' | 'code' | 'strong' | 'em';
    text: string;
}

export type MarkdownBlock =
    | { kind: 'paragraph'; lines: MarkdownInline[][] }
    | { kind: 'heading'; level: number; inline: MarkdownInline[] }
    | { kind: 'list'; ordered: boolean; items: MarkdownInline[][] }
    | { kind: 'code'; language: string; text: string };

const INLINE_PATTERN = /(`[^`]+`)|(\*\*[^*]+\*\*|__[^_]+__)|(\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;
const FENCE_PATTERN = /^\s*```\s*([\w+#.-]*)\s*$/;
const HEADING_PATTERN = /^(#{1,6})\s+(.*)$/;
const UNORDERED_PATTERN = /^\s*[-*+]\s+(.*)$/;
const ORDERED_PATTERN = /^\s*\d+[.)]\s+(.*)$/;

export function parseInlineMarkdown(text: string): MarkdownInline[] {
    const tokens: MarkdownInline[] = [];
    let last = 0;
    for (const match of text.matchAll(INLINE_PATTERN)) {
        const index = match.index ?? 0;
        if (index > last) tokens.push({ kind: 'text', text: text.slice(last, index) });
        const [token] = match;
        if (match[1]) tokens.push({ kind: 'code', text: token.slice(1, -1) });
        else if (match[2]) tokens.push({ kind: 'strong', text: token.slice(2, -2) });
        else tokens.push({ kind: 'em', text: token.slice(1, -1) });
        last = index + token.length;
    }
    if (last < text.length) tokens.push({ kind: 'text', text: text.slice(last) });
    return tokens;
}

export function parseMarkdown(source: string): MarkdownBlock[] {
    const blocks: MarkdownBlock[] = [];
    const lines = source.replace(/\r\n?/g, '\n').split('\n');
    let paragraph: MarkdownInline[][] = [];
    let list: { ordered: boolean; items: MarkdownInline[][] } | null = null;

    const flush = () => {
        if (paragraph.length) blocks.push({ kind: 'paragraph', lines: paragraph });
        if (list) blocks.push({ kind: 'list', ...list });
        paragraph = [];
        list = null;
    };

    for (let index = 0; index < lines.length; index++) {
        const line = lines[index];

        const fence = line.match(FENCE_PATTERN);
        if (fence) {
            flush();
            const code: string[] = [];
            index++;
            while (index < lines.length && !FENCE_PATTERN.test(lines[index])) {
                code.push(lines[index]);
                index++;
            }
            blocks.push({ kind: 'code', language: fence[1] ?? '', text: code.join('\n') });
            continue;
        }

        if (!line.trim()) {
            flush();
            continue;
        }

        const heading = line.match(HEADING_PATTERN);
        if (heading) {
            flush();
            blocks.push({
                kind: 'heading',
                level: heading[1].length,
                inline: parseInlineMarkdown(heading[2]),
            });
            continue;
        }

        const unordered = line.match(UNORDERED_PATTERN);
        const ordered = unordered ? null : line.match(ORDERED_PATTERN);
        const item = unordered ?? ordered;
        if (item) {
            const isOrdered = Boolean(ordered);
            if (paragraph.length || (list && list.ordered !== isOrdered)) flush();
            list ??= { ordered: isOrdered, items: [] };
            list.items.push(parseInlineMarkdown(item[1]));
            continue;
        }

        if (list) {
            // Indented continuation of the previous list item.
            if (/^\s{2,}/.test(line)) {
                list.items[list.items.length - 1].push(
                    { kind: 'text', text: ' ' },
                    ...parseInlineMarkdown(line.trim()),
                );
                continue;
            }
            flush();
        }
        paragraph.push(parseInlineMarkdown(line));
    }

    flush();
    return blocks;
}
