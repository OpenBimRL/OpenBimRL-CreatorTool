import { createApp, ref } from 'vue';
import App from './App.vue';
import Parser from './ParserOpenBIMRL';
import { initialGraph } from './components/graph/config';
import { apiConnectionInjectionKey, darkModeKey, graphInjectionKey, parserInjectionKey } from './keys';
import { darkMode, router } from './modules';
import './style.css';

const graph = initialGraph();
const parser = new Parser();
const apiConnection = ref<boolean | undefined>(undefined);

const app = createApp(App);
app.provide(graphInjectionKey, graph);
app.provide(parserInjectionKey, parser);
app.provide(darkModeKey, darkMode);
app.provide(apiConnectionInjectionKey, apiConnection);
app.use(router);
app.mount('#app');
