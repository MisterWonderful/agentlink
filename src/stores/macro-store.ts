/**
 * Macro Store
 * Zustand store for managing macros, favorites, and recent usage
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools, persist } from 'zustand/middleware';
import type {
  Macro,
  MacroCategory,
  MacroStore,
  MacroStoreState,
} from '@/types/macros';
import { defaultMacros } from '@/types/macros';
import { generateId, now } from './utils';

// ============================================
// Initial State
// ============================================

const initialState: MacroStoreState = {
  macros: [...defaultMacros],
  favorites: [],
  recent: [],
  isTrayOpen: false,
  searchQuery: '',
  activeCategory: 'all',
  isCreatorOpen: false,
  editingMacroId: null,
};

// ============================================
// Store Creation
// ============================================

export const useMacroStore = create<MacroStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // ============================================
        // Macro CRUD
        // ============================================

        addMacro: (macroData) => {
          const id = generateId();
          const timestamp = now();

          const macro: Macro = {
            ...macroData,
            id,
            createdAt: timestamp,
            updatedAt: timestamp,
          };

          set((state) => {
            state.macros.push(macro);
          });

          return macro;
        },

        removeMacro: (id) => {
          set((state) => {
            const index = state.macros.findIndex((m) => m.id === id);
            if (index !== -1) {
              // Only allow removing custom macros
              if (state.macros[index].isCustom) {
                state.macros.splice(index, 1);
                // Remove from favorites and recent
                state.favorites = state.favorites.filter((fid) => fid !== id);
                state.recent = state.recent.filter((rid) => rid !== id);
              }
            }
          });
        },

        updateMacro: (id, updates) => {
          set((state) => {
            const macro = state.macros.find((m) => m.id === id);
            if (macro && macro.isCustom) {
              Object.assign(macro, updates, { updatedAt: now() });
            }
          });
        },

        // ============================================
        // Favorites
        // ============================================

        toggleFavorite: (id) => {
          set((state) => {
            const index = state.favorites.indexOf(id);
            if (index === -1) {
              state.favorites.push(id);
            } else {
              state.favorites.splice(index, 1);
            }
          });
        },

        isFavorite: (id) => {
          return get().favorites.includes(id);
        },

        // ============================================
        // Recent Usage
        // ============================================

        recordUsage: (id) => {
          set((state) => {
            // Remove if already exists to move to front
            state.recent = state.recent.filter((rid) => rid !== id);
            // Add to front
            state.recent.unshift(id);
            // Keep only last 20
            state.recent = state.recent.slice(0, 20);
          });
        },

        clearRecent: () => {
          set((state) => {
            state.recent = [];
          });
        },

        // ============================================
        // Reordering
        // ============================================

        reorderMacros: (orderedIds) => {
          set((state) => {
            const macroMap = new Map(state.macros.map((m) => [m.id, m]));
            const reordered: Macro[] = [];

            // Update sort order based on new positions
            orderedIds.forEach((id, index) => {
              const macro = macroMap.get(id);
              if (macro) {
                macro.sortOrder = index;
                reordered.push(macro);
              }
            });

            // Add any remaining macros not in orderedIds
            state.macros.forEach((macro) => {
              if (!orderedIds.includes(macro.id)) {
                reordered.push(macro);
              }
            });

            state.macros = reordered;
          });
        },

        reorderFavorites: (orderedIds) => {
          set((state) => {
            state.favorites = orderedIds;
          });
        },

        // ============================================
        // UI State
        // ============================================

        setTrayOpen: (isOpen) => {
          set((state) => {
            state.isTrayOpen = isOpen;
          });
        },

        setSearchQuery: (query) => {
          set((state) => {
            state.searchQuery = query;
          });
        },

        setActiveCategory: (category) => {
          set((state) => {
            state.activeCategory = category;
          });
        },

        openCreator: (initialMacro) => {
          set((state) => {
            state.isCreatorOpen = true;
            state.editingMacroId = initialMacro?.id ?? null;
          });
        },

        closeCreator: () => {
          set((state) => {
            state.isCreatorOpen = false;
            state.editingMacroId = null;
          });
        },

        // ============================================
        // Getters (Computed)
        // ============================================

        getMacrosByCategory: (category) => {
          const { macros } = get();
          return macros
            .filter((m) => m.category === category)
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        },

        getFavoriteMacros: () => {
          const { macros, favorites } = get();
          return favorites
            .map((id) => macros.find((m) => m.id === id))
            .filter((m): m is Macro => m !== undefined);
        },

        getRecentMacros: (limit = 8) => {
          const { macros, recent } = get();
          return recent
            .slice(0, limit)
            .map((id) => macros.find((m) => m.id === id))
            .filter((m): m is Macro => m !== undefined);
        },

        getMacroById: (id) => {
          return get().macros.find((m) => m.id === id);
        },

        searchMacros: (query) => {
          const { macros } = get();
          if (!query.trim()) return macros;

          const lowerQuery = query.toLowerCase();
          return macros.filter(
            (m) =>
              m.name.toLowerCase().includes(lowerQuery) ||
              m.description.toLowerCase().includes(lowerQuery)
          );
        },
      })),
      {
        name: 'macro-store',
        partialize: (state) => ({
          macros: state.macros,
          favorites: state.favorites,
          recent: state.recent,
        }),
      }
    ),
    { name: 'macro-store' }
  )
);

// ============================================
// Selectors (for use with useShallow)
// ============================================

export const selectMacros = (state: MacroStore) => state.macros;
export const selectFavorites = (state: MacroStore) => state.favorites;
export const selectRecent = (state: MacroStore) => state.recent;
export const selectIsTrayOpen = (state: MacroStore) => state.isTrayOpen;
export const selectSearchQuery = (state: MacroStore) => state.searchQuery;
export const selectActiveCategory = (state: MacroStore) => state.activeCategory;
export const selectIsCreatorOpen = (state: MacroStore) => state.isCreatorOpen;
export const selectEditingMacroId = (state: MacroStore) => state.editingMacroId;

// ============================================
// Helper Hooks
// ============================================

export function useMacrosByCategory(category: MacroCategory) {
  return useMacroStore((state) => state.getMacrosByCategory(category));
}

export function useFavoriteMacros() {
  return useMacroStore((state) => state.getFavoriteMacros());
}

export function useRecentMacros(limit?: number) {
  return useMacroStore((state) => state.getRecentMacros(limit));
}

export function useMacroById(id: string) {
  return useMacroStore((state) => state.getMacroById(id));
}

export function useSearchedMacros(query: string) {
  return useMacroStore((state) => state.searchMacros(query));
}
