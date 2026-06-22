import { RouteRecordRaw, createRouter, createWebHashHistory } from 'vue-router';
import { Graph } from '../components';

export enum Routes {
    GRAPH = 'graph',
    CHECKS = 'checks',
    VIEWER = 'viewer',
    API = 'api',
}

const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        name: Routes.GRAPH,
        component: Graph,
    },
    {
        path: '/checks',
        name: Routes.CHECKS,
        component: () => import('@/components/model_check/view.vue'),
    },
    {
        path: '/viewer',
        name: Routes.VIEWER,
        component: () => import('@/components/viewer/IfcViewer.vue'),
    },
    {
        path: '/api',
        name: Routes.API,
        component: () => import('@/components/side_panels/ApiConnection.vue'),
        props: { embedded: true },
    },
];

export default createRouter({
    history: createWebHashHistory(),
    routes,
});
