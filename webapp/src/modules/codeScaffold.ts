/** Allowed mapper type names for Code nodes (mirrors Engine ScriptTypeCatalog). */
export const SCRIPT_TYPE_OPTIONS = [
    'Any',
    'String',
    'Double',
    'Boolean',
    'Point3d',
    'Vector3d',
    'Straight',
    'Plane',
    'Collection',
] as const;

export type ScriptTypeName = (typeof SCRIPT_TYPE_OPTIONS)[number];

export interface CodePort {
    index: string;
    name: string;
    typeHint?: string;
    collectionType?: string;
    value?: string;
}

const KOTLIN_IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function isValidKotlinIdentifier(name: string): boolean {
    return KOTLIN_IDENT.test(name);
}

export function validatePortName(name: string): string | null {
    if (!name.trim()) return 'Name is required';
    if (!KOTLIN_IDENT.test(name)) return 'Must be a valid Kotlin identifier';
    return null;
}

export function generateCodeScaffold(inputs: CodePort[], outputs: CodePort[]): string {
    const inputLines =
        inputs.length === 0
            ? ' *   (none — add inputs in the mapper)'
            : inputs
                  .map(p => {
                      const t = p.typeHint || 'Any';
                      const coll = p.collectionType ? `Collection<${p.collectionType}>` : t;
                      return ` *   ${p.name}: ${coll}?`;
                  })
                  .join('\n');

    const primaryOut = outputs[0]?.name || 'result';
    const otherOuts = outputs
        .slice(1)
        .map(o => `// ${o.name} = null`)
        .join('\n');

    return `/**
 * OpenBimRL Code node
 *
 * Inputs (from mapper — also injected as bindings):
${inputLines}
 *
 * Template imports:
 *   javax.vecmath.Point3d, Vector3d
 *   de.rub.bi.inf.openbimrl.utils.math.Straight, Plane
 *
 * Usage:
 *   - Read inputs by name (see mapper).
 *   - Assign each output variable before the script ends.
 *   - Prefer pure transforms; IFC access stays in upstream ifc.* nodes.
 */

// Example:
// val moved = test?.let { Point3d(it.x, it.y + 1.0, it.z) }

${otherOuts ? otherOuts + '\n' : ''}${primaryOut} = null
`;
}
