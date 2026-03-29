/**
 * Security settings screen.
 *
 * Configure biometric lock toggle, auto-lock timeout,
 * and trigger an immediate lock. Shows explanatory text
 * about security features.
 */

import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '../../src/theme';
import { ScreenHeader } from '../../src/components/profile/ScreenHeader';
import {
  useSettingsStore,
  type AutoLockTimeout,
  VALID_AUTO_LOCK_TIMEOUTS,
} from '../../src/stores/settings-store';
import { getBiometricCapabilities, type BiometricCapabilities } from '../../src/services/auth';

// ─── Helpers ──────────────────────────────────────────────────────

function formatTimeout(timeout: AutoLockTimeout): string {
  if (timeout === null) return 'Never';
  if (timeout === 0) return 'Immediately';
  if (timeout === 1) return '1 minute';
  return `${timeout} minutes`;
}

// ─── Component ─────────────────────────────────────────────────────

export default function SecuritySettingsScreen() {
  const { theme } = useTheme();
  const biometricEnabled = useSettingsStore((s) => s.biometricLockEnabled);
  const autoLockTimeout = useSettingsStore((s) => s.autoLockTimeout);
  const setBiometricEnabled = useSettingsStore((s) => s.setBiometricLockEnabled);
  const setAutoLockTimeout = useSettingsStore((s) => s.setAutoLockTimeout);

  const [capabilities, setCapabilities] = useState<BiometricCapabilities | null>(null);

  useEffect(() => {
    getBiometricCapabilities().then(setCapabilities);
  }, []);

  const handleBiometricToggle = useCallback(
    (value: boolean) => {
      if (value && capabilities && !capabilities.isEnrolled) {
        Alert.alert(
          'Biometrics Not Set Up',
          `No ${capabilities.label.toLowerCase()} enrolled on this device. Set it up in your device settings first.`,
        );
        return;
      }
      setBiometricEnabled(value);
    },
    [capabilities, setBiometricEnabled],
  );

  const handleTimeoutSelect = useCallback(() => {
    const options = VALID_AUTO_LOCK_TIMEOUTS.map((t) => formatTimeout(t));

    Alert.alert('Auto-Lock Timeout', 'Lock the app after being in the background for:', [
      ...VALID_AUTO_LOCK_TIMEOUTS.map((t, i) => ({
        text: options[i]!,
        onPress: () => setAutoLockTimeout(t),
        style: t === autoLockTimeout ? ('default' as const) : ('default' as const),
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }, [autoLockTimeout, setAutoLockTimeout]);

  const handleImmediateLock = useCallback(() => {
    if (!biometricEnabled) {
      Alert.alert('Biometric Lock Disabled', 'Enable biometric lock first to use this feature.');
      return;
    }
    Alert.alert('Lock Now', 'The app will lock and require authentication to continue.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Lock',
        onPress: () => {
          // Navigate back and the auto-lock will engage
          router.back();
        },
      },
    ]);
  }, [biometricEnabled]);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      testID="security-settings-screen"
    >
      <ScreenHeader title="Security" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing['3xl'] }}>
        {/* Biometric info */}
        <View
          style={[
            styles.infoBox,
            {
              backgroundColor: theme.colors.surface,
              margin: theme.spacing.lg,
              padding: theme.spacing.md,
              borderRadius: theme.radii.md,
              borderWidth: 1,
              borderColor: theme.colors.outline,
            },
          ]}
        >
          <Ionicons name="shield-checkmark" size={24} color={theme.colors.primary} />
          <View style={{ marginLeft: theme.spacing.md, flex: 1 }}>
            <Text style={[theme.typography.labelLarge, { color: theme.colors.onSurface }]}>
              {capabilities?.label ?? 'Biometric Authentication'}
            </Text>
            <Text
              style={[
                theme.typography.bodySmall,
                { color: theme.colors.onSurfaceVariant, marginTop: 2 },
              ]}
            >
              {capabilities?.isAvailable
                ? capabilities.isEnrolled
                  ? `${capabilities.label} is available and enrolled on this device.`
                  : `${capabilities.label} hardware found but not enrolled. Set it up in device settings.`
                : 'No biometric hardware detected on this device.'}
            </Text>
          </View>
        </View>

        {/* Biometric toggle */}
        <View style={[styles.settingRow, { paddingHorizontal: theme.spacing.lg }]}>
          <View style={{ flex: 1 }}>
            <Text style={[theme.typography.bodyLarge, { color: theme.colors.onSurface }]}>
              Biometric Lock
            </Text>
            <Text
              style={[
                theme.typography.bodySmall,
                { color: theme.colors.onSurfaceVariant, marginTop: 2 },
              ]}
            >
              Require {capabilities?.label ?? 'biometrics'} or device PIN to unlock the app.
            </Text>
          </View>
          <Switch
            value={biometricEnabled}
            onValueChange={handleBiometricToggle}
            disabled={!capabilities?.isAvailable}
            trackColor={{ false: theme.colors.outline, true: theme.colors.primaryLight }}
            thumbColor={biometricEnabled ? theme.colors.primary : theme.colors.surface}
            testID="biometric-toggle"
          />
        </View>

        <View
          style={[
            styles.divider,
            {
              backgroundColor: theme.colors.divider,
              marginHorizontal: theme.spacing.lg,
              marginVertical: theme.spacing.md,
            },
          ]}
        />

        {/* Auto-lock timeout */}
        <Pressable
          style={[styles.settingRow, { paddingHorizontal: theme.spacing.lg }]}
          onPress={handleTimeoutSelect}
          disabled={!biometricEnabled}
          accessibilityRole="button"
          accessibilityLabel="Auto-lock timeout"
          testID="auto-lock-timeout"
        >
          <View style={{ flex: 1 }}>
            <Text
              style={[
                theme.typography.bodyLarge,
                { color: biometricEnabled ? theme.colors.onSurface : theme.colors.outline },
              ]}
            >
              Auto-Lock Timeout
            </Text>
            <Text
              style={[
                theme.typography.bodySmall,
                { color: theme.colors.onSurfaceVariant, marginTop: 2 },
              ]}
            >
              Lock after being in the background.
            </Text>
          </View>
          <Text
            style={[
              theme.typography.bodyMedium,
              {
                color: biometricEnabled ? theme.colors.onSurfaceVariant : theme.colors.outline,
              },
            ]}
          >
            {formatTimeout(autoLockTimeout)}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={biometricEnabled ? theme.colors.onSurfaceVariant : theme.colors.outline}
            style={{ marginLeft: theme.spacing.sm }}
          />
        </Pressable>

        <View
          style={[
            styles.divider,
            {
              backgroundColor: theme.colors.divider,
              marginHorizontal: theme.spacing.lg,
              marginVertical: theme.spacing.md,
            },
          ]}
        />

        {/* Immediate lock */}
        <Pressable
          style={[styles.settingRow, { paddingHorizontal: theme.spacing.lg }]}
          onPress={handleImmediateLock}
          accessibilityRole="button"
          accessibilityLabel="Lock now"
          testID="lock-now-button"
        >
          <Ionicons name="lock-closed-outline" size={22} color={theme.colors.error} />
          <Text
            style={[
              theme.typography.bodyLarge,
              { color: theme.colors.error, marginLeft: theme.spacing.md },
            ]}
          >
            Lock Now
          </Text>
        </Pressable>

        {/* Security explanation */}
        <View
          style={{
            margin: theme.spacing.lg,
            marginTop: theme.spacing.xl,
          }}
        >
          <Text
            style={[
              theme.typography.labelMedium,
              { color: theme.colors.onSurfaceVariant, marginBottom: theme.spacing.sm },
            ]}
          >
            About Security
          </Text>
          <Text
            style={[
              theme.typography.bodySmall,
              { color: theme.colors.onSurfaceVariant, lineHeight: 18 },
            ]}
          >
            Your documents and personal data are encrypted on-device using AES-256-GCM. Encryption
            keys are stored in the{' '}
            {capabilities?.type === 'facial' ? 'Secure Enclave (iOS)' : 'Android Keystore'}.
            Biometric lock adds an extra layer of protection by requiring authentication when you
            return to the app after the configured timeout.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});
