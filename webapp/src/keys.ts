import Parser from '@/ParserOpenBIMRL';
import { InjectionKey } from 'vue';
import { GraphInject } from './components/graph/Types';


export const graphInjectionKey: InjectionKey<GraphInject> = Symbol('graph');
export const parserInjectionKey: InjectionKey<Parser> = Symbol('parser')
