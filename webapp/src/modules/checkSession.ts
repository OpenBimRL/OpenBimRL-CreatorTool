import { ref } from 'vue';

export const checkLoading = ref(false);
export const checkStatusText = ref('Idle');
export const consoleOpen = ref(false);
export const consoleMinimized = ref(false);
export const consoleText = ref('Ready.\n');

export function appendConsole(message: string) {
    consoleText.value += message;
}

export function clearConsole() {
    consoleText.value = '';
}

export function toggleConsole() {
    consoleOpen.value = !consoleOpen.value;
    if (consoleOpen.value) consoleMinimized.value = false;
}
