import { proxy, subscribe } from 'valtio';

// Prettier options that can be configured
export interface PrettierSettings {
    printWidth: number;
    tabWidth: number;
    useTabs: boolean;
    semi: boolean;
    singleQuote: boolean;
    trailingComma: 'none' | 'es5' | 'all';
    bracketSpacing: boolean;
    jsxSingleQuote: boolean;
}

// Editor display options
export interface EditorSettings {
    highlightLineLimit: number;  // Number of lines above which highlighting is disabled
}

export interface AppSettings {
    prettier: PrettierSettings;
    editor: EditorSettings;
    theme: 'dark' | 'light';
}

const STORAGE_KEY = 'whatjsx-settings';

const defaultSettings: AppSettings = {
    prettier: {
        printWidth: 100,
        tabWidth: 2,
        useTabs: false,
        semi: true,
        singleQuote: true,
        trailingComma: 'es5',
        bracketSpacing: true,
        jsxSingleQuote: false,
    },
    editor: {
        highlightLineLimit: 3000,
    },
    theme: 'dark',
};

// Load settings from localStorage
function loadSettings(): AppSettings {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Merge with defaults to handle new settings
            return {
                ...defaultSettings,
                ...parsed,
                prettier: {
                    ...defaultSettings.prettier,
                    ...parsed.prettier,
                },
                editor: {
                    ...defaultSettings.editor,
                    ...parsed.editor,
                },
            };
        }
    } catch (e) {
        console.warn('Failed to load settings:', e);
    }
    return defaultSettings;
}

// Save settings to localStorage
function saveSettings(settings: AppSettings): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
        console.warn('Failed to save settings:', e);
    }
}

// Debounce helper
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    return ((...args: Parameters<T>) => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    }) as T;
}

// Create the settings store
export const settingsStore = proxy<AppSettings>(loadSettings());

// Debounced save function
const debouncedSave = debounce((settings: AppSettings) => {
    saveSettings(settings);
    console.log('[Settings] Saved to localStorage');
}, 500);

// Subscribe to changes and save
subscribe(settingsStore, () => {
    debouncedSave(settingsStore);
});

// Apply theme to document
export function applyTheme(theme: 'dark' | 'light'): void {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
    } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
    }
}

// Toggle theme helper
export function toggleTheme(): void {
    settingsStore.theme = settingsStore.theme === 'dark' ? 'light' : 'dark';
    applyTheme(settingsStore.theme);
}

// Initialize theme on load
applyTheme(settingsStore.theme);
