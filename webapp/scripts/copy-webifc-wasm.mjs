import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'public', 'web-ifc');
const wasmSource = join(root, 'node_modules', 'web-ifc', 'web-ifc.wasm');

if (!existsSync(wasmSource)) {
    console.warn('[copy-webifc-wasm] web-ifc.wasm not found, skipping');
    process.exit(0);
}

mkdirSync(publicDir, { recursive: true });
copyFileSync(wasmSource, join(publicDir, 'web-ifc.wasm'));
console.log('[copy-webifc-wasm] copied web-ifc.wasm to public/web-ifc/');
