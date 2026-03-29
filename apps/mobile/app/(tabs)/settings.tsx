/**
 * Settings tab screen.
 *
 * Provides app configuration options including theme toggle,
 * notification preferences, data management, and app info.
 */

import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { type ComponentProps } from 'react';
import { router } from 'expo-router';

import { useTheme } from '../../src/theme';

/** Props for a single settings row */
interface SettingsRowProps {
  /** Ionicons icon name */
  readonly icon: ComponentProps<typeof Ionicons>['name'];
  /** Row label text */
  readonly label: string;
  /** Optional description below the label */
  readonly description?: string;
  /** Optional right-side content (e.g., current value) */
  readonly value?: string;
  /** Press handler */
  readonly onPress?: () => void;
  /** Test ID for e2e testing */
  readonly testID?: string;
}

function SettingsRow({ icon, label, description, value, onPress, testID }: SettingsRowProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: theme.colors.surface,
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
        },
        pressed && onPress && styles.rowPressed,
      ]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={label}
      testID={testID}
    >
      <Ionicons
        name={icon}
        size={22}
        color={theme.colors.onSurfaceVariant}
        style={{ marginRight: theme.spacing.md }}
      />
      <View style={styles.rowContent}>
        <Text style={[theme.typography.bodyLarge, { color: theme.colors.onSurface }]}>{label}</Text>
        {description ? (
          <Text
            style={[
              theme.typography.bodySmall,
              { color: theme.colors.onSurfaceVariant, marginTop: 2 },
            ]}
          >
            {description}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text
          style={[
            theme.typography.bodyMedium,
            { color: theme.colors.onSurfaceVariant, marginLeft: theme.spacing.sm },
          ]}
        >
          {value}
        </Text>
      ) : null}
      {onPress ? (
        <Ionicons
          name="chevron-forward"
          size={20}
          color={theme.colors.onSurfaceVariant}
          style={{ marginLeft: theme.spacing.sm }}
        />
      ) : null}
    </Pressable>
  );
}

function SettingsSectionHeader({ title }: { readonly title: string }) {
  const { theme } = useTheme();
  return (
    <Text
      style={[
        theme.typography.labelMedium,
        {
          color: theme.colors.primary,
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.xl,
          paddingBottom: theme.spacing.xs,
        },
      ]}
    >
      {title}
    </Text>
  );
}

export default function SettingsScreen() {
  const { theme, colorMode, setColorMode } = useTheme();

  const colorModeLabel =
    colorMode === 'system' ? 'System' : colorMode === 'dark' ? 'Dark' : 'Light';

  const handleThemeToggle = () => {
    // Cycle through: system -> light -> dark -> system
    if (colorMode === 'system') {
      setColorMode('light');
    } else if (colorMode === 'light') {
      setColorMode('dark');
    } else {
      setColorMode('system');
    }
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      testID="settings-screen"
    >
      <SettingsSectionHeader title="APPEARANCE" />
      <SettingsRow
        icon="color-palette-outline"
        label="Theme"
        description="Choose light, dark, or system default"
        value={colorModeLabel}
        onPress={handleThemeToggle}
        testID="settings-theme"
      />

      <SettingsSectionHeader title="DATA" />
      <SettingsRow
        icon="shield-checkmark-outline"
        label="Security"
        description="Biometric lock and encryption"
        onPress={() => router.push('/settings/security' as never)}
        testID="settings-security"
      />
      <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />
      <SettingsRow
        icon="cloud-upload-outline"
        label="Backup"
        description="Google Drive or iCloud backup"
        testID="settings-backup"
      />

      <SettingsSectionHeader title="ABOUT" />
      <SettingsRow
        icon="information-circle-outline"
        label="Version"
        value="0.1.0"
        testID="settings-version"
      />
      <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />
      <SettingsRow icon="document-text-outline" label="Privacy Policy" testID="settings-privacy" />
      <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />
      <SettingsRow icon="help-circle-outline" label="Help & Support" testID="settings-help" />

      {/* Bottom spacer for safe area */}
      <View style={{ height: theme.spacing['3xl'] }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowContent: {
    flex: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 54, // icon width + margin to align with text
  },
});
