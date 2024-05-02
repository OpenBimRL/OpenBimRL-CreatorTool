import { FragmentsGroup } from 'bim-fragment';
import * as OBC from 'openbim-components';
import { Color } from 'three';
import { reactive, ref, watch } from 'vue';
import { getModel, getModels } from './apiConnection';

import * as WEBIFC from 'web-ifc';

// init components
const components = new OBC.Components();
components.onInitialized.add(() => {});

// init scene
const sceneComponent = new OBC.SimpleScene(components);
sceneComponent.setup();
components.scene = sceneComponent;

// reference declaration
const selected = ref<string | null>(null);
const loading = ref(false);
let loader: OBC.FragmentIfcLoader;
let highlighter: OBC.FragmentHighlighter;
let propsProcessor: OBC.IfcPropertiesProcessor;
let culler: OBC.ScreenCuller;

const models = reactive(new Map<string, string>());
const loadedModels = new Map<string, FragmentsGroup | null>();

function init(container: HTMLElement) {
    const rendererComponent = new OBC.PostproductionRenderer(components, container);
    components.renderer = rendererComponent;
    const postproduction = rendererComponent.postproduction;
    components.camera = new OBC.OrthoPerspectiveCamera(components);
    components.raycaster = new OBC.SimpleRaycaster(components);

    // const raycasterComponent = new OBC.SimpleRaycaster(components);
    // components.raycaster = raycasterComponent;

    components.init();
    postproduction.enabled = true;

    const grid = new OBC.SimpleGrid(components, new Color(0x666666));
    postproduction.customEffects.excludedMeshes.push(grid.get());

    const fragments = new OBC.FragmentManager(components);

    loader = new OBC.FragmentIfcLoader(components);
    loader.settings.wasm = {
        path: '/resources/',
        absolute: true,
    };

    const excludedCats = [
        WEBIFC.IFCTENDONANCHOR,
        WEBIFC.IFCREINFORCINGBAR,
        WEBIFC.IFCREINFORCINGELEMENT,
        WEBIFC.IFCSPACE,
    ];
    for (const cat of excludedCats) {
        loader.settings.excludedCategories.add(cat);
    }

    highlighter = new OBC.FragmentHighlighter(components);
    highlighter.setup();
    rendererComponent.postproduction.customEffects.outlineEnabled = true;
    highlighter.outlineEnabled = true;

    propsProcessor = new OBC.IfcPropertiesProcessor(components);

    const highlighterEvents = highlighter.events;
    highlighterEvents.select.onClear.add(() => {
        propsProcessor.cleanPropertiesList();
    });

    highlighterEvents.select.onHighlight.add(selection => {
        const fragmentID = Object.keys(selection)[0];
        console.log(fragmentID);

        const expressID = [...selection[fragmentID]][0];
        const fragment = fragments.list[fragmentID];
        if (fragment.group) {
            propsProcessor.renderProperties(fragment.group, expressID);
        }
    });
}

async function updateWindow() {
    await components.tools.get(OBC.FragmentManager).updateWindow();
}

// loads a model
async function loadModel(model: FragmentsGroup) {
    loading.value = true;
    model.frustumCulled = true;
    components.scene.get().add(model);
    await propsProcessor.process(model);
    await updateWindow();
    loading.value = false;
}

// uloads a model
async function unloadModel(model: FragmentsGroup) {
    loading.value = true;
    components.scene.get().remove(model);
    await updateWindow();
    propsProcessor.dispose();
    loading.value = false;
}

// this is cursed. Please make it better JS/TS god
async function getSelected(): Promise<FragmentsGroup | null> {
    if (!loader) throw new Error('loader not yet initialized');
    if (!selected.value) return null;
    if (!loadedModels.has(selected.value)) throw new Error('Key not found');

    const model = loadedModels.get(selected.value);

    if (model) return model;

    // if model was not loaded yet:
    loading.value = true;
    const loadedModel = await loader.load(await getModel(selected.value));
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
    if (!loader) return;
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

const getScene = () => components.scene.get();

export {
    components,
    getScene,
    getSelected,
    highlighter,
    init,
    loadModel,
    loading,
    models,
    selected,
    unloadModel,
    updateModels,
};
