import { createApp } from 'vue';
import App from './App.vue';
import Parser from './ParserOpenBIMRL';
import { initialGraph } from './components/graph/config';
import { graphInjectionKey, parserInjectionKey } from './keys';
import './style.css';

const graph = initialGraph();
const parser = new Parser();

const app = createApp(App);
app.provide(graphInjectionKey, graph);
app.provide(parserInjectionKey, parser);
app.mount('#app');
