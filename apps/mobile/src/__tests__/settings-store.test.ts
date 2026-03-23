import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';

// ---------------------------------------------------------------------------
// Mock AsyncStorage
// ---------------------------------------------------------------------------

const asyncStorageData: Record<string, string> = {};

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(asyncStorageData[key] ?? null)),
    setItem: vi.fn((key: string, value: string) => {
      asyncStorageData[key] = value;
      return Promise.resolve();
    }),
    removeItem: vi.fn((key: string) => {
      delete asyncStorageData[key];
      return Promise.resolve();
    }),
  },
}));

// ---------------------------------------------------------------------------
// Mock @react-native-community/netinfo
// ---------------------------------------------------------------------------

type NetInfoCallback = (state: {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
}) => void;

let netInfoCallback: NetInfoCallback | null = null;
const mockUnsubscribe = vi.fn();

vi.mock('@react-native-community/netinfo', () => ({
  default: {
    addEventListener: vi.fn((callback: NetInfoCallback) => {
      netInfoCallback = callback;
      return mockUnsubscribe;
    }),
  },
}));

// ---------------------------------------------------------------------------
// Import under test (after mocks are set up)
// ---------------------------------------------------------------------------

import {
  useSettingsStore,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  VALID_AUTO_LOCK_TIMEOUTS,
  VALID_THEME_PREFERENCES,
  isValidThemePreference,
  isValidAutoLockTimeout,
  selectThemePreference,
  selectBiometricLockEnabled,
  selectAutoLockTimeout,
  selectNetworkStatus,
  selectIsOnline,
  selectIsInternetReachable,
  type ThemePreference,
  type AutoLockTimeout,
  type NetworkStatus,
} from '../stores/settings-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Reset store to defaults between tests (merge, not replace, to keep actions) */
function resetStore(): void {
  useSettingsStore.setState({ ...DEFAULT_SETTINGS });
}

/** Clear all mock data */
function clearAsyncStorage(): void {
  for (const key of Object.keys(asyncStorageData)) {
    delete asyncStorageData[key];
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  resetStore();
  clearAsyncStorage();
  netInfoCallback = null;
  mockUnsubscribe.mockClear();
  vi.clearAllMocks();
});

afterEach(() => {
  // Stop any active network listener
  useSettingsStore.getState().stopNetworkListener();
});

describe('settings store — initial state', () => {
  it('should have correct default theme preference', () => {
    const state = useSettingsStore.getState();
    expect(state.themePreference).toBe('system');
  });

  it('should have biometric lock disabled by default', () => {
    const state = useSettingsStore.getState();
    expect(state.biometricLockEnabled).toBe(false);
  });

  it('should have auto-lock timeout of 5 minutes by default', () => {
    const state = useSettingsStore.getState();
    expect(state.autoLockTimeout).toBe(5);
  });

  it('should have network status as connected by default', () => {
    const state = useSettingsStore.getState();
    expect(state.networkStatus.isConnected).toBe(true);
  });

  it('should have internet reachable as null initially', () => {
    const state = useSettingsStore.getState();
    expect(state.networkStatus.isInternetReachable).toBeNull();
  });

  it('should match DEFAULT_SETTINGS constant', () => {
    const state = useSettingsStore.getState();
    expect(state.themePreference).toBe(DEFAULT_SETTINGS.themePreference);
    expect(state.biometricLockEnabled).toBe(DEFAULT_SETTINGS.biometricLockEnabled);
    expect(state.autoLockTimeout).toBe(DEFAULT_SETTINGS.autoLockTimeout);
    expect(state.networkStatus).toEqual(DEFAULT_SETTINGS.networkStatus);
  });
});

describe('settings store — setThemePreference', () => {
  it('should set theme to light', () => {
    useSettingsStore.getState().setThemePreference('light');
    expect(useSettingsStore.getState().themePreference).toBe('light');
  });

  it('should set theme to dark', () => {
    useSettingsStore.getState().setThemePreference('dark');
    expect(useSettingsStore.getState().themePreference).toBe('dark');
  });

  it('should set theme to system', () => {
    useSettingsStore.getState().setThemePreference('light');
    useSettingsStore.getState().setThemePreference('system');
    expect(useSettingsStore.getState().themePreference).toBe('system');
  });

  it('should cycle through all valid theme preferences', () => {
    for (const pref of VALID_THEME_PREFERENCES) {
      useSettingsStore.getState().setThemePreference(pref);
      expect(useSettingsStore.getState().themePreference).toBe(pref);
    }
  });

  it('should ignore invalid theme preference values', () => {
    useSettingsStore.getState().setThemePreference('light');
    // Force an invalid value through type assertion
    useSettingsStore.getState().setThemePreference('invalid' as ThemePreference);
    // Should remain at previous valid value
    expect(useSettingsStore.getState().themePreference).toBe('light');
  });
});

