import { ref } from 'vue';
import * as THREE from 'three';
import { getWorld } from './ifcViewer';

interface Point3d {
    x: number;
    y: number;
    z: number;
}

export interface VisualData {
    [key: string]: Array<{
        BoundingSphere?: {
            center: Point3d;
            radius: number;
        };
        BoundingBox?: {
            lower: Point3d;
            upper: Point3d;
        };
        Map?: {
            color?: number | string;
        };
    }>;
}

const items = [] as Array<THREE.Mesh>;
let pendingVisuals: VisualData | null = null;
export const hasCheckVisuals = ref(false);

function clearVisualMeshes(world: NonNullable<ReturnType<typeof getWorld>>) {
    if (!items.length) return;
    world.scene.three.remove(...items);
    items.splice(0, items.length);
}

function applyVisuals(data: VisualData | null) {
    const world = getWorld();
    if (!world) return;

    clearVisualMeshes(world);
    if (!data) return;

    Object.values(data).forEach(element => {
        element.forEach(visual => {
            let geometry: THREE.BufferGeometry | undefined;
            let color: string | undefined;
            let pos: Point3d | undefined;
            let wireframe = false;

            Object.keys(visual).forEach(key => {
                if (key === 'BoundingSphere') {
                    const definition = visual.BoundingSphere!;
                    geometry = new THREE.SphereGeometry(definition.radius);
                    pos = definition.center;
                } else if (key === 'BoundingBox') {
                    const definition = visual.BoundingBox!;
                    const w = Math.abs(definition.upper.x - definition.lower.x);
                    const h = Math.abs(definition.upper.y - definition.lower.y);
                    const d = Math.abs(definition.upper.z - definition.lower.z);
                    geometry = new THREE.BoxGeometry(w, h, d);
                    wireframe = true;
                    pos = {
                        x: definition.lower.x + w * 0.5,
                        y: definition.lower.y + h * 0.5,
                        z: definition.lower.z + d * 0.5,
                    };
                } else if (key === 'Map') {
                    const definition = visual.Map!;
                    if (definition.color === undefined) return;
                    if (typeof definition.color === 'number') {
                        color = '#' + (definition.color as number).toString(16);
                    } else {
                        color = definition.color as string;
                    }
                }
            });

            if (geometry === undefined) return;
            color ??= '#FFFFFF';
            pos ??= { x: 0, y: 0, z: 0 };

            const material = new THREE.MeshBasicMaterial({
                color,
                wireframe,
                transparent: wireframe,
                opacity: wireframe ? 0.95 : 1,
                depthTest: false,
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.renderOrder = 999;
            mesh.position.set(pos.x, pos.y, -pos.z);
            items.push(mesh);
        });
    });

    world.scene.three.add(...items);
}

/** Store check visuals and apply them when the IFC viewer scene is available. */
export function updateVisuals(data: VisualData | null) {
    pendingVisuals = data;
    hasCheckVisuals.value =
        data !== null && Object.values(data).some(entries => entries.length > 0);
    applyVisuals(data);
}

/** Re-apply the last check visuals after the viewer initializes. */
export function refreshVisuals() {
    applyVisuals(pendingVisuals);
}

/** Remove all overlays produced by the latest check. */
export function clearVisuals() {
    pendingVisuals = null;
    hasCheckVisuals.value = false;
    const world = getWorld();
    if (world) clearVisualMeshes(world);
}
