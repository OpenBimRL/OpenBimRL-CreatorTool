import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ref } from 'vue';
import { getAlignmentGroup, getWorld } from './ifcViewer';

const LABEL_EXTRAS_KEY = 'openbimrlLabel';

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
                child instanceof THREE.Line ||
                child instanceof THREE.Sprite
            ) {
                if ('geometry' in child && child.geometry) {
                    child.geometry.dispose();
                }
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach(material => {
                    if (material.map) material.map.dispose();
                    material.dispose();
                });
            }
        });
        visualGroup = null;
    }
}

function createLabelSprite(text: string): THREE.Sprite {
    const padding = 8;
    const fontSize = 48;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    ctx.font = `600 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
    const metrics = ctx.measureText(text);
    const textWidth = Math.ceil(metrics.width);
    const textHeight = fontSize;
    canvas.width = textWidth + padding * 2;
    canvas.height = textHeight + padding * 2;

    ctx.font = `600 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.beginPath();
    const radius = 10;
    const w = canvas.width;
    const h = canvas.height;
    ctx.moveTo(radius, 0);
    ctx.arcTo(w, 0, w, h, radius);
    ctx.arcTo(w, h, 0, h, radius);
    ctx.arcTo(0, h, 0, 0, radius);
    ctx.arcTo(0, 0, w, 0, radius);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(text, w / 2, h / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const material = new THREE.SpriteMaterial({
        map: texture,
        depthTest: false,
        transparent: true,
    });
    const sprite = new THREE.Sprite(material);
    const worldHeight = 0.45;
    sprite.scale.set((canvas.width / canvas.height) * worldHeight, worldHeight, 1);
    sprite.renderOrder = 1000;
    return sprite;
}

function attachTextLabels(root: THREE.Object3D) {
    root.traverse(child => {
        const label = child.userData?.[LABEL_EXTRAS_KEY];
        if (typeof label !== 'string' || !label) return;
        child.add(createLabelSprite(label));
    });
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
            attachTextLabels(visualGroup);
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
