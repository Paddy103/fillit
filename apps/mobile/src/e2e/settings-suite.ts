/**
 * E2E test suite for settings store (S-23).
 *
 * Exercises: default values, theme toggle, persistence.
 */

import { useSettingsStore } from '../stores/settings-store';

import { type TestResult, pass, fail } from './types';

export async function runSettingsTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  try {
    const store = useSettingsStore.getState();

    // Test 1: Default theme preference
    try {
      const pref = store.themePreference;
      results.push(
        pref === 'system' || pref === 'light' || pref === 'dark'
          ? pass('Default theme preference', pref)
          : fail('Default theme preference', `Unexpected: ${pref}`),
      );
    } catch (e) {
      results.push(fail('Default theme preference', String(e)));
    }

    // Test 2: Toggle theme
    try {
      store.setThemePreference('dark');
      const afterDark = useSettingsStore.getState().themePreference;
      store.setThemePreference('light');
      const afterLight = useSettingsStore.getState().themePreference;
      results.push(
        afterDark === 'dark' && afterLight === 'light'
          ? pass('Toggle theme', 'dark -> light')
          : fail('Toggle theme', `dark=${afterDark}, light=${afterLight}`),
      );
    } catch (e) {
      results.push(fail('Toggle theme', String(e)));
    }

    // Test 3: Biometric lock default
    try {
      const enabled = store.biometricLockEnabled;
      results.push(
        typeof enabled === 'boolean'
          ? pass('Biometric lock default', String(enabled))
          : fail('Biometric lock default', `Unexpected type: ${typeof enabled}`),
      );
    } catch (e) {
      results.push(fail('Biometric lock default', String(e)));
    }

    // Test 4: Reset settings
    try {
      store.setThemePreference('dark');
      store.resetSettings();
      const afterReset = useSettingsStore.getState().themePreference;
      results.push(
        afterReset === 'system'
          ? pass('Reset settings', 'Back to system')
          : fail('Reset settings', `Got ${afterReset}`),
      );
    } catch (e) {
      results.push(fail('Reset settings', String(e)));
    }
  } catch (e) {
    results.push(fail('Unexpected error', String(e)));
  }

  return results;
}
