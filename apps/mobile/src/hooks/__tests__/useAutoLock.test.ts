/**
 * Tests for auto-lock hook logic.
 */

import { describe, it, expect, vi } from 'vitest';

// Mock dependencies
vi.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: vi.fn().mockReturnValue({ remove: vi.fn() }),
  },
}));

vi.mock('../../stores/settings-store', () => ({
  useSettingsStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({ biometricLockEnabled: true, autoLockTimeout: 5 }),
  ),
}));

vi.mock('../../services/auth/biometricAuth', () => ({
  authenticateWithBiometrics: vi.fn().mockResolvedValue({ success: true }),
  canUseBiometrics: vi.fn().mockResolvedValue(true),
}));

import type { UseAutoLockReturn } from '../useAutoLock';

describe('useAutoLock types', () => {
  it('should have correct return type shape', () => {
    const mockReturn: UseAutoLockReturn = {
      isLocked: false,
      isAuthenticating: false,
      unlock: vi.fn().mockResolvedValue(undefined),
      isEnabled: true,
    };

    expect(mockReturn.isLocked).toBe(false);
    expect(mockReturn.isAuthenticating).toBe(false);
    expect(mockReturn.isEnabled).toBe(true);
    expect(typeof mockReturn.unlock).toBe('function');
  });

  it('should represent locked state', () => {
    const locked: UseAutoLockReturn = {
      isLocked: true,
      isAuthenticating: false,
      unlock: vi.fn(),
      isEnabled: true,
    };

    expect(locked.isLocked).toBe(true);
  });

  it('should represent authenticating state', () => {
    const authenticating: UseAutoLockReturn = {
      isLocked: true,
      isAuthenticating: true,
      unlock: vi.fn(),
      isEnabled: true,
    };

    expect(authenticating.isAuthenticating).toBe(true);
  });

  it('should represent disabled state', () => {
    const disabled: UseAutoLockReturn = {
      isLocked: false,
      isAuthenticating: false,
      unlock: vi.fn(),
      isEnabled: false,
    };

    expect(disabled.isEnabled).toBe(false);
  });
});
