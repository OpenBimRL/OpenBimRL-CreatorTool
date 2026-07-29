import * as OBC from '@thatopen/components';
import * as OBCF from '@thatopen/components-front';
import type { FragmentsModel } from '@thatopen/fragments';
import * as FRAGS from '@thatopen/fragments';
import fragmentsWorkerUrl from '@thatopen/fragments/worker?url';
import { reactive, ref, watch } from 'vue';
import { getModel, getModels } from './apiConnection';

import * as WEBIFC from 'web-ifc';

import { Color, Group, Vector3 } from 'three';
import { deleteStoredFragment, getStoredFragment, storeFragment } from './fragmentCache';
import { setupViewerSelection } from './viewerElementSelection';
import { refreshVisuals } from './visualizer';

/** web-ifc SetWasmPath expects a directory containing a file named web-ifc.wasm */
const WEBIFC_WASM_PATH = '/web-ifc/';

const EXCLUDED_IFC_TYPES = [
    WEBIFC.IFCTENDONANCHOR,
    WEBIFC.IFCREINFORCINGBAR,
    WEBIFC.IFCREINFORCINGELEMENT,
    WEBIFC.IFCSPACE,
];

let components: OBC.Components;
let worlds: OBC.Worlds;
let world: OBC.SimpleWorld<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>;
let fragments: OBC.FragmentsManager;

const selected = ref<string | null>(null);
const loading = ref(false);
let ready = false;

let displayedModelId: string | null = null;
let displayedModel: FragmentsModel | null = null;
let applySerial = 0;

/**
 * Shared parent for IFC fragments and check visuals.
 * Translated by -bboxCenter so far-from-origin models sit near the grid
 * without breaking overlay alignment (both stay in the same IFC world frame).
 */
let alignmentGroup: Group | null = null;

const models = reactive(new Map<string, string>());
const loadedModels = new Map<string, FragmentsModel | null>();
const loadingPromises = new Map<string, Promise<FragmentsModel | null>>();

function ensureAlignmentGroup(): Group {
    if (!alignmentGroup) {
        alignmentGroup = new Group();
        alignmentGroup.name = 'ifcAlignment';
        world.scene.three.add(alignmentGroup);
    } else if (alignmentGroup.parent !== world.scene.three) {
        world.scene.three.add(alignmentGroup);
    }
    return alignmentGroup;
}

/** Parent for check visuals — same transform as the displayed IFC model. */
export function getAlignmentGroup(): Group | null {
    if (!ready || !world) return null;
    return ensureAlignmentGroup();
}

function recenterAlignmentToModel(model: FragmentsModel) {
    const group = ensureAlignmentGroup();
    group.position.set(0, 0, 0);
    group.updateMatrixWorld(true);

    const box = model.box;
    if (box.isEmpty()) return;

    const center = new Vector3();
    box.getCenter(center);
    group.position.copy(center).multiplyScalar(-1);
    group.updateMatrixWorld(true);
}

function resetAlignmentGroup() {
    if (!alignmentGroup) return;
    alignmentGroup.position.set(0, 0, 0);
    alignmentGroup.updateMatrixWorld(true);
}

function resolveCachedModel(modelId: string): FragmentsModel | null {
    const cached = loadedModels.get(modelId);
    if (cached) return cached;

    const fromFragments = fragments?.list.get(modelId);
    if (fromFragments) {
        loadedModels.set(modelId, fromFragments);
        return fromFragments;
    }

    return null;
}

function syncLoadedModelsFromFragments() {
    if (!fragments?.list) return;

    for (const [modelId, model] of fragments.list) {
        loadedModels.set(modelId, model);
    }
}

async function persistModelFragments(modelId: string, model: FragmentsModel) {
    try {
        const buffer = await model.getBuffer(false);
        await storeFragment(modelId, buffer);
    } catch (error) {
        console.warn(`Failed to persist fragments for model ${modelId}`, error);
    }
}

async function loadModelFromFragmentBuffer(
    modelId: string,
    buffer: ArrayBuffer,
): Promise<FragmentsModel> {
    const model = await fragments.core.load(buffer, {
        modelId,
        camera: world.camera.three,
    });
    loadedModels.set(modelId, model);
    return model;
}

