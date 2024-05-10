import { defineAsyncComponent } from 'vue';

const Help = defineAsyncComponent(() => import('./Help.vue'));
const ApiConnection = defineAsyncComponent(() => import('./ApiConnection.vue'));

export { ApiConnection, Help };
