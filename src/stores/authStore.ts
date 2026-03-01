/*
 * SolVault Messenger - Encrypted On-Chain Messaging on Solana
 * Copyright (C) 2026 Treasurium.ai
 * Licensed under GPLv3 - see LICENSE file
 */
// src/stores/authStore.ts
// Fully local auth — no backend dependency.
// User identity = Solana wallet address. Display name stored locally.
import {create} from 'zustand';
import {
  secureStore,
  secureRetrieve,
  secureDelete,
} from '../core/storage/secureStorage';
import {setNetwork, isDevnetActive} from '../core/solana/connection';

const DISPLAY_NAME_KEY = 'solvault_display_name';

interface AuthState {
  // State
  isAuthenticated: boolean;
  displayName: string | null;
  isLoading: boolean;
  isDevnet: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  setDisplayName: (name: string) => Promise<void>;
  logout: () => Promise<void>;
  toggleNetwork: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  displayName: null,
  isLoading: true,
  isDevnet: __DEV__,
  error: null,

  initialize: async () => {
    try {
      set({isLoading: true});

      const displayName = await secureRetrieve(DISPLAY_NAME_KEY);

      set({
        isAuthenticated: true,
        displayName,
        isLoading: false,
      });
    } catch (err: any) {
      set({isLoading: false, error: err.message});
    }
  },

  setDisplayName: async (name: string) => {
    await secureStore(DISPLAY_NAME_KEY, name);
    set({displayName: name});
  },

  logout: async () => {
    await secureDelete(DISPLAY_NAME_KEY);

    set({
      isAuthenticated: false,
      displayName: null,
    });
  },

  toggleNetwork: () => {
    const newDevnet = !get().isDevnet;
    setNetwork(newDevnet);
    set({isDevnet: newDevnet});
  },

  clearError: () => set({error: null}),
}));
