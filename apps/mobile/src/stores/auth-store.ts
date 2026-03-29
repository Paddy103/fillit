/**
 * Auth Zustand store with AsyncStorage persistence.
 *
 * Manages authentication state: current user, provider, token,
 * and loading states. Persists auth across app restarts.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// ─── Types ─────────────────────────────────────────────────────────

export type AuthProvider = 'google' | 'apple' | null;

export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
  photo: string | null;
  provider: AuthProvider;
}

export interface AuthState {
  /** The currently authenticated user. */
  user: AuthUser | null;
  /** The current auth provider. */
  provider: AuthProvider;
  /** Whether the user is authenticated. */
  isAuthenticated: boolean;
  /** Whether auth state is being loaded/verified. */
  isLoading: boolean;
  /** Whether initial auth check has completed. */
  isReady: boolean;
  /** Auth error message. */
  error: string | null;
}

export interface AuthActions {
  /** Set the authenticated user after successful sign-in. */
  setUser: (user: AuthUser) => void;
  /** Clear auth state (sign-out). */
  clearUser: () => void;
  /** Set loading state. */
  setLoading: (isLoading: boolean) => void;
  /** Mark auth as ready (initial check complete). */
  setReady: () => void;
  /** Set error message. */
  setError: (error: string | null) => void;
  /** Reset the entire auth state. */
  reset: () => void;
}

export type AuthStore = AuthState & AuthActions;

// ─── Defaults ─────────────────────────────────────────────────────

const DEFAULT_AUTH_STATE: AuthState = {
  user: null,
  provider: null,
  isAuthenticated: false,
  isLoading: false,
  isReady: false,
  error: null,
};

// ─── Store ────────────────────────────────────────────────────────

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      ...DEFAULT_AUTH_STATE,

      setUser: (user: AuthUser) =>
        set({
          user,
          provider: user.provider,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        }),

      clearUser: () =>
        set({
          user: null,
          provider: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        }),

      setLoading: (isLoading: boolean) => set({ isLoading }),

      setReady: () => set({ isReady: true }),

      setError: (error: string | null) => set({ error, isLoading: false }),

      reset: () => set({ ...DEFAULT_AUTH_STATE }),
    }),
    {
      name: 'fillit-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        provider: state.provider,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

// ─── Selectors ────────────────────────────────────────────────────

export const selectIsAuthenticated = (state: AuthStore): boolean => state.isAuthenticated;
export const selectAuthUser = (state: AuthStore): AuthUser | null => state.user;
export const selectAuthProvider = (state: AuthStore): AuthProvider => state.provider;
export const selectAuthIsLoading = (state: AuthStore): boolean => state.isLoading;
export const selectAuthIsReady = (state: AuthStore): boolean => state.isReady;
export const selectAuthError = (state: AuthStore): string | null => state.error;