export function applyIfcImporterExclusions(importer: FRAGS.IfcImporter) {
    importer.wasm.path = WEBIFC_WASM_PATH;
    importer.wasm.absolute = true;
    // Keep absolute IFC coords so /visuals GLBs stay aligned. Disable Fragments'
    // default 100 km skip so projected-CRS models still import.
    importer.webIfcSettings = {
        ...importer.webIfcSettings,
        COORDINATE_TO_ORIGIN: false,
    };
    importer.distanceThreshold = null;

    for (const type of EXCLUDED_IFC_TYPES) {
        importer.classes.elements.delete(type);
    }
}

export async function configureIfcLoader(ifcLoader: OBC.IfcLoader) {
    await ifcLoader.setup({
        autoSetWasm: false,
        wasm: {
            path: WEBIFC_WASM_PATH,
            absolute: true,
        },
        webIfc: {
            COORDINATE_TO_ORIGIN: false,
        },
    });
}

function showModel(model: FragmentsModel, options: { fitView?: boolean } = {}) {
    const { fitView = true } = options;
    model.frozen = false;
    model.useCamera(world.camera.three);

    const group = ensureAlignmentGroup();
    if (model.object.parent !== group) {
        world.scene.three.remove(model.object);
        group.add(model.object);
    }

    recenterAlignmentToModel(model);
    void fragments.core.update(true).then(() => {
        // Box can refine after the first fragments update — recenter once more.
        recenterAlignmentToModel(model);
        refreshVisuals();
        if (fitView) {
            void fitViewToDisplayedModel();
        }
    });
}

function hideModel(model: FragmentsModel) {
    model.object.removeFromParent();
    model.frozen = true;
}

/** Frame the camera on the currently displayed model (and any siblings in the alignment group). */
export async function fitViewToDisplayedModel() {
    if (!ready || !world?.camera) return;

    try {
        await fragments.core.update(true);
    } catch {
        /* empty */
    }

    const target =
        alignmentGroup && alignmentGroup.children.length > 0
            ? alignmentGroup
            : displayedModel?.object;

    if (!target) return;

    try {
        await world.camera.controls.fitToBox(target, true);
    } catch (error) {
        console.warn('fitToBox failed', error);
    }
}

function reattachRenderer(container: HTMLElement) {
    const renderer = world.renderer;
    renderer.container = container;

    const canvas = renderer.three.domElement;
    if (canvas.parentElement !== container) {
        container.appendChild(canvas);
    }

    const logo = renderer.logo;
    if (logo && logo.parentElement !== container) {
        container.appendChild(logo);
    }

    renderer.setupEvents(true);
    renderer.resize();
}

async function attachViewer(container: HTMLElement) {
    reattachRenderer(container);
    syncLoadedModelsFromFragments();

    if (displayedModel) {
        showModel(displayedModel, { fitView: false });
    }

    refreshVisuals();
    void fragments.core.update(true);
}

async function createViewer(container: HTMLElement) {
    components = new OBC.Components();

    worlds = components.get(OBC.Worlds);
    world = worlds.create<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>();

    world.scene = new OBC.SimpleScene(components);
    world.renderer = new OBC.SimpleRenderer(components, container);
    world.camera = new OBC.SimpleCamera(components);

    components.init();
    world.scene.setup();

    const grids = components.get(OBC.Grids);
    grids.create(world);

    fragments = components.get(OBC.FragmentsManager);
    fragments.init(fragmentsWorkerUrl);

    fragments.list.onItemSet.add(({ value: model }) => {
        model.useCamera(world.camera.three);
        if (model.modelId === selected.value) {
            showModel(model);
        }
    });

    world.camera.controls.addEventListener('update', () => {
        void fragments.core.update();
    });

    fragments.core.models.materials.list.onItemSet.add(({ value: material }) => {
        if (!('isLodMaterial' in material && material.isLodMaterial)) {
            material.polygonOffset = true;
            material.polygonOffsetUnits = 1;
            material.polygonOffsetFactor = Math.random();
        }
    });

    const ifcLoader = components.get(OBC.IfcLoader);
    await configureIfcLoader(ifcLoader);

    const highlighter = components.get(OBCF.Highlighter);
    highlighter.styles.set('select', {
        color: new Color('#bcf124'),
        opacity: 1,
        transparent: false,
        renderedFaces: FRAGS.RenderedFaces.TWO,
    });
    highlighter.setup({
        world,
        selectName: 'select',
        selectEnabled: true,
        autoHighlightOnClick: true,
    });
    setupViewerSelection(highlighter, components);

    syncLoadedModelsFromFragments();
    ready = true;
    refreshVisuals();
    await applyDisplayedModel();
}

