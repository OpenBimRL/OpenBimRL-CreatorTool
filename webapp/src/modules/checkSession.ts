import { ref } from 'vue';
import { MAX_CONSOLE_CHARS } from './checkResultLimits';

export const checkLoading = ref(false);
export const checkStatusText = ref('Idle');
export const consoleOpen = ref(false);
export const consoleMinimized = ref(false);
export const consoleText = ref('Ready.\n');

export function appendConsole(message: string) {
    consoleText.value += message;
    if (consoleText.value.length > MAX_CONSOLE_CHARS) {
        consoleText.value = consoleText.value.slice(-MAX_CONSOLE_CHARS);
    }
}

export function clearConsole() {
    consoleText.value = '';
}

export function toggleConsole() {
    consoleOpen.value = !consoleOpen.value;
    if (consoleOpen.value) consoleMinimized.value = false;
}