describe('settings store — setBiometricLockEnabled', () => {
  it('should enable biometric lock', () => {
    useSettingsStore.getState().setBiometricLockEnabled(true);
    expect(useSettingsStore.getState().biometricLockEnabled).toBe(true);
  });

  it('should disable biometric lock', () => {
    useSettingsStore.getState().setBiometricLockEnabled(true);
    useSettingsStore.getState().setBiometricLockEnabled(false);
    expect(useSettingsStore.getState().biometricLockEnabled).toBe(false);
  });

  it('should toggle biometric lock repeatedly', () => {
    const store = useSettingsStore.getState();
    store.setBiometricLockEnabled(true);
    expect(useSettingsStore.getState().biometricLockEnabled).toBe(true);
    useSettingsStore.getState().setBiometricLockEnabled(false);
    expect(useSettingsStore.getState().biometricLockEnabled).toBe(false);
    useSettingsStore.getState().setBiometricLockEnabled(true);
    expect(useSettingsStore.getState().biometricLockEnabled).toBe(true);
  });
});

describe('settings store — setAutoLockTimeout', () => {
  it('should set auto-lock timeout to 0 (immediate)', () => {
    useSettingsStore.getState().setAutoLockTimeout(0);
    expect(useSettingsStore.getState().autoLockTimeout).toBe(0);
  });

  it('should set auto-lock timeout to 1 minute', () => {
    useSettingsStore.getState().setAutoLockTimeout(1);
    expect(useSettingsStore.getState().autoLockTimeout).toBe(1);
  });

  it('should set auto-lock timeout to 15 minutes', () => {
    useSettingsStore.getState().setAutoLockTimeout(15);
    expect(useSettingsStore.getState().autoLockTimeout).toBe(15);
  });

  it('should set auto-lock timeout to 30 minutes', () => {
    useSettingsStore.getState().setAutoLockTimeout(30);
    expect(useSettingsStore.getState().autoLockTimeout).toBe(30);
  });

  it('should set auto-lock timeout to null (never)', () => {
    useSettingsStore.getState().setAutoLockTimeout(null);
    expect(useSettingsStore.getState().autoLockTimeout).toBeNull();
  });

  it('should cycle through all valid timeouts', () => {
    for (const timeout of VALID_AUTO_LOCK_TIMEOUTS) {
      useSettingsStore.getState().setAutoLockTimeout(timeout);
      expect(useSettingsStore.getState().autoLockTimeout).toBe(timeout);
    }
  });

  it('should ignore invalid timeout values', () => {
    useSettingsStore.getState().setAutoLockTimeout(15);
    // Force an invalid value through type assertion
    useSettingsStore.getState().setAutoLockTimeout(7 as AutoLockTimeout);
    // Should remain at previous valid value
    expect(useSettingsStore.getState().autoLockTimeout).toBe(15);
  });

  it('should ignore negative timeout values', () => {
    useSettingsStore.getState().setAutoLockTimeout(5);
    useSettingsStore.getState().setAutoLockTimeout(-1 as AutoLockTimeout);
    expect(useSettingsStore.getState().autoLockTimeout).toBe(5);
  });
});

describe('settings store — updateNetworkStatus', () => {
  it('should update network status to offline', () => {
    useSettingsStore.getState().updateNetworkStatus({
      isConnected: false,
      isInternetReachable: false,
    });
    const status = useSettingsStore.getState().networkStatus;
    expect(status.isConnected).toBe(false);
    expect(status.isInternetReachable).toBe(false);
  });

  it('should update network status to online', () => {
    useSettingsStore.getState().updateNetworkStatus({
      isConnected: false,
      isInternetReachable: false,
    });
    useSettingsStore.getState().updateNetworkStatus({
      isConnected: true,
      isInternetReachable: true,
    });
    const status = useSettingsStore.getState().networkStatus;
    expect(status.isConnected).toBe(true);
    expect(status.isInternetReachable).toBe(true);
  });

  it('should handle null isInternetReachable', () => {
    useSettingsStore.getState().updateNetworkStatus({
      isConnected: true,
      isInternetReachable: null,
    });
    expect(useSettingsStore.getState().networkStatus.isInternetReachable).toBeNull();
  });
});

