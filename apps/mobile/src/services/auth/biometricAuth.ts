/**
 * Biometric authentication service.
 *
 * Wraps expo-local-authentication to provide Face ID, fingerprint,
 * and device PIN fallback. Settings are persisted in the settings store.
 */

import * as LocalAuthentication from 'expo-local-authentication';

// ─── Types ─────────────────────────────────────────────────────────

export type BiometricType = 'fingerprint' | 'facial' | 'iris' | 'none';

export interface BiometricCapabilities {
  /** Whether any biometric hardware is available. */
  isAvailable: boolean;
  /** Whether biometrics are enrolled (user has set up Face ID/fingerprint). */
  isEnrolled: boolean;
  /** The type of biometric available. */
  type: BiometricType;
  /** Human-readable label for the biometric type. */
  label: string;
}

export interface BiometricAuthResult {
  /** Whether authentication succeeded. */
  success: boolean;
  /** Error message if authentication failed. */
  error?: string;
  /** Whether the user cancelled the prompt. */
  cancelled?: boolean;
}

export interface BiometricPromptOptions {
  /** The message shown in the biometric prompt. @default 'Authenticate to access FillIt' */
  promptMessage?: string;
  /** Whether to allow device PIN/password as fallback. @default true */
  fallbackToDeviceCredentials?: boolean;
  /** Cancel button label (Android only). @default 'Cancel' */
  cancelLabel?: string;
  /** Whether to disable the device credential fallback button. @default false */
  disableDeviceFallback?: boolean;
}

// ─── Errors ───────────────────────────────────────────────────────

export class BiometricError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'BiometricError';
    this.cause = cause;
  }
}

// ─── Service ──────────────────────────────────────────────────────

/**
 * Check the device's biometric capabilities.
 *
 * Returns information about what biometric hardware is available,
 * whether biometrics are enrolled, and the specific type.
 */
export async function getBiometricCapabilities(): Promise<BiometricCapabilities> {
  const isAvailable = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = isAvailable ? await LocalAuthentication.isEnrolledAsync() : false;

  const supportedTypes = isAvailable
    ? await LocalAuthentication.supportedAuthenticationTypesAsync()
    : [];

  const type = mapBiometricType(supportedTypes);
  const label = getBiometricLabel(type);

  return { isAvailable, isEnrolled, type, label };
}

/**
 * Authenticate the user with biometrics (Face ID, fingerprint, or device PIN).
 *
 * @param options - Prompt customization options.
 * @returns The authentication result.
 */
export async function authenticateWithBiometrics(
  options: BiometricPromptOptions = {},
): Promise<BiometricAuthResult> {
  const {
    promptMessage = 'Authenticate to access FillIt',
    fallbackToDeviceCredentials = true,
    cancelLabel = 'Cancel',
    disableDeviceFallback = false,
  } = options;

  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel,
      fallbackLabel: fallbackToDeviceCredentials ? 'Use Passcode' : undefined,
      disableDeviceFallback: disableDeviceFallback && !fallbackToDeviceCredentials,
    });

    if (result.success) {
      return { success: true };
    }

    // Authentication failed
    if (result.error === 'user_cancel' || result.error === 'system_cancel') {
      return { success: false, cancelled: true, error: 'Authentication cancelled' };
    }

    if (result.error === 'not_enrolled') {
      return {
        success: false,
        error: 'No biometrics enrolled. Set up Face ID or fingerprint in device settings.',
      };
    }

    if (result.error === 'not_available') {
      return { success: false, error: 'Biometric authentication is not available on this device.' };
    }

    return {
      success: false,
      error: result.error ?? 'Authentication failed',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed',
    };
  }
}

/**
 * Quick check if biometric auth can be used right now.
 *
 * Returns true only if hardware is available AND biometrics are enrolled.
 */
export async function canUseBiometrics(): Promise<boolean> {
  const caps = await getBiometricCapabilities();
  return caps.isAvailable && caps.isEnrolled;
}

// ─── Helpers ──────────────────────────────────────────────────────

function mapBiometricType(types: LocalAuthentication.AuthenticationType[]): BiometricType {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'facial';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'fingerprint';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'iris';
  }
  return 'none';
}

function getBiometricLabel(type: BiometricType): string {
  switch (type) {
    case 'facial':
      return 'Face ID';
    case 'fingerprint':
      return 'Fingerprint';
    case 'iris':
      return 'Iris';
    case 'none':
      return 'None';
  }
}
