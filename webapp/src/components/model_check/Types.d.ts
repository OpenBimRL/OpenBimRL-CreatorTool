import { Ref } from 'vue';
import { GraphJSON, RulesOrRuleSets } from '../graph/Types';

export interface ModelCheckProps {
    title: string;
    bindData: keyof GraphJSON;
}
