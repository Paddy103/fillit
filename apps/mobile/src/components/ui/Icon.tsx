/**
 * Icon wrapper component for the FillIt design system.
 *
 * Provides a consistent interface for rendering icons with theme-aware
 * sizing and coloring. Currently renders icons as Text characters but
 * can be extended to wrap any icon library (e.g., @expo/vector-icons).
 */

import React from 'react';
import { View, Text, type ViewStyle, type TextStyle, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

/** Predefined icon sizes */
export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** Semantic icon colors */
export type IconColor =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'error'
  | 'success'
  | 'warning'
  | 'info'
  | 'disabled'
  | 'onPrimary';

/** Props for the Icon component */
export interface IconProps {
  /** The icon name / symbol to render. Can be a Unicode character or icon name. */
  readonly name: string;
  /** Icon size. Defaults to 'md'. */
  readonly size?: IconSize;
  /** Semantic color. Defaults to 'default'. */
  readonly color?: IconColor;
  /** Custom color override (takes precedence over semantic color) */
  readonly customColor?: string;
  /** Custom numeric size override (takes precedence over size preset) */
  readonly customSize?: number;
  /** Additional container style overrides */
  readonly style?: ViewStyle;
  /** Accessibility label. If omitted, the icon is treated as decorative. */
  readonly accessibilityLabel?: string;
  /** Custom render function for the icon content (for integration with icon libraries) */
  readonly renderIcon?: (props: { size: number; color: string }) => React.ReactNode;
}

/** Numeric size values in dp */
const sizeMap: Record<IconSize, number> = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 40,
};

/**
 * Theme-aware icon wrapper component.
 *
 * Supports both simple text-based icons and custom render functions
 * for integration with icon libraries.
 *
 * @example
 * ```tsx
 * // Simple text icon
 * <Icon name="+" size="md" color="primary" />
 *
 * // With custom render function (e.g., @expo/vector-icons)
 * <Icon
 *   name="document"
 *   renderIcon={({ size, color }) => (
 *     <Ionicons name="document" size={size} color={color} />
 *   )}
 * />
 *
 * // Decorative icon (no accessibility label)
 * <Icon name=">" size="sm" color="secondary" />
 * ```
 */
export function Icon({
  name,
  size = 'md',
  color = 'default',
  customColor,
  customSize,
  style,
  accessibilityLabel,
  renderIcon,
}: IconProps) {
  const { theme } = useTheme();

  const colorMap: Record<IconColor, string> = {
    default: theme.colors.onBackground,
    primary: theme.colors.primary,
    secondary: theme.colors.onSurfaceVariant,
    error: theme.colors.error,
    success: theme.colors.success,
    warning: theme.colors.warning,
    info: theme.colors.info,
    disabled: theme.colors.onDisabled,
    onPrimary: theme.colors.onPrimary,
  };

  const resolvedSize = customSize ?? sizeMap[size];
  const resolvedColor = customColor ?? colorMap[color];

  const isDecorative = !accessibilityLabel;

  const containerStyle: ViewStyle = {
    width: resolvedSize,
    height: resolvedSize,
    alignItems: 'center',
    justifyContent: 'center',
  };

  const textStyle: TextStyle = {
    fontSize: resolvedSize,
    lineHeight: resolvedSize,
    color: resolvedColor,
    textAlign: 'center',
  };

  return (
    <View
      style={StyleSheet.flatten([containerStyle, style])}
      accessibilityLabel={isDecorative ? undefined : accessibilityLabel}
      accessibilityRole={isDecorative ? 'none' : 'image'}
      accessibilityElementsHidden={isDecorative}
      importantForAccessibility={isDecorative ? 'no-hide-descendants' : 'yes'}
    >
      {renderIcon ? (
        renderIcon({ size: resolvedSize, color: resolvedColor })
      ) : (
        <Text style={textStyle} allowFontScaling={false}>
          {name}
        </Text>
      )}
    </View>
  );
}

Icon.displayName = 'Icon';
