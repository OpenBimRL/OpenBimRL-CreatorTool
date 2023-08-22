import { ModelCheckProps } from '@/components/model_check/Types';
import { RouteRecordRaw, createRouter, createWebHashHistory } from 'vue-router';
import { Graph, ModelCheckView } from '../components';

const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        component: Graph,
    },
    {
        path: '/checks',
        component: ModelCheckView,
        props: {
            title: 'Sub Checks',
            bindData: 'subChecks',
        } as ModelCheckProps,
    },
    {
        path: '/sets',
        component: ModelCheckView,
        props: {
            title: 'Result Sets',
            bindData: 'resultSets',
        } as ModelCheckProps,
    },
];

export default createRouter({
    history: createWebHashHistory(),
    routes,
});