describe('settings store — resetSettings', () => {
  it('should reset all settings to defaults', () => {
    // Change all settings
    useSettingsStore.getState().setThemePreference('dark');
    useSettingsStore.getState().setBiometricLockEnabled(true);
    useSettingsStore.getState().setAutoLockTimeout(30);
    useSettingsStore.getState().updateNetworkStatus({
      isConnected: false,
      isInternetReachable: false,
    });

    // Reset
    useSettingsStore.getState().resetSettings();

    const state = useSettingsStore.getState();
    expect(state.themePreference).toBe(DEFAULT_SETTINGS.themePreference);
    expect(state.biometricLockEnabled).toBe(DEFAULT_SETTINGS.biometricLockEnabled);
    expect(state.autoLockTimeout).toBe(DEFAULT_SETTINGS.autoLockTimeout);
    expect(state.networkStatus).toEqual(DEFAULT_SETTINGS.networkStatus);
  });

  it('should be idempotent — resetting twice yields same state', () => {
    useSettingsStore.getState().setThemePreference('dark');
    useSettingsStore.getState().resetSettings();
    const first = { ...useSettingsStore.getState() };

    useSettingsStore.getState().resetSettings();
    const second = useSettingsStore.getState();

    expect(second.themePreference).toBe(first.themePreference);
    expect(second.biometricLockEnabled).toBe(first.biometricLockEnabled);
    expect(second.autoLockTimeout).toBe(first.autoLockTimeout);
    expect(second.networkStatus).toEqual(first.networkStatus);
  });
});

describe('settings store — network listener', () => {
  it('should register a listener on startNetworkListener', () => {
    useSettingsStore.getState().startNetworkListener();
    expect(NetInfo.addEventListener).toHaveBeenCalledOnce();
  });

  it('should not register duplicate listeners', () => {
    useSettingsStore.getState().startNetworkListener();
    useSettingsStore.getState().startNetworkListener();
    expect(NetInfo.addEventListener).toHaveBeenCalledOnce();
  });

  it('should update store when network status changes', () => {
    useSettingsStore.getState().startNetworkListener();
    expect(netInfoCallback).not.toBeNull();

    // Simulate network going offline
    netInfoCallback!({
      isConnected: false,
      isInternetReachable: false,
    });

    const status = useSettingsStore.getState().networkStatus;
    expect(status.isConnected).toBe(false);
    expect(status.isInternetReachable).toBe(false);
  });

  it('should handle null values from NetInfo gracefully', () => {
    useSettingsStore.getState().startNetworkListener();

    netInfoCallback!({
      isConnected: null,
      isInternetReachable: null,
    });

    const status = useSettingsStore.getState().networkStatus;
    expect(status.isConnected).toBe(false); // null coalesced to false
    expect(status.isInternetReachable).toBeNull();
  });

  it('should unsubscribe on stopNetworkListener', () => {
    useSettingsStore.getState().startNetworkListener();
    useSettingsStore.getState().stopNetworkListener();
    expect(mockUnsubscribe).toHaveBeenCalledOnce();
  });

  it('should not throw when stopping without starting', () => {
    expect(() => useSettingsStore.getState().stopNetworkListener()).not.toThrow();
  });

  it('should allow restarting listener after stop', () => {
    useSettingsStore.getState().startNetworkListener();
    useSettingsStore.getState().stopNetworkListener();
    useSettingsStore.getState().startNetworkListener();
    expect(NetInfo.addEventListener).toHaveBeenCalledTimes(2);
  });
});

