import { FragmentsGroup } from 'bim-fragment';

let selected: string | null = null;
export const models = new Map<string, FragmentsGroup>();

export const getSelected = () => selected ? models.get(selected) || null : null;
