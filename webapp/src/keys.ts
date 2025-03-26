import Parser from '@/ParserOpenBIMRL';
import { InjectionKey, Ref } from 'vue';
import { GraphInject } from './components/graph/Types';

export const graphInjectionKey: InjectionKey<GraphInject> = Symbol('graph');
export const parserInjectionKey: InjectionKey<Parser> = Symbol('parser');
export const darkModeKey: InjectionKey<Ref<boolean>> = Symbol('dark');
export const apiConnectionInjectionKey: InjectionKey<Ref<boolean | undefined>> =
    Symbol('apiConnection');