describe('settings store — AsyncStorage persistence', () => {
  it('should call setItem on AsyncStorage when a setting changes', async () => {
    useSettingsStore.getState().setThemePreference('dark');

    // Give persist middleware time to flush
    await vi.waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    const calls = (AsyncStorage.setItem as Mock).mock.calls;
    const lastCall = calls[calls.length - 1] as [string, string];
    expect(lastCall[0]).toBe(SETTINGS_STORAGE_KEY);

    const persisted = JSON.parse(lastCall[1]) as {
      state: Record<string, unknown>;
    };
    expect(persisted.state.themePreference).toBe('dark');
  });

  it('should NOT persist networkStatus to AsyncStorage', async () => {
    useSettingsStore.getState().updateNetworkStatus({
      isConnected: false,
      isInternetReachable: false,
    });

    // Give persist middleware time to flush
    await vi.waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    const calls = (AsyncStorage.setItem as Mock).mock.calls;
    const lastCall = calls[calls.length - 1] as [string, string];
    const persisted = JSON.parse(lastCall[1]) as {
      state: Record<string, unknown>;
    };
    expect(persisted.state).not.toHaveProperty('networkStatus');
  });

  it('should persist biometricLockEnabled to AsyncStorage', async () => {
    useSettingsStore.getState().setBiometricLockEnabled(true);

    await vi.waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    const calls = (AsyncStorage.setItem as Mock).mock.calls;
    const lastCall = calls[calls.length - 1] as [string, string];
    const persisted = JSON.parse(lastCall[1]) as {
      state: Record<string, unknown>;
    };
    expect(persisted.state.biometricLockEnabled).toBe(true);
  });

  it('should persist autoLockTimeout to AsyncStorage', async () => {
    useSettingsStore.getState().setAutoLockTimeout(30);

    await vi.waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    const calls = (AsyncStorage.setItem as Mock).mock.calls;
    const lastCall = calls[calls.length - 1] as [string, string];
    const persisted = JSON.parse(lastCall[1]) as {
      state: Record<string, unknown>;
    };
    expect(persisted.state.autoLockTimeout).toBe(30);
  });

  it('should use the correct storage key', async () => {
    useSettingsStore.getState().setThemePreference('light');

    await vi.waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    const calls = (AsyncStorage.setItem as Mock).mock.calls;
    const keys = calls.map((call: unknown[]) => call[0]);
    expect(keys).toContain(SETTINGS_STORAGE_KEY);
  });
});

describe('settings store — typed selectors', () => {
  it('selectThemePreference returns theme', () => {
    useSettingsStore.getState().setThemePreference('dark');
    const result = selectThemePreference(useSettingsStore.getState());
    expect(result).toBe('dark');
  });

  it('selectBiometricLockEnabled returns biometric lock state', () => {
    useSettingsStore.getState().setBiometricLockEnabled(true);
    const result = selectBiometricLockEnabled(useSettingsStore.getState());
    expect(result).toBe(true);
  });

  it('selectAutoLockTimeout returns auto-lock timeout', () => {
    useSettingsStore.getState().setAutoLockTimeout(30);
    const result = selectAutoLockTimeout(useSettingsStore.getState());
    expect(result).toBe(30);
  });

  it('selectNetworkStatus returns full network status', () => {
    const networkStatus: NetworkStatus = {
      isConnected: false,
      isInternetReachable: false,
    };
    useSettingsStore.getState().updateNetworkStatus(networkStatus);
    const result = selectNetworkStatus(useSettingsStore.getState());
    expect(result).toEqual(networkStatus);
  });

  it('selectIsOnline returns connection status', () => {
    useSettingsStore.getState().updateNetworkStatus({
      isConnected: false,
      isInternetReachable: false,
    });
    expect(selectIsOnline(useSettingsStore.getState())).toBe(false);
  });

  it('selectIsInternetReachable returns reachability', () => {
    useSettingsStore.getState().updateNetworkStatus({
      isConnected: true,
      isInternetReachable: true,
    });
    expect(selectIsInternetReachable(useSettingsStore.getState())).toBe(true);
  });

  it('selectIsInternetReachable returns null when unknown', () => {
    expect(selectIsInternetReachable(useSettingsStore.getState())).toBeNull();
  });
});

