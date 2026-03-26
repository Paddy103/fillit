/**
 * Divider component for the FillIt design system.
 *
 * A horizontal or vertical line separator for visually grouping
 * content. Uses the theme's divider color token.
 */

import React from 'react';
import { View, type ViewStyle, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

/** Divider orientation */
export type DividerOrientation = 'horizontal' | 'vertical';

/** Props for the Divider component */
export interface DividerProps {
  /** Orientation. Defaults to 'horizontal'. */
  readonly orientation?: DividerOrientation;
  /** Thickness in dp. Defaults to 1. */
  readonly thickness?: number;
  /** Spacing above and below (horizontal) or left and right (vertical). */
  readonly spacing?: 'none' | 'sm' | 'md' | 'lg';
  /** Inset from the start edge (in dp). Defaults to 0. */
  readonly insetStart?: number;
  /** Inset from the end edge (in dp). Defaults to 0. */
  readonly insetEnd?: number;
  /** Custom color override */
  readonly color?: string;
  /** Additional style overrides */
  readonly style?: ViewStyle;
}

/**
 * Themed divider / separator line.
 *
 * @example
 * ```tsx
 * <Divider />
 * <Divider spacing="md" insetStart={16} />
 * <Divider orientation="vertical" />
 * ```
 */
export function Divider({
  orientation = 'horizontal',
  thickness = 1,
  spacing = 'none',
  insetStart = 0,
  insetEnd = 0,
  color,
  style,
}: DividerProps) {
  const { theme } = useTheme();

  const spacingMap = {
    none: 0,
    sm: theme.spacing.sm,
    md: theme.spacing.md,
    lg: theme.spacing.lg,
  };

  const spacingValue = spacingMap[spacing];
  const dividerColor = color ?? theme.colors.divider;

  const isHorizontal = orientation === 'horizontal';

  const dividerStyle: ViewStyle = isHorizontal
    ? {
        height: thickness,
        backgroundColor: dividerColor,
        marginVertical: spacingValue,
        marginLeft: insetStart,
        marginRight: insetEnd,
      }
    : {
        width: thickness,
        backgroundColor: dividerColor,
        marginHorizontal: spacingValue,
        marginTop: insetStart,
        marginBottom: insetEnd,
        alignSelf: 'stretch',
      };

  return (
    <View
      style={StyleSheet.flatten([dividerStyle, style])}
      accessibilityRole="none"
      importantForAccessibility="no"
    />
  );
}

Divider.displayName = 'Divider';
