/**
 * Auto-lock hook.
 *
 * Monitors app state (foreground/background) and triggers
 * biometric re-authentication after the configured timeout.
 * Blurs the screen in the app switcher for privacy.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useSettingsStore } from '../stores/settings-store';
import { authenticateWithBiometrics, canUseBiometrics } from '../services/auth/biometricAuth';

// ─── Types ─────────────────────────────────────────────────────────

export interface UseAutoLockReturn {
  /** Whether the app is currently locked. */
  isLocked: boolean;
  /** Whether biometric prompt is showing. */
  isAuthenticating: boolean;
  /** Manually trigger unlock (e.g., retry button). */
  unlock: () => Promise<void>;
  /** Whether auto-lock is enabled. */
  isEnabled: boolean;
}

// ─── Hook ──────────────────────────────────────────────────────────

export function useAutoLock(): UseAutoLockReturn {
  const biometricEnabled = useSettingsStore((s) => s.biometricLockEnabled);
  const autoLockTimeout = useSettingsStore((s) => s.autoLockTimeout);

  const [isLocked, setIsLocked] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const backgroundedAt = useRef<number | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const isEnabled = biometricEnabled && autoLockTimeout !== null;

  const performAuth = useCallback(async () => {
    const available = await canUseBiometrics();
    if (!available) {
      // Biometrics not available — unlock silently
      setIsLocked(false);
      return;
    }

    setIsAuthenticating(true);
    try {
      const result = await authenticateWithBiometrics({
        promptMessage: 'Unlock FillIt',
        fallbackToDeviceCredentials: true,
      });

      if (result.success) {
        setIsLocked(false);
      }
      // If failed/cancelled, stay locked — user can retry
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const unlock = useCallback(async () => {
    await performAuth();
  }, [performAuth]);

  useEffect(() => {
    if (!isEnabled) return;

    const handleAppStateChange = (nextState: AppStateStatus) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;

      if (nextState === 'background' || nextState === 'inactive') {
        // Record when the app went to background
        if (!backgroundedAt.current) {
          backgroundedAt.current = Date.now();
        }
      }

      if (nextState === 'active' && (prevState === 'background' || prevState === 'inactive')) {
        // App returned to foreground — check if timeout elapsed
        const elapsed = backgroundedAt.current ? Date.now() - backgroundedAt.current : Infinity;

        const timeoutMs = autoLockTimeout === 0 ? 0 : (autoLockTimeout ?? 5) * 60 * 1000;

        if (elapsed >= timeoutMs) {
          setIsLocked(true);
          performAuth();
        }

        backgroundedAt.current = null;
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [isEnabled, autoLockTimeout, performAuth]);

  return {
    isLocked,
    isAuthenticating,
    unlock,
    isEnabled,
  };
}