const init = async (container: HTMLElement) => {
    if (ready && components) {
        await attachViewer(container);
        return;
    }

    await createViewer(container);
};

function detachViewer() {
    if (!ready || !world?.renderer) return;

    try {
        world.renderer.setupEvents(false);
    } catch {
        /* empty */
    }
}

function unloadDisplayedModel() {
    if (!displayedModel) return;
    hideModel(displayedModel);
    displayedModel = null;
    displayedModelId = null;
    resetAlignmentGroup();
}

async function ensureModelLoaded(modelId: string): Promise<FragmentsModel | null> {
    if (!components) return null;

    const cached = resolveCachedModel(modelId);
    if (cached) return cached;

    const inFlight = loadingPromises.get(modelId);
    if (inFlight) return inFlight;

    if (!loadedModels.has(modelId)) {
        loadedModels.set(modelId, null);
    }

    const loadPromise = (async () => {
        loading.value = true;
        try {
            const storedBuffer = await getStoredFragment(modelId);
            if (storedBuffer) {
                try {
                    return await loadModelFromFragmentBuffer(modelId, storedBuffer);
                } catch (error) {
                    console.warn(
                        `Cached fragments for ${modelId} could not be loaded, refetching IFC`,
                        error,
                    );
                    await deleteStoredFragment(modelId);
                }
            }

            const ifcLoader = components.get(OBC.IfcLoader);
            const apiModelAnswer = await getModel(modelId);
            const loadedModel = await ifcLoader.load(apiModelAnswer, false, modelId, {
                instanceCallback: applyIfcImporterExclusions,
            });
            loadedModels.set(modelId, loadedModel);
            void persistModelFragments(modelId, loadedModel);
            return loadedModel;
        } catch (error) {
            loadedModels.delete(modelId);
            throw error;
        } finally {
            loading.value = false;
            loadingPromises.delete(modelId);
        }
    })();

    loadingPromises.set(modelId, loadPromise);
    return loadPromise;
}

async function applyDisplayedModel() {
    if (!components || !world || !ready) return;

    const serial = ++applySerial;
    const targetId = selected.value;

    if (displayedModelId && displayedModelId !== targetId) {
        unloadDisplayedModel();
    }

    if (!targetId) return;

    const cached = resolveCachedModel(targetId);
    if (cached) {
        if (displayedModelId === targetId && displayedModel === cached) return;

        showModel(cached);
        displayedModel = cached;
        displayedModelId = targetId;
        return;
    }

    if (displayedModelId === targetId) return;

    const model = await ensureModelLoaded(targetId);
    if (serial !== applySerial || selected.value !== targetId) return;
    if (!model) return;

    showModel(model);
    displayedModel = model;
    displayedModelId = targetId;
}

async function getSelected(): Promise<FragmentsModel | null> {
    if (!selected.value) return null;
    if (displayedModelId === selected.value && displayedModel) return displayedModel;

    const cached = resolveCachedModel(selected.value);
    if (cached) return cached;

    return ensureModelLoaded(selected.value);
}

function updateModels() {
    getModels().then(data => {
        models.clear();
        data.forEach((v, k) => models.set(k, v));
    });
}

/** Drop a model from local viewer state and fragment cache after server-side delete. */
async function removeModelLocally(modelId: string) {
    if (selected.value === modelId) {
        selected.value = null;
    }

    if (displayedModelId === modelId) {
        unloadDisplayedModel();
    }

    const cached = resolveCachedModel(modelId);
    if (cached) {
        hideModel(cached);
    }
    loadedModels.delete(modelId);
    loadingPromises.delete(modelId);
    fragments?.list.delete(modelId);
    models.delete(modelId);

    await deleteStoredFragment(modelId);
}

watch(selected, () => {
    void applyDisplayedModel();
});

watch(models, () => {
    for (const modelId of models.keys()) {
        if (!loadedModels.has(modelId)) {
            loadedModels.set(modelId, null);
        }
    }
});

const getScene = () => (ready ? world.scene : null);
const getHighlighter = () => (components ? components.get(OBCF.Highlighter) : null);
const getFragments = () => fragments;
const getComponents = () => components;
const getWorld = () => (world ? world : null);

export {
    detachViewer,
    getComponents,
    getFragments,
    getHighlighter,
    getScene,
    getSelected,
    getWorld,
    init,
    loading,
    models,
    removeModelLocally,
    selected,
    updateModels,
};
