declare module 'monaco-editor/esm/vs/basic-languages/kotlin/kotlin.js' {
    import type { languages } from 'monaco-editor';

    export const conf: languages.LanguageConfiguration;
    export const language: languages.IMonarchLanguage & {
        keywords: string[];
        tokenizer: {
            [name: string]: languages.IMonarchLanguageRule[];
        };
    };
}
