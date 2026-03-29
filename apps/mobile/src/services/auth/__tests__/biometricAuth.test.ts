/**
 * Tests for biometric authentication service.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────

const mockHasHardwareAsync = vi.fn();
const mockIsEnrolledAsync = vi.fn();
const mockSupportedAuthenticationTypesAsync = vi.fn();
const mockAuthenticateAsync = vi.fn();

vi.mock('expo-local-authentication', () => ({
  hasHardwareAsync: () => mockHasHardwareAsync(),
  isEnrolledAsync: () => mockIsEnrolledAsync(),
  supportedAuthenticationTypesAsync: () => mockSupportedAuthenticationTypesAsync(),
  authenticateAsync: (...args: unknown[]) => mockAuthenticateAsync(...args),
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3,
  },
}));

import {
  getBiometricCapabilities,
  authenticateWithBiometrics,
  canUseBiometrics,
} from '../biometricAuth';

// ─── Tests ────────────────────────────────────────────────────────

describe('biometricAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getBiometricCapabilities', () => {
    it('should detect Face ID', async () => {
      mockHasHardwareAsync.mockResolvedValue(true);
      mockIsEnrolledAsync.mockResolvedValue(true);
      mockSupportedAuthenticationTypesAsync.mockResolvedValue([2]); // FACIAL_RECOGNITION

      const caps = await getBiometricCapabilities();

      expect(caps.isAvailable).toBe(true);
      expect(caps.isEnrolled).toBe(true);
      expect(caps.type).toBe('facial');
      expect(caps.label).toBe('Face ID');
    });

    it('should detect fingerprint', async () => {
      mockHasHardwareAsync.mockResolvedValue(true);
      mockIsEnrolledAsync.mockResolvedValue(true);
      mockSupportedAuthenticationTypesAsync.mockResolvedValue([1]); // FINGERPRINT

      const caps = await getBiometricCapabilities();

      expect(caps.type).toBe('fingerprint');
      expect(caps.label).toBe('Fingerprint');
    });

    it('should handle no hardware', async () => {
      mockHasHardwareAsync.mockResolvedValue(false);

      const caps = await getBiometricCapabilities();

      expect(caps.isAvailable).toBe(false);
      expect(caps.isEnrolled).toBe(false);
      expect(caps.type).toBe('none');
    });

    it('should handle hardware but not enrolled', async () => {
      mockHasHardwareAsync.mockResolvedValue(true);
      mockIsEnrolledAsync.mockResolvedValue(false);
      mockSupportedAuthenticationTypesAsync.mockResolvedValue([1]);

      const caps = await getBiometricCapabilities();

      expect(caps.isAvailable).toBe(true);
      expect(caps.isEnrolled).toBe(false);
    });
  });

  describe('authenticateWithBiometrics', () => {
    it('should return success on successful auth', async () => {
      mockAuthenticateAsync.mockResolvedValue({ success: true });

      const result = await authenticateWithBiometrics();

      expect(result.success).toBe(true);
      expect(mockAuthenticateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ promptMessage: 'Authenticate to access FillIt' }),
      );
    });

    it('should handle user cancellation', async () => {
      mockAuthenticateAsync.mockResolvedValue({ success: false, error: 'user_cancel' });

      const result = await authenticateWithBiometrics();

      expect(result.success).toBe(false);
      expect(result.cancelled).toBe(true);
    });

    it('should handle system cancellation', async () => {
      mockAuthenticateAsync.mockResolvedValue({ success: false, error: 'system_cancel' });

      const result = await authenticateWithBiometrics();

      expect(result.success).toBe(false);
      expect(result.cancelled).toBe(true);
    });

    it('should handle not enrolled', async () => {
      mockAuthenticateAsync.mockResolvedValue({ success: false, error: 'not_enrolled' });

      const result = await authenticateWithBiometrics();

      expect(result.success).toBe(false);
      expect(result.error).toContain('No biometrics enrolled');
    });

    it('should handle not available', async () => {
      mockAuthenticateAsync.mockResolvedValue({ success: false, error: 'not_available' });

      const result = await authenticateWithBiometrics();

      expect(result.success).toBe(false);
      expect(result.error).toContain('not available');
    });

    it('should accept custom prompt message', async () => {
      mockAuthenticateAsync.mockResolvedValue({ success: true });

      await authenticateWithBiometrics({ promptMessage: 'Unlock to sign' });

      expect(mockAuthenticateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ promptMessage: 'Unlock to sign' }),
      );
    });

    it('should handle thrown errors', async () => {
      mockAuthenticateAsync.mockRejectedValue(new Error('Hardware error'));

      const result = await authenticateWithBiometrics();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Hardware error');
    });
  });

  describe('canUseBiometrics', () => {
    it('should return true when available and enrolled', async () => {
      mockHasHardwareAsync.mockResolvedValue(true);
      mockIsEnrolledAsync.mockResolvedValue(true);
      mockSupportedAuthenticationTypesAsync.mockResolvedValue([1]);

      expect(await canUseBiometrics()).toBe(true);
    });

    it('should return false when not available', async () => {
      mockHasHardwareAsync.mockResolvedValue(false);

      expect(await canUseBiometrics()).toBe(false);
    });

    it('should return false when not enrolled', async () => {
      mockHasHardwareAsync.mockResolvedValue(true);
      mockIsEnrolledAsync.mockResolvedValue(false);
      mockSupportedAuthenticationTypesAsync.mockResolvedValue([1]);

      expect(await canUseBiometrics()).toBe(false);
    });
  });
});
