import { FragmentsGroup } from 'bim-fragment';
import * as OBC from 'openbim-components';
import { Color } from "three";
import { Ref, ref } from 'vue';

const components = new OBC.Components();
components.onInitialized.add(() => {});

const sceneComponent = new OBC.SimpleScene(components);
sceneComponent.setup();
components.scene = sceneComponent;

const createLoader = (container: HTMLElement) => {
    const rendererComponent = new OBC.PostproductionRenderer(components, container);
    components.renderer = rendererComponent;
    const postproduction = rendererComponent.postproduction;

    const cameraComponent = new OBC.OrthoPerspectiveCamera(components);
    components.camera = cameraComponent;

    const raycasterComponent = new OBC.SimpleRaycaster(components);
    components.raycaster = raycasterComponent;

    components.init();
    postproduction.enabled = true;

    const grid = new OBC.SimpleGrid(components, new Color(0x666666));
    postproduction.customEffects.excludedMeshes.push(grid.get());

    const ifcLoader = new OBC.FragmentIfcLoader(components);

    ifcLoader.settings.wasm = {
        path: '/resources/',
        absolute: true,
    };

    const highlighter = new OBC.FragmentHighlighter(components);
    highlighter.setup();

    const propertiesProcessor = new OBC.IfcPropertiesProcessor(components);
    highlighter.events.select.onClear.add(() => {
        propertiesProcessor.cleanPropertiesList();
    });

    ifcLoader.onIfcLoaded.add(async model => {    
        components.scene.get().add(model);
        await highlighter.update();
        (await components.tools.get(OBC.FragmentManager)).updateWindow()
        
        propertiesProcessor.process(model);
        highlighter.events.select.onHighlight.add(selection => {
            const fragmentID = Object.keys(selection)[0];
            const expressID = Number([...selection[fragmentID]][0]);
            propertiesProcessor.renderProperties(model, expressID);
        });
    });

    // const mainToolbar = new OBC.Toolbar(components, { name: 'Main Toolbar', position: 'bottom' });
    // mainToolbar.addChild(
    //     ifcLoader.uiElement.get('main'),
    //     propertiesProcessor.uiElement.get('main'),
    // );
    // components.ui.addToolbar(mainToolbar);

    return ifcLoader;
};

let selected: Ref<string | null> = ref(null);
const models = ref(new Map<string, FragmentsGroup>());

// this is cursed. Please make it better JS/TS god
const getSelected = () => (selected.value ? models.value.get(selected.value) || null : null);

export { createLoader, getSelected, models };
