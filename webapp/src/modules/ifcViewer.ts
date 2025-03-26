import * as OBC from '@thatopen/components';
import * as OBCF from '@thatopen/components-front';
import type { FragmentsGroup } from '@thatopen/fragments';
import { reactive, ref, watch } from 'vue';
import { getModel, getModels } from './apiConnection';

import { Mesh } from 'three';
import * as WEBIFC from 'web-ifc';

import LoadWorker from '../webworker/ifcLoader?worker&inline';

// init components
let components: OBC.Components;

let worlds: OBC.Worlds;

let world: OBC.SimpleWorld<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>;

// reference declaration
const selected = ref<string | null>(null);
const loading = ref(false);
let ready = false;

const models = reactive(new Map<string, string>());
const loadedModels: Map<string, FragmentsGroup | null> = new Map<string, FragmentsGroup | null>();

const init = async (container: HTMLElement) => {
    try {
        if (components) components.dispose();
    } catch (_) {
        /* empty */
    }

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

    loading.value = true;

    const selected = await getSelected();
    if (selected) {
        loadModel(selected);
    }

    loading.value = false;
    ready = true;
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

// loads a model
function loadModel(model: FragmentsGroup) {
    loading.value = true;
    world.scene.three.add(model);
    const culler = components.get(OBC.Cullers).create(world);
    for (const mesh of model.children) {
        culler.add(mesh as Mesh);
    }

    world.camera.controls.addEventListener('sleep', () => {
        culler.needsUpdate = true;
    });

    // finished loading model
    loading.value = false;
}

// uloads a model
async function unloadModel(model: FragmentsGroup) {
    loading.value = true;
    world.scene.three.remove(model);
    loading.value = false;
}

// this is cursed. Please make it better JS/TS god
async function getSelected(): Promise<FragmentsGroup | null> {
    const loader = components.get(OBC.IfcLoader);
    if (!selected.value) return null;
    if (!loadedModels.has(selected.value)) throw new Error('Key not found');

    const model = loadedModels.get(selected.value);

    if (model) return model;

    // if model was not loaded yet:
    loading.value = true;
    const apiModelAnswer = await getModel(selected.value);

    const loadedModel = window.Worker
        ? await new Promise<FragmentsGroup>((resolve, reject) => {
              const fragmentsManager = components.get(OBC.FragmentsManager);

              const worker = new LoadWorker();
              worker.onmessage = (e: MessageEvent<Uint8Array>) => {
                  const fragments = fragmentsManager.load(e.data);
                  resolve(fragments);
              };
              worker.postMessage({ file: apiModelAnswer });
              worker.onerror = reject;
          })
        : await loader.load(apiModelAnswer);

    loadedModels.set(selected.value, loadedModel);
    loading.value = false;
    return loadedModel;
}

function updateModels() {
    getModels().then(data => {
        models.clear();
        data.forEach((v, k) => models.set(k, v));
    });
}

watch(selected, async (newVal, oldVal) => {
    if (oldVal) {
        const oldModel = loadedModels.get(oldVal);
        if (oldModel) await unloadModel(oldModel);
    }

    if (!newVal) return;
    const selectedModel = await getSelected();
    if (!selectedModel) return;
    loadModel(selectedModel);
});

watch(models, () =>
    [...models.keys()].forEach(model => loadedModels.set(model, loadedModels.get(model) || null)),
);

const getScene = () => (ready ? world.scene : null);
const getHighlighter = () => components.get(OBCF.Highlighter);
const getComponents = () => components;
const getWorld = () => world;
0;
export {
    getComponents,
    getHighlighter,
    getScene,
    getSelected,
    getWorld,
    init,
    loadModel,
    loading,
    models,
    selected,
    unloadModel,
    updateModels,
};
