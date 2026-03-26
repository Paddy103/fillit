/**
 * Barrel export for Zustand stores.
 */

export {
  useSettingsStore,
  selectThemePreference,
  selectBiometricLockEnabled,
  selectAutoLockTimeout,
  selectNetworkStatus,
  selectIsOnline,
  selectIsInternetReachable,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  VALID_AUTO_LOCK_TIMEOUTS,
  VALID_THEME_PREFERENCES,
  isValidThemePreference,
  isValidAutoLockTimeout,
} from './settings-store';
export type {
  ThemePreference,
  AutoLockTimeout,
  NetworkStatus,
  SettingsState,
  SettingsActions,
  SettingsStore,
} from './settings-store';

// Profile Store (S-22)
export {
  useProfileStore,
  selectProfiles,
  selectActiveProfileId,
  selectActiveProfile,
  selectPrimaryProfile,
  selectDependentProfiles,
  selectProfileCount,
  selectProfileById,
  selectActiveProfileAddresses,
  selectActiveProfileDocuments,
  selectActiveProfileRegistrations,
  selectActiveProfileEmergencyContacts,
  selectIsLoading as selectProfileIsLoading,
  selectIsMutating as selectProfileIsMutating,
  selectIsInitialized as selectProfileIsInitialized,
  selectError as selectProfileError,
  DEFAULT_PROFILE_STATE,
} from './profile-store';
export type {
  ProfileState,
  ProfileActions,
  ProfileStore,
  ProfileStoreError,
  ProfileOperation,
} from './profile-store';
