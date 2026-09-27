import { isValidKotlinIdentifier } from '@/modules/codeScaffold';
import type { editor, languages } from 'monaco-editor';
import {
    conf as kotlinConf,
    language as kotlinLanguage,
} from 'monaco-editor/esm/vs/basic-languages/kotlin/kotlin.js';

/**
 * Kotlin Monarch grammar extended with OpenBimRL Code-node ports.
 * Input identifiers are `openbimrl.input`; outputs are `openbimrl.output`.
 * Other identifiers keep the stock keyword / type / identifier colors.
 * Comments stay comments, because `/` never starts an identifier rule.
 */

export const KOTLIN_PORT_COLORS = {
    light: { input: 'C2410C', output: '15803D' },
    dark: { input: 'FB923C', output: '4ADE80' },
} as const;

const THEME_LIGHT = 'openbimrl-light';
const THEME_DARK = 'openbimrl-dark';

type Monaco = typeof import('monaco-editor');

let themesReady = false;
let languageReady = false;
let tokensProvider: { dispose(): void } | null = null;
let monacoPromise: Promise<Monaco> | null = null;

export function loadMonaco(): Promise<Monaco> {
    monacoPromise ??= import('monaco-editor');
    return monacoPromise;
}

export function kotlinEditorTheme(dark: boolean): string {
    return dark ? THEME_DARK : THEME_LIGHT;
}

export function kotlinPortColor(kind: 'input' | 'output', dark: boolean): string {
    const hex = dark ? KOTLIN_PORT_COLORS.dark[kind] : KOTLIN_PORT_COLORS.light[kind];
    return `#${hex}`;
}

export function installKotlinPortHighlighting(
    monaco: Monaco,
    inputNames: readonly string[],
    outputNames: readonly string[],
): void {
    ensureKotlinLanguage(monaco);
    ensureKotlinPortThemes(monaco);
    tokensProvider?.dispose();
    tokensProvider = monaco.languages.setMonarchTokensProvider(
        'kotlin',
        buildKotlinPortLanguage(inputNames, outputNames),
    );
}

export function ensureKotlinPortThemes(monaco: Monaco): void {
    if (themesReady) return;
    const theme = (
        base: editor.BuiltinTheme,
        input: string,
        output: string,
    ): editor.IStandaloneThemeData => ({
        base,
        inherit: true,
        rules: [
            { token: 'openbimrl.input', foreground: input, fontStyle: 'bold' },
            { token: 'openbimrl.output', foreground: output, fontStyle: 'bold underline' },
        ],
        colors: {},
    });
    monaco.editor.defineTheme(
        THEME_LIGHT,
        theme('vs', KOTLIN_PORT_COLORS.light.input, KOTLIN_PORT_COLORS.light.output),
    );
    monaco.editor.defineTheme(
        THEME_DARK,
        theme('vs-dark', KOTLIN_PORT_COLORS.dark.input, KOTLIN_PORT_COLORS.dark.output),
    );
    themesReady = true;
}

function ensureKotlinLanguage(monaco: Monaco): void {
    if (languageReady) return;
    const registered = monaco.languages.getLanguages().some(lang => lang.id === 'kotlin');
    if (!registered) {
        monaco.languages.register({
            id: 'kotlin',
            extensions: ['.kt', '.kts'],
            aliases: ['Kotlin', 'kotlin'],
            mimetypes: ['text/x-kotlin-source', 'text/x-kotlin'],
        });
    }
    monaco.languages.setLanguageConfiguration('kotlin', kotlinConf);
    languageReady = true;
}

/** Exported for tokenization checks. */
export function buildKotlinPortLanguage(
    inputNames: readonly string[],
    outputNames: readonly string[],
): languages.IMonarchLanguage {
    const inputs = uniqueIdentifiers(inputNames);
    const inputSet = new Set(inputs);
    const outputs = uniqueIdentifiers(outputNames).filter(name => !inputSet.has(name));

    const tokenizer: languages.IMonarchLanguage['tokenizer'] = {};
    for (const state of Object.keys(kotlinLanguage.tokenizer)) {
        tokenizer[state] = kotlinLanguage.tokenizer[state].slice();
    }

    tokenizer.root = withPortIdentifiers(tokenizer.root);
    tokenizer.string = highlightStringTemplates(tokenizer.string, inputs, outputs);
    tokenizer.multistring = highlightStringTemplates(tokenizer.multistring, inputs, outputs);

    return {
        ...kotlinLanguage,
        inputs,
        outputs,
        tokenizer,
    };
}

function withPortIdentifiers(
    root: languages.IMonarchLanguageRule[],
): languages.IMonarchLanguageRule[] {
    const rules = root.slice();
    const upperIdx = rules.findIndex(
        rule => regexMatches(rule, 'Point3d') && !regexMatches(rule, 'point'),
    );
    if (upperIdx >= 0) rules.splice(upperIdx, 1);

    const identIdx = rules.findIndex(
        rule => regexMatches(rule, 'point') && regexMatches(rule, 'Point3d'),
    );
    const portRule: languages.IMonarchLanguageRule = [
        /[a-zA-Z_$][\w$]*/,
        {
            cases: {
                '@inputs': 'openbimrl.input',
                '@outputs': 'openbimrl.output',
                '@keywords': { token: 'keyword.$0' },
                '~[A-Z].*': 'type.identifier',
                '@default': 'identifier',
            },
        },
    ];
    if (identIdx >= 0) rules[identIdx] = portRule;
    else rules.unshift(portRule);
    return rules;
}

function regexMatches(rule: languages.IMonarchLanguageRule, sample: string): boolean {
    if (!Array.isArray(rule) || !(rule[0] instanceof RegExp)) return false;
    const re = new RegExp(rule[0].source, rule[0].flags.replace('g', ''));
    return re.test(sample);
}

function highlightStringTemplates(
    rules: languages.IMonarchLanguageRule[],
    inputs: readonly string[],
    outputs: readonly string[],
): languages.IMonarchLanguageRule[] {
    const contentSource = /[^\\"]+/.source;
    const mapped = rules.map(rule => {
        if (
            !Array.isArray(rule) ||
            !(rule[0] instanceof RegExp) ||
            rule[0].source !== contentSource
        ) {
            return rule;
        }
        // Stop before `$` so `$name` / `${name}` can be matched as their own tokens.
        return [/[^\\"$]+/, rule[1]] as languages.IMonarchLanguageRule;
    });
    return [...stringTemplateRules(inputs, outputs), [/\$/, 'string'], ...mapped];
}

function stringTemplateRules(
    inputs: readonly string[],
    outputs: readonly string[],
): languages.IMonarchLanguageRule[] {
    const rules: languages.IMonarchLanguageRule[] = [];
    const push = (names: readonly string[], token: string) => {
        if (names.length === 0) return;
        const alt = names
            .slice()
            .sort((a, b) => b.length - a.length)
            .map(escapeRegExp)
            .join('|');
        rules.push([new RegExp(`\\$(?:${alt})(?![A-Za-z0-9_])`), token]);
        rules.push([new RegExp(`\\$\\{(?:${alt})\\}`), token]);
    };
    push(inputs, 'openbimrl.input');
    push(outputs, 'openbimrl.output');
    return rules;
}

function uniqueIdentifiers(names: readonly string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const raw of names) {
        const name = raw.trim();
        if (!isValidKotlinIdentifier(name) || seen.has(name)) continue;
        seen.add(name);
        result.push(name);
    }
    return result;
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
