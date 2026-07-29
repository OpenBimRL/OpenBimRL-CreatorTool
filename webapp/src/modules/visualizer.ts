import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ref } from 'vue';
import { getAlignmentGroup, getWorld } from './ifcViewer';

let visualGroup: THREE.Group | null = null;
let pendingGlb: Uint8Array | null = null;
export const hasCheckVisuals = ref(false);
export const checkVisualsVisible = ref(false);

function clearVisualMeshes(_world?: NonNullable<ReturnType<typeof getWorld>>) {
    if (visualGroup) {
        visualGroup.removeFromParent();
        visualGroup.traverse(child => {
            if (
                child instanceof THREE.Mesh ||
                child instanceof THREE.LineSegments ||
                child instanceof THREE.Line
            ) {
                child.geometry.dispose();
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach(material => material.dispose());
            }
        });
        visualGroup = null;
    }
}

function applyGlbMaterialOverrides(root: THREE.Object3D) {
    root.traverse(child => {
        child.renderOrder = 999;
        if (child instanceof THREE.InstancedMesh) {
            const oldMaterial = child.material;
            child.material = new THREE.MeshBasicMaterial({ depthTest: false });
            disposeMaterial(oldMaterial);
        } else if (child instanceof THREE.Mesh) {
            const hasVertexColors = Boolean(child.geometry.attributes.color);
            const oldMaterial = child.material;
            child.material = new THREE.MeshBasicMaterial({
                vertexColors: hasVertexColors,
                depthTest: false,
            });
            disposeMaterial(oldMaterial);
        } else if (child instanceof THREE.LineSegments || child instanceof THREE.Line) {
            const oldMaterial = child.material;
            child.material = new THREE.LineBasicMaterial({
                color: 0xff8800,
                depthTest: false,
            });
            disposeMaterial(oldMaterial);
        }
    });
}

function disposeMaterial(material: THREE.Material | THREE.Material[]) {
    if (Array.isArray(material)) {
        material.forEach(entry => entry.dispose());
    } else {
        material.dispose();
    }
}

function applyGlb(glb: Uint8Array) {
    const world = getWorld();
    if (!world) return;

    clearVisualMeshes(world);

    const loader = new GLTFLoader();
    loader.parse(
        glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength),
        '',
        gltf => {
            visualGroup = gltf.scene;
            applyGlbMaterialOverrides(visualGroup);
            // Same absolute IFC/Three frame as the model — parent under the alignment
            // group so -bboxCenter centering keeps overlays locked to the mesh.
            const alignment = getAlignmentGroup();
            if (alignment) {
                alignment.add(visualGroup);
            } else {
                world.scene.three.add(visualGroup);
            }
        },
        error => {
            console.error('Failed to load check visuals GLB', error);
        },
    );
}

/** Store check visuals and apply them when the IFC viewer scene is available. */
export function updateVisualsGlb(glb: Uint8Array | null) {
    pendingGlb = glb;
    hasCheckVisuals.value = glb !== null && glb.byteLength > 0;
    checkVisualsVisible.value = hasCheckVisuals.value;
    if (checkVisualsVisible.value && glb) {
        applyGlb(glb);
    } else {
        const world = getWorld();
        if (world) clearVisualMeshes(world);
    }
}

/** Re-apply the last check visuals after the viewer initializes. */
export function refreshVisuals() {
    if (!checkVisualsVisible.value || !pendingGlb) return;
    applyGlb(pendingGlb);
}

/** Toggle visibility of the latest check visuals without discarding them. */
export function toggleCheckVisuals() {
    if (!hasCheckVisuals.value) return;

    checkVisualsVisible.value = !checkVisualsVisible.value;
    const world = getWorld();
    if (!world) return;

    if (checkVisualsVisible.value && pendingGlb) {
        applyGlb(pendingGlb);
    } else {
        clearVisualMeshes(world);
    }
}

/** Remove all overlays and discard the latest check visuals. */
export function clearVisuals() {
    pendingGlb = null;
    hasCheckVisuals.value = false;
    checkVisualsVisible.value = false;
    const world = getWorld();
    if (world) clearVisualMeshes(world);
}

/** @deprecated Use updateVisualsGlb instead. */
export function updateVisuals(_data: unknown) {
    updateVisualsGlb(null);
}
