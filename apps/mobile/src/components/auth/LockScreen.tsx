/**
 * Lock screen overlay.
 *
 * Shown when the app is locked after returning from background.
 * Displays a blur overlay with an unlock button that triggers
 * biometric authentication.
 */

import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '../../theme';
import { Button } from '../ui/Button';

// ─── Types ─────────────────────────────────────────────────────────

export interface LockScreenProps {
  /** Whether biometric auth is currently in progress. */
  isAuthenticating: boolean;
  /** Called when the user taps "Unlock". */
  onUnlock: () => void;
}

// ─── Component ─────────────────────────────────────────────────────

export function LockScreen({ isAuthenticating, onUnlock }: LockScreenProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      testID="lock-screen"
    >
      <View style={styles.content}>
        <Ionicons name="lock-closed" size={64} color={theme.colors.primary} />
        <Text
          style={[
            theme.typography.titleLarge,
            { color: theme.colors.onBackground, marginTop: theme.spacing.lg },
          ]}
        >
          FillIt is Locked
        </Text>
        <Text
          style={[
            theme.typography.bodyMedium,
            {
              color: theme.colors.onSurfaceVariant,
              marginTop: theme.spacing.sm,
              textAlign: 'center',
            },
          ]}
        >
          Authenticate to continue using the app.
        </Text>
        <Button
          label={isAuthenticating ? 'Authenticating...' : 'Unlock'}
          variant="primary"
          size="lg"
          onPress={onUnlock}
          disabled={isAuthenticating}
          iconLeft={
            <Ionicons
              name="finger-print"
              size={20}
              color={isAuthenticating ? theme.colors.outline : '#fff'}
            />
          }
          testID="lock-screen-unlock-button"
          style={{ marginTop: theme.spacing.xl, minWidth: 200 }}
        />
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
});

LockScreen.displayName = 'LockScreen';
