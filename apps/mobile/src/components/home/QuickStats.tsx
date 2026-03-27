/**
 * Quick stats row for the home dashboard.
 *
 * Shows a horizontal row of stat cards with totals for documents
 * processed, profiles created, and documents exported. Gives
 * users at-a-glance insight into their FillIt usage.
 */

import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '../../theme';
import { LabelMedium, TitleLarge } from '../ui';

/** A single stat to display */
interface StatItem {
  label: string;
  value: number;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}

/** Props for the QuickStats component */
export interface QuickStatsProps {
  /** Total number of documents in the store */
  readonly documentCount: number;
  /** Total number of user profiles */
  readonly profileCount: number;
  /** Number of documents that have been exported */
  readonly exportedCount: number;
}

/**
 * Horizontal row of quick-stat cards.
 *
 * @example
 * ```tsx
 * <QuickStats documentCount={12} profileCount={2} exportedCount={5} />
 * ```
 */
export function QuickStats({ documentCount, profileCount, exportedCount }: QuickStatsProps) {
  const { theme } = useTheme();

  const stats: StatItem[] = [
    {
      label: 'Documents',
      value: documentCount,
      icon: 'document-text-outline',
    },
    { label: 'Profiles', value: profileCount, icon: 'people-outline' },
    { label: 'Exported', value: exportedCount, icon: 'download-outline' },
  ];

  const cardStyle: ViewStyle = {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    ...theme.elevations.sm,
  };

  return (
    <View style={[styles.row, { gap: theme.spacing.sm }]} testID="quick-stats">
      {stats.map((stat) => (
        <View key={stat.label} style={cardStyle}>
          <Ionicons
            name={stat.icon}
            size={20}
            color={theme.colors.primary}
            style={{ marginBottom: theme.spacing.xs }}
          />
          <TitleLarge>{String(stat.value)}</TitleLarge>
          <LabelMedium color="secondary">{stat.label}</LabelMedium>
        </View>
      ))}
    </View>
  );
}

QuickStats.displayName = 'QuickStats';

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
});
