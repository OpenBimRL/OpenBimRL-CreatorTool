import * as BUI from '@thatopen/ui';
import * as BUIC from '@thatopen/ui-obc';

let initialized = false;

export function initBimUi() {
    if (initialized) return;
    BUI.Manager.init();
    BUIC.Manager.init();
    initialized = true;
}
