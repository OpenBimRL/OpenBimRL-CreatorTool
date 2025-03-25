import { configureIfcLoader } from '@/modules/ifcViewer';
import { Components, FragmentsManager, IfcLoader } from '@thatopen/components';

onmessage = async (e: MessageEvent<{ file: Uint8Array }>) => {
    const components = new Components();
    const loader = components.get(IfcLoader);
    const fragmentsManager = components.get(FragmentsManager);
    await configureIfcLoader(loader);
    loader.load(e.data.file).then(fragments => postMessage(fragmentsManager.export(fragments)));
};