describe('settings store — validation helpers', () => {
  describe('isValidThemePreference', () => {
    it('should accept "light"', () => {
      expect(isValidThemePreference('light')).toBe(true);
    });

    it('should accept "dark"', () => {
      expect(isValidThemePreference('dark')).toBe(true);
    });

    it('should accept "system"', () => {
      expect(isValidThemePreference('system')).toBe(true);
    });

    it('should reject empty string', () => {
      expect(isValidThemePreference('')).toBe(false);
    });

    it('should reject arbitrary string', () => {
      expect(isValidThemePreference('sepia')).toBe(false);
    });

    it('should reject number', () => {
      expect(isValidThemePreference(42)).toBe(false);
    });

    it('should reject null', () => {
      expect(isValidThemePreference(null)).toBe(false);
    });

    it('should reject undefined', () => {
      expect(isValidThemePreference(undefined)).toBe(false);
    });

    it('should reject boolean', () => {
      expect(isValidThemePreference(true)).toBe(false);
    });
  });

  describe('isValidAutoLockTimeout', () => {
    it('should accept 0', () => {
      expect(isValidAutoLockTimeout(0)).toBe(true);
    });

    it('should accept 1', () => {
      expect(isValidAutoLockTimeout(1)).toBe(true);
    });

    it('should accept 5', () => {
      expect(isValidAutoLockTimeout(5)).toBe(true);
    });

    it('should accept 15', () => {
      expect(isValidAutoLockTimeout(15)).toBe(true);
    });

    it('should accept 30', () => {
      expect(isValidAutoLockTimeout(30)).toBe(true);
    });

    it('should accept null (never)', () => {
      expect(isValidAutoLockTimeout(null)).toBe(true);
    });

    it('should reject non-allowed numbers', () => {
      expect(isValidAutoLockTimeout(7)).toBe(false);
      expect(isValidAutoLockTimeout(10)).toBe(false);
      expect(isValidAutoLockTimeout(60)).toBe(false);
    });

    it('should reject negative numbers', () => {
      expect(isValidAutoLockTimeout(-1)).toBe(false);
    });

    it('should reject strings', () => {
      expect(isValidAutoLockTimeout('5')).toBe(false);
    });

    it('should reject undefined', () => {
      expect(isValidAutoLockTimeout(undefined)).toBe(false);
    });

    it('should reject boolean', () => {
      expect(isValidAutoLockTimeout(true)).toBe(false);
    });
  });
});

describe('settings store — concurrent updates', () => {
  it('should handle rapid sequential updates correctly', () => {
    const store = useSettingsStore.getState();
    store.setThemePreference('dark');
    useSettingsStore.getState().setBiometricLockEnabled(true);
    useSettingsStore.getState().setAutoLockTimeout(30);

    const state = useSettingsStore.getState();
    expect(state.themePreference).toBe('dark');
    expect(state.biometricLockEnabled).toBe(true);
    expect(state.autoLockTimeout).toBe(30);
  });

  it('should handle interleaved setting and network updates', () => {
    useSettingsStore.getState().setThemePreference('dark');
    useSettingsStore.getState().updateNetworkStatus({
      isConnected: false,
      isInternetReachable: false,
    });
    useSettingsStore.getState().setBiometricLockEnabled(true);

    const state = useSettingsStore.getState();
    expect(state.themePreference).toBe('dark');
    expect(state.networkStatus.isConnected).toBe(false);
    expect(state.biometricLockEnabled).toBe(true);
  });
});

describe('settings store — constants', () => {
  it('SETTINGS_STORAGE_KEY should be a non-empty string', () => {
    expect(typeof SETTINGS_STORAGE_KEY).toBe('string');
    expect(SETTINGS_STORAGE_KEY.length).toBeGreaterThan(0);
  });

  it('VALID_THEME_PREFERENCES should contain exactly 3 values', () => {
    expect(VALID_THEME_PREFERENCES).toHaveLength(3);
    expect(VALID_THEME_PREFERENCES).toContain('light');
    expect(VALID_THEME_PREFERENCES).toContain('dark');
    expect(VALID_THEME_PREFERENCES).toContain('system');
  });

  it('VALID_AUTO_LOCK_TIMEOUTS should contain exactly 6 values', () => {
    expect(VALID_AUTO_LOCK_TIMEOUTS).toHaveLength(6);
    expect(VALID_AUTO_LOCK_TIMEOUTS).toContain(0);
    expect(VALID_AUTO_LOCK_TIMEOUTS).toContain(1);
    expect(VALID_AUTO_LOCK_TIMEOUTS).toContain(5);
    expect(VALID_AUTO_LOCK_TIMEOUTS).toContain(15);
    expect(VALID_AUTO_LOCK_TIMEOUTS).toContain(30);
    expect(VALID_AUTO_LOCK_TIMEOUTS).toContain(null);
  });

  it('DEFAULT_SETTINGS should have all required keys', () => {
    expect(DEFAULT_SETTINGS).toHaveProperty('themePreference');
    expect(DEFAULT_SETTINGS).toHaveProperty('biometricLockEnabled');
    expect(DEFAULT_SETTINGS).toHaveProperty('autoLockTimeout');
    expect(DEFAULT_SETTINGS).toHaveProperty('networkStatus');
  });
});
