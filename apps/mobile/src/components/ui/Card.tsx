/**
 * Card component for the FillIt design system.
 *
 * A surface container with configurable elevation, padding, and border
 * radius. Supports pressable cards for list items and navigation.
 */

import React from 'react';
import { View, Pressable, type ViewStyle, StyleSheet, type PressableProps } from 'react-native';
import { useTheme } from '../../theme';

/** Card elevation levels */
export type CardElevation = 'none' | 'sm' | 'md' | 'lg' | 'xl';

/** Props for the Card component */
export interface CardProps {
  /** Card content */
  readonly children: React.ReactNode;
  /** Elevation level. Defaults to 'sm'. */
  readonly elevation?: CardElevation;
  /** Whether the card has a border. Defaults to false. */
  readonly bordered?: boolean;
  /** Padding size. Defaults to 'lg'. */
  readonly padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  /** Border radius size. Defaults to 'lg'. */
  readonly radius?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  /** Additional style overrides */
  readonly style?: ViewStyle;
  /** Accessibility label for the card */
  readonly accessibilityLabel?: string;
}

/** Props for the PressableCard component */
export interface PressableCardProps extends CardProps, Omit<PressableProps, 'style' | 'children'> {}

/**
 * Surface container with elevation and themed styling.
 *
 * @example
 * ```tsx
 * <Card elevation="md" padding="lg">
 *   <TitleLarge>Document Name</TitleLarge>
 *   <BodyMedium color="secondary">Last edited 2 hours ago</BodyMedium>
 * </Card>
 * ```
 */
export function Card({
  children,
  elevation = 'sm',
  bordered = false,
  padding = 'lg',
  radius = 'lg',
  style,
  accessibilityLabel,
}: CardProps) {
  const { theme } = useTheme();
  const { colors, spacing, radii, elevations } = theme;

  const paddingMap = {
    none: 0,
    sm: spacing.sm,
    md: spacing.md,
    lg: spacing.lg,
    xl: spacing.xl,
  };

  const radiusMap = {
    none: radii.none,
    sm: radii.sm,
    md: radii.md,
    lg: radii.lg,
    xl: radii.xl,
  };

  const containerStyle: ViewStyle = {
    backgroundColor: colors.surface,
    padding: paddingMap[padding],
    borderRadius: radiusMap[radius],
    ...elevations[elevation],
    ...(bordered ? { borderWidth: 1, borderColor: colors.outlineVariant } : undefined),
  };

  return (
    <View
      style={StyleSheet.flatten([containerStyle, style])}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="summary"
    >
      {children}
    </View>
  );
}

Card.displayName = 'Card';

/**
 * Pressable card variant for interactive items.
 *
 * @example
 * ```tsx
 * <PressableCard onPress={handleDocumentPress} elevation="md">
 *   <BodyMedium>Tax Return 2024</BodyMedium>
 * </PressableCard>
 * ```
 */
export function PressableCard({
  children,
  elevation = 'sm',
  bordered = false,
  padding = 'lg',
  radius = 'lg',
  style,
  accessibilityLabel,
  ...pressableProps
}: PressableCardProps) {
  const { theme } = useTheme();
  const { colors, spacing, radii, elevations } = theme;

  const paddingMap = {
    none: 0,
    sm: spacing.sm,
    md: spacing.md,
    lg: spacing.lg,
    xl: spacing.xl,
  };

  const radiusMap = {
    none: radii.none,
    sm: radii.sm,
    md: radii.md,
    lg: radii.lg,
    xl: radii.xl,
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) =>
        StyleSheet.flatten([
          {
            backgroundColor: pressed ? colors.surfaceVariant : colors.surface,
            padding: paddingMap[padding],
            borderRadius: radiusMap[radius],
            ...elevations[elevation],
            ...(bordered ? { borderWidth: 1, borderColor: colors.outlineVariant } : undefined),
          } satisfies ViewStyle,
          style,
        ])
      }
      {...pressableProps}
    >
      {children}
    </Pressable>
  );
}

PressableCard.displayName = 'PressableCard';
