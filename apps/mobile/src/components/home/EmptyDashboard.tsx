/**
 * Empty state shown on the home dashboard when the user has
 * no documents yet. Displays an illustration icon and guidance
 * text encouraging the user to scan or import their first document.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '../../theme';
import { BodyLarge, BodySmall } from '../ui';

/**
 * Empty dashboard state for new users.
 *
 * @example
 * ```tsx
 * {documents.length === 0 && <EmptyDashboard />}
 * ```
 */
export function EmptyDashboard() {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: theme.radii.lg,
          padding: theme.spacing['2xl'],
        },
      ]}
      testID="empty-dashboard"
    >
      <Ionicons
        name="documents-outline"
        size={64}
        color={theme.colors.onSurfaceVariant}
        style={{ marginBottom: theme.spacing.md }}
      />
      <BodyLarge color="secondary" align="center">
        No documents yet
      </BodyLarge>
      <BodySmall color="secondary" align="center" style={{ marginTop: theme.spacing.xs }}>
        Scan or import your first document to get started.
      </BodySmall>
    </View>
  );
}

EmptyDashboard.displayName = 'EmptyDashboard';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
