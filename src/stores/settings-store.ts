import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppSettings } from "@/types";

const defaultSettings: AppSettings = {
  theme: "dark",
  fontSize: "medium",
  enterToSend: true,
  showTimestamp: true,
  autoScroll: true,
  soundEnabled: false,
  hapticFeedback: true,
  offlineMode: true,
  syncEnabled: true,
};

interface SettingsState extends AppSettings {
  // Actions
  updateSettings: (settings: Partial<AppSettings>) => void;
  resetSettings: () => void;
  setTheme: (theme: AppSettings["theme"]) => void;
  setFontSize: (fontSize: AppSettings["fontSize"]) => void;
  toggleEnterToSend: () => void;
  toggleShowTimestamp: () => void;
  toggleAutoScroll: () => void;
  toggleSoundEnabled: () => void;
  toggleHapticFeedback: () => void;
  toggleOfflineMode: () => void;
  toggleSyncEnabled: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,

      updateSettings: (newSettings) =>
        set((state) => ({ ...state, ...newSettings })),

      resetSettings: () => set(defaultSettings),

      setTheme: (theme) => set({ theme }),

      setFontSize: (fontSize) => set({ fontSize }),

      toggleEnterToSend: () =>
        set((state) => ({ enterToSend: !state.enterToSend })),

      toggleShowTimestamp: () =>
        set((state) => ({ showTimestamp: !state.showTimestamp })),

      toggleAutoScroll: () =>
        set((state) => ({ autoScroll: !state.autoScroll })),

      toggleSoundEnabled: () =>
        set((state) => ({ soundEnabled: !state.soundEnabled })),

      toggleHapticFeedback: () =>
        set((state) => ({ hapticFeedback: !state.hapticFeedback })),

      toggleOfflineMode: () =>
        set((state) => ({ offlineMode: !state.offlineMode })),

      toggleSyncEnabled: () =>
        set((state) => ({ syncEnabled: !state.syncEnabled })),
    }),
    {
      name: "agentlink-settings",
    }
  )
);
