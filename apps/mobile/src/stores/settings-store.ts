/**
 * Settings Zustand store with AsyncStorage persistence.
 *
 * Manages theme preference, biometric lock, auto-lock timeout,
 * and network status. All settings except network status are
 * persisted to AsyncStorage via zustand/middleware.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, {
  type NetInfoState,
  type NetInfoSubscription,
} from '@react-native-community/netinfo';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Theme preference options */
export type ThemePreference = 'light' | 'dark' | 'system';

/** Auto-lock timeout in minutes. 0 means immediate, null means never. */
export type AutoLockTimeout = 0 | 1 | 5 | 15 | 30 | null;

/** Valid auto-lock timeout values for runtime validation */
export const VALID_AUTO_LOCK_TIMEOUTS: readonly AutoLockTimeout[] = [
  0,
  1,
  5,
  15,
  30,
  null,
] as const;

/** Valid theme preference values for runtime validation */
export const VALID_THEME_PREFERENCES: readonly ThemePreference[] = [
  'light',
  'dark',
  'system',
] as const;

/** Network connection status */
export interface NetworkStatus {
  /** Whether the device has an active internet connection */
  isConnected: boolean;
  /** Whether connectivity has been determined at least once */
  isInternetReachable: boolean | null;
}

/** Persisted settings state (saved to AsyncStorage) */
export interface SettingsState {
  /** Theme preference: light, dark, or follow system setting */
  themePreference: ThemePreference;
  /** Whether biometric authentication is enabled for app lock */
  biometricLockEnabled: boolean;
  /** Auto-lock timeout in minutes (0 = immediate, null = never) */
  autoLockTimeout: AutoLockTimeout;
  /** Current network connection status (not persisted) */
  networkStatus: NetworkStatus;
}

/** Actions available on the settings store */
export interface SettingsActions {
  /** Set the theme preference */
  setThemePreference: (preference: ThemePreference) => void;
  /** Toggle biometric lock on/off */
  setBiometricLockEnabled: (enabled: boolean) => void;
  /** Set the auto-lock timeout */
  setAutoLockTimeout: (timeout: AutoLockTimeout) => void;
  /** Update network status (called by NetInfo listener) */
  updateNetworkStatus: (status: NetworkStatus) => void;
  /** Reset all settings to defaults */
  resetSettings: () => void;
  /** Start listening for network status changes */
  startNetworkListener: () => void;
  /** Stop listening for network status changes */
  stopNetworkListener: () => void;
}

export type SettingsStore = SettingsState & SettingsActions;

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_SETTINGS: SettingsState = {
  themePreference: 'system',
  biometricLockEnabled: false,
  autoLockTimeout: 5,
  networkStatus: {
    isConnected: true,
    isInternetReachable: null,
  },
};

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/** Check if a value is a valid theme preference */
export function isValidThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && VALID_THEME_PREFERENCES.includes(value as ThemePreference);
}

/** Check if a value is a valid auto-lock timeout */
export function isValidAutoLockTimeout(value: unknown): value is AutoLockTimeout {
  return (
    value === null ||
    (typeof value === 'number' && VALID_AUTO_LOCK_TIMEOUTS.includes(value as AutoLockTimeout))
  );
}

// ---------------------------------------------------------------------------
// Network listener management
// ---------------------------------------------------------------------------

let netInfoUnsubscribe: NetInfoSubscription | null = null;

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

/** Storage key for persisted settings */
export const SETTINGS_STORAGE_KEY = 'fillit-settings';

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      // State
      ...DEFAULT_SETTINGS,

      // Actions
      setThemePreference: (preference: ThemePreference) => {
        if (!isValidThemePreference(preference)) {
          return;
        }
        set({ themePreference: preference });
      },

      setBiometricLockEnabled: (enabled: boolean) => {
        set({ biometricLockEnabled: enabled });
      },

      setAutoLockTimeout: (timeout: AutoLockTimeout) => {
        if (!isValidAutoLockTimeout(timeout)) {
          return;
        }
        set({ autoLockTimeout: timeout });
      },

      updateNetworkStatus: (status: NetworkStatus) => {
        set({ networkStatus: status });
      },

      resetSettings: () => {
        set({ ...DEFAULT_SETTINGS });
      },

      startNetworkListener: () => {
        // Avoid duplicate subscriptions
        if (netInfoUnsubscribe) {
          return;
        }

        netInfoUnsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
          useSettingsStore.getState().updateNetworkStatus({
            isConnected: state.isConnected ?? false,
            isInternetReachable: state.isInternetReachable ?? null,
          });
        });
      },

      stopNetworkListener: () => {
        if (netInfoUnsubscribe) {
          netInfoUnsubscribe();
          netInfoUnsubscribe = null;
        }
      },
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist user preferences, not transient network status
      partialize: (state) => ({
        themePreference: state.themePreference,
        biometricLockEnabled: state.biometricLockEnabled,
        autoLockTimeout: state.autoLockTimeout,
      }),
    },
  ),
);

// ---------------------------------------------------------------------------
// Typed selectors
// ---------------------------------------------------------------------------

/** Select the current theme preference */
export const selectThemePreference = (state: SettingsStore): ThemePreference =>
  state.themePreference;

/** Select whether biometric lock is enabled */
export const selectBiometricLockEnabled = (state: SettingsStore): boolean =>
  state.biometricLockEnabled;

/** Select the auto-lock timeout */
export const selectAutoLockTimeout = (state: SettingsStore): AutoLockTimeout =>
  state.autoLockTimeout;

/** Select the current network status */
export const selectNetworkStatus = (state: SettingsStore): NetworkStatus => state.networkStatus;

/** Select whether the device is currently online */
export const selectIsOnline = (state: SettingsStore): boolean => state.networkStatus.isConnected;

/** Select whether internet reachability has been determined */
export const selectIsInternetReachable = (state: SettingsStore): boolean | null =>
  state.networkStatus.isInternetReachable;
