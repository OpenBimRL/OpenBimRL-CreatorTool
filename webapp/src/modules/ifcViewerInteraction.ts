import { IfcPropertiesUtils } from '@thatopen/components';
import type { FragmentIdMap, FragmentsGroup } from '@thatopen/fragments';
import { getHighlighter, getSelected } from './ifcViewer';

const fragmentMap = new Map<string, FragmentIdMap>();

export function highlight(guid: string) {
    getSelected().then(model => {
        if (!model) return;
        convertToExpressID(model, guid).then(expressID => {
            fragmentMap.set(guid, model.getFragmentMap([expressID]));

            console.log("highlighting item with e-id: " + expressID);

            const highlighter = getHighlighter();
            

            fragmentMap.forEach(map => highlighter.highlightByID('select', map, false, false));
        });
    });
}

export function unHighlight(guid: string) {
    // fragmentMap.delete(guid);
    // fragmentMap.forEach(map => getHighlighter().highlightByID('select', map));
}

async function convertToExpressID(model: FragmentsGroup, globalId: string): Promise<number> {
    if (!model) throw new TypeError('is not a non-null object');

    const item = await IfcPropertiesUtils.findItemByGuid(model, globalId);
    console.log(item);
    
    if (item) return Number(item['expressID']);
    throw new TypeError('expressID is null');
}
