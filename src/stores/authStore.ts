// src/stores/authStore.ts
import {create} from 'zustand';
import {
  secureStore,
  secureRetrieve,
  secureDelete,
} from '../core/storage/secureStorage';
import {
  signup as apiSignup,
  login as apiLogin,
  getLoginChallenge,
} from '../core/api/backendClient';
import {setNetwork, isDevnetActive} from '../core/solana/connection';

const AUTH_TOKEN_KEY = 'solvault_auth_token';
const REFRESH_TOKEN_KEY = 'solvault_refresh_token';
const USER_ID_KEY = 'solvault_user_id';
const DISPLAY_NAME_KEY = 'solvault_display_name';

interface AuthState {
  // State
  isAuthenticated: boolean;
  userId: string | null;
  displayName: string | null;
  isLoading: boolean;
  isDevnet: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  signup: (params: {
    displayName: string;
    solanaAddress: string;
    encryptionPubKey: string;
    email?: string;
    phone?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  toggleNetwork: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  userId: null,
  displayName: null,
  isLoading: true,
  isDevnet: __DEV__,
  error: null,

  initialize: async () => {
    try {
      set({isLoading: true});

      const token = await secureRetrieve(AUTH_TOKEN_KEY);
      const userId = await secureRetrieve(USER_ID_KEY);
      const displayName = await secureRetrieve(DISPLAY_NAME_KEY);

      if (token && userId) {
        set({
          isAuthenticated: true,
          userId,
          displayName,
          isLoading: false,
        });
      } else {
        set({isAuthenticated: false, isLoading: false});
      }
    } catch (err: any) {
      set({isLoading: false, error: err.message});
    }
  },

  signup: async params => {
    try {
      set({isLoading: true, error: null});

      const response = await apiSignup(params);

      await secureStore(AUTH_TOKEN_KEY, response.token);
      await secureStore(REFRESH_TOKEN_KEY, response.refreshToken);
      await secureStore(USER_ID_KEY, response.userId);
      await secureStore(DISPLAY_NAME_KEY, params.displayName);

      set({
        isAuthenticated: true,
        userId: response.userId,
        displayName: params.displayName,
        isLoading: false,
      });
    } catch (err: any) {
      set({isLoading: false, error: err.message});
      throw err;
    }
  },

  logout: async () => {
    await secureDelete(AUTH_TOKEN_KEY);
    await secureDelete(REFRESH_TOKEN_KEY);
    await secureDelete(USER_ID_KEY);
    await secureDelete(DISPLAY_NAME_KEY);

    set({
      isAuthenticated: false,
      userId: null,
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
