/**
 * Badge and Chip components for the FillIt design system.
 *
 * Badge: a small status indicator (dot or count) for notifications.
 * Chip: a compact element for tags, filters, or status labels.
 */

import React from 'react';
import { View, Text, Pressable, type ViewStyle, type TextStyle, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

/** Badge visual variants */
export type BadgeVariant = 'default' | 'primary' | 'error' | 'success' | 'warning' | 'info';

/** Props for the Badge component */
export interface BadgeProps {
  /** Numeric count to display. If omitted, renders as a dot. */
  readonly count?: number;
  /** Maximum count before showing "99+". Defaults to 99. */
  readonly maxCount?: number;
  /** Badge color variant. Defaults to 'error'. */
  readonly variant?: BadgeVariant;
  /** Whether the badge is visible. Defaults to true. */
  readonly visible?: boolean;
  /** Additional style overrides */
  readonly style?: ViewStyle;
}

/**
 * Small status indicator badge (dot or count).
 *
 * @example
 * ```tsx
 * <Badge count={3} variant="error" />
 * <Badge variant="success" />  // dot badge
 * ```
 */
export function Badge({
  count,
  maxCount = 99,
  variant = 'error',
  visible = true,
  style,
}: BadgeProps) {
  const { theme } = useTheme();

  if (!visible) return null;

  const isDot = count === undefined;

  const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
    default: { bg: theme.colors.onSurfaceVariant, text: theme.colors.surface },
    primary: { bg: theme.colors.primary, text: theme.colors.onPrimary },
    error: { bg: theme.colors.error, text: theme.colors.onError },
    success: { bg: theme.colors.success, text: theme.colors.onSuccess },
    warning: { bg: theme.colors.warning, text: theme.colors.onWarning },
    info: { bg: theme.colors.info, text: theme.colors.onInfo },
  };

  const { bg, text } = variantColors[variant];
  const displayText =
    count !== undefined && count > maxCount ? `${maxCount}+` : String(count ?? '');

  const dotSize = 8;
  const badgeMinWidth = 20;
  const badgeHeight = 20;

  const containerStyle: ViewStyle = isDot
    ? {
        width: dotSize,
        height: dotSize,
        borderRadius: dotSize / 2,
        backgroundColor: bg,
      }
    : {
        minWidth: badgeMinWidth,
        height: badgeHeight,
        borderRadius: badgeHeight / 2,
        backgroundColor: bg,
        paddingHorizontal: theme.spacing.xs,
        alignItems: 'center',
        justifyContent: 'center',
      };

  const textStyle: TextStyle = {
    ...theme.typography.labelSmall,
    color: text,
    textAlign: 'center',
  };

  return (
    <View
      style={StyleSheet.flatten([containerStyle, style])}
      accessibilityRole="text"
      accessibilityLabel={isDot ? 'Status indicator' : `${displayText} notifications`}
    >
      {!isDot ? <Text style={textStyle}>{displayText}</Text> : null}
    </View>
  );
}

Badge.displayName = 'Badge';

// ---------------------------------------------------------------------------
// Chip
// ---------------------------------------------------------------------------

/** Chip visual variants */
export type ChipVariant = 'filled' | 'outlined';

/** Chip semantic colors */
export type ChipColor = 'default' | 'primary' | 'error' | 'success' | 'warning' | 'info';

/** Props for the Chip component */
export interface ChipProps {
  /** Chip label text */
  readonly label: string;
  /** Visual variant. Defaults to 'filled'. */
  readonly variant?: ChipVariant;
  /** Semantic color. Defaults to 'default'. */
  readonly color?: ChipColor;
  /** Whether the chip is selected */
  readonly selected?: boolean;
  /** Handler called when the chip is pressed */
  readonly onPress?: () => void;
  /** Handler called when the chip's close button is pressed */
  readonly onClose?: () => void;
  /** Render a custom icon to the left of the label */
  readonly icon?: React.ReactNode;
  /** Whether the chip is disabled */
  readonly disabled?: boolean;
  /** Additional style overrides */
  readonly style?: ViewStyle;
}

/**
 * Compact chip for tags, filters, or status labels.
 *
 * @example
 * ```tsx
 * <Chip label="Exported" color="success" />
 * <Chip label="Needs Review" color="warning" variant="outlined" />
 * <Chip label="Tax" onPress={handleFilter} onClose={handleRemove} />
 * ```
 */
export function Chip({
  label,
  variant = 'filled',
  color = 'default',
  selected = false,
  onPress,
  onClose,
  icon,
  disabled = false,
  style,
}: ChipProps) {
  const { theme } = useTheme();
  const { colors, spacing, radii, typography } = theme;

  const colorTokens: Record<
    ChipColor,
    { filledBg: string; filledText: string; outlineBorder: string; outlineText: string }
  > = {
    default: {
      filledBg: colors.surfaceVariant,
      filledText: colors.onSurface,
      outlineBorder: colors.outline,
      outlineText: colors.onSurface,
    },
    primary: {
      filledBg: colors.primary,
      filledText: colors.onPrimary,
      outlineBorder: colors.primary,
      outlineText: colors.primary,
    },
    error: {
      filledBg: colors.errorLight,
      filledText: colors.onError,
      outlineBorder: colors.error,
      outlineText: colors.error,
    },
    success: {
      filledBg: colors.successLight,
      filledText: colors.onSuccess,
      outlineBorder: colors.success,
      outlineText: colors.success,
    },
    warning: {
      filledBg: colors.warningLight,
      filledText: colors.onWarning,
      outlineBorder: colors.warning,
      outlineText: colors.warning,
    },
    info: {
      filledBg: colors.infoLight,
      filledText: colors.onInfo,
      outlineBorder: colors.info,
      outlineText: colors.info,
    },
  };

  const tokens = colorTokens[color];

  const isFilled = variant === 'filled';
  const containerBg = isFilled ? tokens.filledBg : 'transparent';
  const textColor = isFilled ? tokens.filledText : tokens.outlineText;
  const borderColor = isFilled ? 'transparent' : tokens.outlineBorder;

  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: disabled ? colors.disabled : containerBg,
    borderWidth: 1,
    borderColor: disabled ? colors.disabled : borderColor,
    opacity: disabled ? 0.6 : 1,
    ...(selected ? { borderColor: colors.primary, borderWidth: 2 } : undefined),
  };

  const labelStyle: TextStyle = {
    ...typography.labelMedium,
    color: disabled ? colors.onDisabled : textColor,
  };

  const content = (
    <>
      {icon ? <View style={{ marginRight: spacing.xs }}>{icon}</View> : null}
      <Text style={labelStyle} numberOfLines={1}>
        {label}
      </Text>
      {onClose ? (
        <Pressable
          onPress={disabled ? undefined : onClose}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${label}`}
          style={{ marginLeft: spacing.xs }}
        >
          <Text
            style={{
              ...typography.labelMedium,
              color: disabled ? colors.onDisabled : textColor,
            }}
          >
            {'\u00D7'}
          </Text>
        </Pressable>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={disabled ? undefined : onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled, selected }}
        style={({ pressed }) =>
          StyleSheet.flatten([containerStyle, pressed ? { opacity: 0.7 } : undefined, style])
        }
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      style={StyleSheet.flatten([containerStyle, style])}
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      {content}
    </View>
  );
}

Chip.displayName = 'Chip';
