import { RouteRecordRaw, createRouter, createWebHashHistory } from 'vue-router';

export enum Routes {
    GRAPH = 'graph',
    CHECKS = 'checks',
    VIEWER = 'viewer',
    SETTINGS = 'settings',
}

const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        name: Routes.GRAPH,
        component: () => import('@/components/graph/Graph.vue'),
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
        path: '/settings',
        name: Routes.SETTINGS,
        component: () => import('@/components/settings/SettingsPage.vue'),
    },
    {
        path: '/api',
        redirect: '/settings',
    },
];

export default createRouter({
    history: createWebHashHistory(),
    routes,
});
