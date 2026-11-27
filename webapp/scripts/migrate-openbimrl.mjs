#!/usr/bin/env node
/**
 * Migrate legacy OpenBimRL documents (bare <BIMRule schemaVersion="0.1">)
 * to the current wrapper (<openBIMRLType version="2026.3.1">).
 *
 * Usage:
 *   node scripts/migrate-openbimrl.mjs --in-place file.openbimrl [more files or directories]
 *   node scripts/migrate-openbimrl.mjs file.openbimrl          # print migrated XML
 */

import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';

export const CURRENT_SCHEMA_VERSION = '2026.3.1';
const NAMESPACE = 'http://inf.bi.rub.de/OpenBimRL';
const NEW_ROOTS = new Set(['openBIMRLType', 'OpenBIMRL']);

const DROPPED_ATTRS = new Set(['schemaVersion', 'xmlns:xsi', 'xsi:schemaLocation']);

export function migrateOpenBimRL(xml, options = {}) {
    const source = String(xml).replace(/^\uFEFF/, '');
    const root = rootElementName(source);
    if (!root) {
        throw new Error('No XML root element found.');
    }
    if (NEW_ROOTS.has(root)) {
        return { xml: source, changed: false, version: attributeValue(source, root, 'version') };
    }
    if (root !== 'BIMRule') {
        throw new Error(`Unrecognized OpenBimRL root <${root}>. Expected BIMRule, OpenBIMRL, or openBIMRLType.`);
    }

    const open = source.match(/<BIMRule\b([^>]*)>/);
    if (!open) {
        throw new Error('Could not read the BIMRule start tag.');
    }
    const closeAt = source.lastIndexOf('</BIMRule>');
    if (closeAt < 0) {
        throw new Error('Could not find </BIMRule>.');
    }
    const openEnd = open.index + open[0].length;
    const inner = source.slice(openEnd, closeAt);
    const attrs = parseAttributes(open[1]);

    for (const key of DROPPED_ATTRS) {
        delete attrs[key];
    }
    if (attrs.xmlns === NAMESPACE) {
        delete attrs.xmlns;
    }
    if (!attrs.name) {
        attrs.name =
            options.name ||
            attributeValue(inner, 'ModelCheck', 'name') ||
            options.fallbackName ||
            'rule';
    }

    let body = inner.replace(/\s+$/, '');
    const existingUuid = body.match(/<uuid>\s*([0-9a-fA-F-]{36})\s*<\/uuid>/);
    const uuid = existingUuid ? existingUuid[1] : options.uuid || randomUUID();
    if (!existingUuid) {
        body = `${body}\n<uuid>${uuid}</uuid>`;
    }

    const attrText = formatAttributes(attrs);
    const migrated =
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
        `<openBIMRLType version="${CURRENT_SCHEMA_VERSION}" xmlns="${NAMESPACE}">\n` +
        `<BIMRule${attrText ? ' ' + attrText : ''}>\n` +
        `${body}\n` +
        `</BIMRule>\n` +
        `</openBIMRLType>\n`;

    return { xml: migrated, changed: true, version: CURRENT_SCHEMA_VERSION, uuid };
}

export function migratePath(filePath, options = {}) {
    const xml = readFileSync(filePath, 'utf8');
    const fallbackName = basename(filePath, extname(filePath));
    return migrateOpenBimRL(xml, { fallbackName, ...options });
}

function rootElementName(xml) {
    const match = xml.match(/<(?![\?!])([A-Za-z_][\w:.-]*)\b/);
    return match ? match[1] : null;
}

function attributeValue(xml, element, attribute) {
    const match = xml.match(new RegExp(`<${element}\\b([^>]*)>`));
    if (!match) return undefined;
    return parseAttributes(match[1])[attribute];
}

function parseAttributes(text) {
    const attrs = {};
    const re = /([\w:.-]+)\s*=\s*"([^"]*)"/g;
    let match;
    while ((match = re.exec(text))) {
        attrs[match[1]] = match[2];
    }
    return attrs;
}

function formatAttributes(attrs) {
    const ordered = [];
    if (attrs.name !== undefined) ordered.push(['name', attrs.name]);
    for (const [key, value] of Object.entries(attrs)) {
        if (key !== 'name') ordered.push([key, value]);
    }
    return ordered.map(([key, value]) => `${key}="${escapeAttr(value)}"`).join(' ');
}

function escapeAttr(value) {
    return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function collectFiles(paths) {
    const files = [];
    for (const target of paths) {
        const info = statSync(target);
        if (info.isDirectory()) {
            for (const entry of readdirSync(target)) {
                if (entry.endsWith('.openbimrl') || entry.endsWith('.xml')) {
                    files.push(join(target, entry));
                }
            }
        } else {
            files.push(target);
        }
    }
    return files;
}

function main(argv) {
    const args = argv.slice(2);
    const inPlace = args.includes('--in-place');
    const paths = args.filter(arg => arg !== '--in-place');
    if (paths.length === 0) {
        console.error('Usage: node scripts/migrate-openbimrl.mjs [--in-place] <file-or-directory>...');
        process.exit(1);
    }
    const files = collectFiles(paths);
    let changed = 0;
    for (const file of files) {
        const result = migratePath(file);
        if (!inPlace && files.length === 1) {
            process.stdout.write(result.xml);
            continue;
        }
        if (result.changed) {
            writeFileSync(file, result.xml);
            changed += 1;
            console.log(`migrated ${file}`);
        } else {
            console.log(`unchanged ${file}`);
        }
    }
    if (inPlace || files.length !== 1) {
        console.log(`${changed} file(s) migrated, ${files.length - changed} unchanged.`);
    }
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith('migrate-openbimrl.mjs');
if (invokedDirectly) {
    main(process.argv);
}
