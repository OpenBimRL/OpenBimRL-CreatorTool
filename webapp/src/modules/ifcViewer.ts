import * as OBC from '@thatopen/components';
import * as OBCF from '@thatopen/components-front';
import type { FragmentsGroup, IfcProperties } from '@thatopen/fragments';
import { reactive, ref, watch } from 'vue';
import { getModel, getModels } from './apiConnection';

import { Mesh } from 'three';
import * as WEBIFC from 'web-ifc';

import LoadWorker from '../webworker/ifcLoader?worker&inline';
import { refreshVisuals } from './visualizer';

// init components
let components: OBC.Components;

let worlds: OBC.Worlds;

let world: OBC.SimpleWorld<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>;

const selected = ref<string | null>(null);
const loading = ref(false);
let ready = false;

let displayedModelId: string | null = null;
let displayedModel: FragmentsGroup | null = null;
let applySerial = 0;

const models = reactive(new Map<string, string>());
const loadedModels: Map<string, FragmentsGroup | null> = new Map<string, FragmentsGroup | null>();

const init = async (container: HTMLElement) => {
    try {
        if (components) components.dispose();
    } catch (_) {
        /* empty */
    }

    displayedModelId = null;
    displayedModel = null;
    applySerial++;
    ready = false;

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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ = components.get(OBC.FragmentsManager);
    const fragmentIfcLoader = components.get(OBC.IfcLoader);
    await configureIfcLoader(fragmentIfcLoader);

    const cullers = components.get(OBC.Cullers);
    const culler = cullers.create(world);
    culler.enabled = false;

    const highlighter = components.get(OBCF.Highlighter);
    highlighter.setup({ world });

    ready = true;
    refreshVisuals();
    await applyDisplayedModel();
};

export async function configureIfcLoader(fragmentIfcLoader: OBC.IfcLoader) {
    await fragmentIfcLoader.setup();

    const excludedCats = [
        WEBIFC.IFCTENDONANCHOR,
        WEBIFC.IFCREINFORCINGBAR,
        WEBIFC.IFCREINFORCINGELEMENT,
        WEBIFC.IFCSPACE,
    ];

    for (const cat of excludedCats) {
        fragmentIfcLoader.settings.excludedCategories.add(cat);
    }

    fragmentIfcLoader.settings.webIfc.COORDINATE_TO_ORIGIN = false;
    fragmentIfcLoader.settings.webIfc.OPTIMIZE_PROFILES = true;
}

function loadModel(model: FragmentsGroup) {
    world.scene.three.add(model);
    const culler = components.get(OBC.Cullers).create(world);
    for (const mesh of model.children) {
        culler.add(mesh as Mesh);
    }

    world.camera.controls.addEventListener('sleep', () => {
        culler.needsUpdate = true;
    });
}

function unloadDisplayedModel() {
    if (!displayedModel) return;
    world.scene.three.remove(displayedModel);
    displayedModel = null;
    displayedModelId = null;
}

async function ensureModelLoaded(modelId: string): Promise<FragmentsGroup | null> {
    if (!components) return null;

    if (!loadedModels.has(modelId)) {
        loadedModels.set(modelId, null);
    }

    const cached = loadedModels.get(modelId);
    if (cached) return cached;

    const loader = components.get(OBC.IfcLoader);
    loading.value = true;
    const apiModelAnswer = await getModel(modelId);

    const loadedModel = window.Worker
        ? await new Promise<FragmentsGroup>((resolve, reject) => {
              const fragmentsManager = components.get(OBC.FragmentsManager);

              const worker = new LoadWorker();
              worker.onmessage = (
                  e: MessageEvent<{ bytes: Uint8Array; properties: IfcProperties | null }>,
              ) => {
                  const fragments = fragmentsManager.load(e.data.bytes);
                  if (e.data.properties) fragments.setLocalProperties(e.data.properties);
                  resolve(fragments);
              };
              worker.postMessage({ file: apiModelAnswer });
              worker.onerror = reject;
          })
        : await loader.load(apiModelAnswer);

    loadedModels.set(modelId, loadedModel);
    loading.value = false;
    return loadedModel;
}

async function applyDisplayedModel() {
    if (!components || !world || !ready) return;

    const serial = ++applySerial;
    const targetId = selected.value;

    if (displayedModelId && displayedModelId !== targetId) {
        unloadDisplayedModel();
    }

    if (!targetId) return;
    if (displayedModelId === targetId) return;

    const model = await ensureModelLoaded(targetId);
    if (serial !== applySerial || selected.value !== targetId) return;

    if (!model) return;

    loadModel(model);
    displayedModel = model;
    displayedModelId = targetId;
}

async function getSelected(): Promise<FragmentsGroup | null> {
    if (!selected.value) return null;
    return ensureModelLoaded(selected.value);
}

function updateModels() {
    getModels().then(data => {
        models.clear();
        data.forEach((v, k) => models.set(k, v));
    });
}

watch(selected, () => {
    void applyDisplayedModel();
});

watch(models, () =>
    [...models.keys()].forEach(model => loadedModels.set(model, loadedModels.get(model) || null)),
);

const getScene = () => (ready ? world.scene : null);
const getHighlighter = () => (components ? components.get(OBCF.Highlighter) : null);
const getComponents = () => components;
const getWorld = () => (world ? world : null);

export {
    getComponents,
    getHighlighter,
    getScene,
    getSelected,
    getWorld,
    init,
    loading,
    models,
    selected,
    updateModels,
};
