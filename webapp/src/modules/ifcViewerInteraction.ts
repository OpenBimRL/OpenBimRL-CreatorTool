import type { FragmentIdMap, FragmentsGroup } from 'bim-fragment';
import { getSelected, highlighter } from './ifcViewer';

const fragmentMap = new Map<string, FragmentIdMap>();

export function highlight(guid: string) {
    getSelected().then(model => {
        if (!model) return;
        const expressID = convertToExpressID(model, guid);     

        if (!expressID) return;
        fragmentMap.set(guid, model.getFragmentMap([expressID]));

        fragmentMap.forEach(map => highlighter.highlightByID('select', map));
    });
}

export function unHighlight(guid: string) {
    fragmentMap.delete(guid);
    fragmentMap.forEach(map => highlighter.highlightByID('select', map));
}

function convertToExpressID(model: FragmentsGroup, globalId: string): number | null {
    if (!model) return null;    

    const properties = model.getLocalProperties();
    for (const expressID in properties) {
        
        const entity = properties[Number(expressID)];
        if (!entity) continue;

        const attribute = entity.GlobalId;
        let attributeValue = attribute?.value;
        if (!attributeValue) continue;

        if (attributeValue === "3zUryKktuHxfL8BF1T2vCN")
            console.log("found " + globalId);
            

        if (attributeValue == globalId) return entity.expressID as number;
    }    

    return null;
}
