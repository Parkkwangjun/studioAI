import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ApiKeys {
    openaiKey: string;
    falKey: string;
    googleCredentials: string;
    kieKey: string;
}

interface SettingsStore extends ApiKeys {
    setOpenAiKey: (key: string) => void;
    setFalKey: (key: string) => void;
    setGoogleCredentials: (credentials: string) => void;
    setKieKey: (key: string) => void;
    clearAllKeys: () => void;
    hasAllKeys: () => boolean;
}

export const useSettingsStore = create<SettingsStore>()(
    persist(
        (set, get) => ({
            // Initial state
            openaiKey: '',
            falKey: '',
            googleCredentials: '',
            kieKey: '',

            // Actions
            setOpenAiKey: (key: string) => set({ openaiKey: key }),
            setFalKey: (key: string) => set({ falKey: key }),
            setGoogleCredentials: (credentials: string) => set({ googleCredentials: credentials }),
            setKieKey: (key: string) => set({ kieKey: key }),

            clearAllKeys: () => set({
                openaiKey: '',
                falKey: '',
                googleCredentials: '',
                kieKey: ''
            }),

            hasAllKeys: () => {
                const state = get();
                return !!(
                    state.openaiKey &&
                    state.falKey &&
                    state.googleCredentials &&
                    state.kieKey
                );
            }
        }),
        {
            name: 'ai-studio-settings',
        }
    )
);
