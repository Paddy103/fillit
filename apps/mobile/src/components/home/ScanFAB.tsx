/**
 * Floating action button for scanning documents.
 *
 * Absolutely positioned in the bottom-right corner of the screen,
 * using the primary brand color. This is the primary CTA on the
 * home dashboard.
 */

import React from 'react';
import { Alert, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '../../theme';

/** Size of the FAB circle in points */
const FAB_SIZE = 64;

/** Props for the ScanFAB component */
export interface ScanFABProps {
  /** Override the default press handler */
  readonly onPress?: () => void;
  /** Whether the FAB is disabled (e.g., while scanning is in progress) */
  readonly disabled?: boolean;
  /** Test ID for E2E tests */
  readonly testID?: string;
}

/**
 * Scan document floating action button.
 *
 * @example
 * ```tsx
 * <ScanFAB />
 * <ScanFAB onPress={() => router.push('/scan')} />
 * ```
 */
export function ScanFAB({ onPress, disabled = false, testID = 'scan-fab' }: ScanFABProps) {
  const { theme } = useTheme();

  const handlePress = () => {
    if (disabled) return;
    if (onPress) {
      onPress();
      return;
    }
    Alert.alert('Coming Soon', 'Document scanning will be available in a future update.');
  };

  const fabStyle: ViewStyle = {
    ...styles.fab,
    backgroundColor: theme.colors.primary,
    ...theme.elevations.lg,
    ...(disabled ? { opacity: 0.5 } : undefined),
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => [fabStyle, pressed && !disabled && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="Scan a document"
      accessibilityState={{ disabled }}
      testID={testID}
    >
      <Ionicons name="scan" size={28} color={theme.colors.onPrimary} />
    </Pressable>
  );
}

ScanFAB.displayName = 'ScanFAB';

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
});
