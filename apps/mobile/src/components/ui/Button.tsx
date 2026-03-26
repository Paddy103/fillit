/**
 * Button component for the FillIt design system.
 *
 * Supports primary, secondary, outline, and ghost variants with
 * small, medium, and large sizes. Includes loading and disabled states
 * with full accessibility support.
 */

import React, { useMemo } from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
  StyleSheet,
  type PressableProps,
  View,
} from 'react-native';
import { useTheme } from '../../theme';
import { type Theme } from '../../theme/types';

/** Button visual variants */
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';

/** Button size options */
export type ButtonSize = 'sm' | 'md' | 'lg';

/** Props for the Button component */
export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  /** Button label text */
  readonly label: string;
  /** Visual variant. Defaults to 'primary'. */
  readonly variant?: ButtonVariant;
  /** Size. Defaults to 'md'. */
  readonly size?: ButtonSize;
  /** Show a loading spinner and disable interaction */
  readonly loading?: boolean;
  /** Render a custom icon element to the left of the label */
  readonly iconLeft?: React.ReactNode;
  /** Render a custom icon element to the right of the label */
  readonly iconRight?: React.ReactNode;
  /** Whether the button takes full width of its container */
  readonly fullWidth?: boolean;
  /** Additional container style overrides */
  readonly style?: ViewStyle;
}

/** Options for deriving container styles */
interface ContainerStyleOptions {
  theme: Theme;
  variant: ButtonVariant;
  size: ButtonSize;
  disabled: boolean;
  pressed: boolean;
  fullWidth: boolean;
}

/** Derive container styles from variant, size, disabled state, and pressed state */
function getContainerStyle({
  theme,
  variant,
  size,
  disabled,
  pressed,
  fullWidth,
}: ContainerStyleOptions): ViewStyle {
  const { colors, spacing, radii } = theme;

  // Size-specific padding and minHeight
  const sizeStyles: Record<ButtonSize, ViewStyle> = {
    sm: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      minHeight: 32,
    },
    md: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      minHeight: 44,
    },
    lg: {
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xl,
      minHeight: 52,
    },
  };

  // Base styles
  const base: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    ...sizeStyles[size],
    ...(fullWidth ? { width: '100%' } : undefined),
  };

  if (disabled) {
    return {
      ...base,
      backgroundColor:
        variant === 'outline' || variant === 'ghost' ? 'transparent' : colors.disabled,
      borderWidth: variant === 'outline' ? 1 : 0,
      borderColor: variant === 'outline' ? colors.disabled : undefined,
      opacity: 0.6,
    };
  }

  // Variant-specific styles
  const variantStyles: Record<ButtonVariant, ViewStyle> = {
    primary: {
      backgroundColor: pressed ? colors.primaryDark : colors.primary,
    },
    secondary: {
      backgroundColor: pressed ? colors.secondaryDark : colors.secondary,
    },
    outline: {
      backgroundColor: pressed ? colors.surfaceVariant : 'transparent',
      borderWidth: 1,
      borderColor: colors.outline,
    },
    ghost: {
      backgroundColor: pressed ? colors.surfaceVariant : 'transparent',
    },
  };

  return { ...base, ...variantStyles[variant] };
}

/** Derive text color from variant and disabled state */
function getTextColor(theme: Theme, variant: ButtonVariant, disabled: boolean): string {
  if (disabled) {
    return theme.colors.onDisabled;
  }

  const colorMap: Record<ButtonVariant, string> = {
    primary: theme.colors.onPrimary,
    secondary: theme.colors.onSecondary,
    outline: theme.colors.primary,
    ghost: theme.colors.primary,
  };

  return colorMap[variant];
}

/**
 * Themed button component with multiple variants and sizes.
 *
 * @example
 * ```tsx
 * <Button label="Submit" variant="primary" size="md" onPress={handleSubmit} />
 * <Button label="Cancel" variant="ghost" onPress={handleCancel} />
 * <Button label="Loading..." loading />
 * ```
 */
export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  iconLeft,
  iconRight,
  fullWidth = false,
  style,
  accessibilityLabel,
  ...rest
}: ButtonProps) {
  const { theme } = useTheme();
  const isDisabled = disabled || loading;

  const textSizeStyle = useMemo((): TextStyle => {
    const sizeMap: Record<ButtonSize, TextStyle> = {
      sm: theme.typography.labelMedium,
      md: theme.typography.labelLarge,
      lg: theme.typography.titleMedium,
    };
    return sizeMap[size];
  }, [theme, size]);

  const textColor = getTextColor(theme, variant, isDisabled);
  const spinnerColor =
    variant === 'outline' || variant === 'ghost' ? theme.colors.primary : theme.colors.onPrimary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) =>
        StyleSheet.flatten([
          getContainerStyle({ theme, variant, size, disabled: isDisabled, pressed, fullWidth }),
          style,
        ])
      }
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} testID="button-loading-indicator" />
      ) : (
        <>
          {iconLeft ? (
            <View
              style={{ marginRight: theme.spacing.sm }}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {iconLeft}
            </View>
          ) : null}
          <Text style={StyleSheet.flatten([textSizeStyle, { color: textColor }])} numberOfLines={1}>
            {label}
          </Text>
          {iconRight ? (
            <View
              style={{ marginLeft: theme.spacing.sm }}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {iconRight}
            </View>
          ) : null}
        </>
      )}
    </Pressable>
  );
}

Button.displayName = 'Button';
