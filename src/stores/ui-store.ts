import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools, persist } from 'zustand/middleware';
import type { UIStore, Toast, OnboardingProgress } from './types';
import { generateId } from './utils';

const TOAST_DURATION = 5000; // 5 seconds

const initialState = {
  theme: 'system' as const,
  sidebarOpen: false,
  activeModal: null as string | null,
  toasts: [] as Toast[],
  isOffline: false,
  queuedMessageCount: 0,
  isFirstTimeUser: true,
  onboardingCompleted: false,
  onboardingProgress: {
    welcomeSeen: false,
    firstAgentAdded: false,
    firstConversationStarted: false,
    settingsExplored: false,
    completed: false,
  } as OnboardingProgress,
};

export const useUIStore = create<UIStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        setTheme: (theme) => {
          set((state) => {
            state.theme = theme;
          });

          // Apply theme to document
          if (typeof document !== 'undefined') {
            const root = document.documentElement;
            root.classList.remove('light', 'dark');

            if (theme === 'system') {
              const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
                .matches
                ? 'dark'
                : 'light';
              root.classList.add(systemTheme);
            } else {
              root.classList.add(theme);
            }
          }
        },

        toggleSidebar: () => {
          set((state) => {
            state.sidebarOpen = !state.sidebarOpen;
          });
        },

        setSidebarOpen: (open) => {
          set((state) => {
            state.sidebarOpen = open;
          });
        },

        openModal: (modalId) => {
          set((state) => {
            state.activeModal = modalId;
          });
        },

        closeModal: () => {
          set((state) => {
            state.activeModal = null;
          });
        },

        addToast: (toast) => {
          const id = generateId();

          set((state) => {
            state.toasts.push({ ...toast, id });

            // Limit number of toasts
            if (state.toasts.length > 5) {
              state.toasts.shift();
            }
          });

          // Auto-remove toast after duration
          setTimeout(() => {
            get().removeToast(id);
          }, TOAST_DURATION);

          return id;
        },

        removeToast: (id) => {
          set((state) => {
            const index = state.toasts.findIndex((t: Toast) => t.id === id);
            if (index !== -1) {
              state.toasts.splice(index, 1);
            }
          });
        },

        clearAllToasts: () => {
          set((state) => {
            state.toasts = [];
          });
        },

        setOffline: (isOffline) => {
          set((state) => {
            state.isOffline = isOffline;
          });

          // Show toast on state change
          if (isOffline) {
            get().addToast({
              title: 'You are offline',
              description: 'Messages will be queued until you reconnect',
              type: 'info',
            });
          } else if (get().queuedMessageCount > 0) {
            get().addToast({
              title: 'Back online',
              description: `${get().queuedMessageCount} queued messages will be sent`,
              type: 'success',
            });
          }
        },

        setQueuedMessageCount: (count) => {
          set((state) => {
            state.queuedMessageCount = Math.max(0, count);
          });
        },

        incrementQueuedCount: () => {
          set((state) => {
            state.queuedMessageCount += 1;
          });
        },

        decrementQueuedCount: () => {
          set((state) => {
            state.queuedMessageCount = Math.max(0, state.queuedMessageCount - 1);
          });
        },

        setFirstTimeUser: (isFirstTime) => {
          set((state) => {
            state.isFirstTimeUser = isFirstTime;
          });
        },

        completeOnboarding: () => {
          set((state) => {
            state.onboardingCompleted = true;
            state.onboardingProgress.completed = true;
            state.isFirstTimeUser = false;
          });
        },

        updateOnboardingProgress: (progress) => {
          set((state) => {
            state.onboardingProgress = {
              ...state.onboardingProgress,
              ...progress,
            };
            // Auto-complete if all steps are done
            if (
              state.onboardingProgress.welcomeSeen &&
              state.onboardingProgress.firstAgentAdded &&
              state.onboardingProgress.firstConversationStarted &&
              state.onboardingProgress.settingsExplored
            ) {
              state.onboardingProgress.completed = true;
              state.onboardingCompleted = true;
            }
          });
        },

        resetOnboarding: () => {
          set((state) => {
            state.isFirstTimeUser = true;
            state.onboardingCompleted = false;
            state.onboardingProgress = {
              welcomeSeen: false,
              firstAgentAdded: false,
              firstConversationStarted: false,
              settingsExplored: false,
              completed: false,
            };
          });
        },
      })),
      {
        name: 'ui-store',
        partialize: (state) => ({
          theme: state.theme,
          sidebarOpen: state.sidebarOpen,
          isFirstTimeUser: state.isFirstTimeUser,
          onboardingCompleted: state.onboardingCompleted,
          onboardingProgress: state.onboardingProgress,
        }),
      }
    ),
    { name: 'ui-store' }
  )
);

// Initialize theme on store creation (client-side only)
if (typeof window !== 'undefined') {
  const store = useUIStore.getState();
  store.setTheme(store.theme);

  // Listen for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    if (store.theme === 'system') {
      store.setTheme('system');
    }
  });
}
