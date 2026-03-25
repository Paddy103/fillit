/**
 * Avatar component for the FillIt design system.
 *
 * Displays a user avatar with initials fallback. Supports multiple
 * sizes and themed coloring for profile cards and lists.
 */

import React, { useMemo } from 'react';
import { View, Text, type ViewStyle, type TextStyle, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

/** Avatar size presets */
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** Props for the Avatar component */
export interface AvatarProps {
  /** Full name to extract initials from */
  readonly name: string;
  /** Size preset. Defaults to 'md'. */
  readonly size?: AvatarSize;
  /** Custom background color override */
  readonly backgroundColor?: string;
  /** Custom text color override */
  readonly textColor?: string;
  /** Additional style overrides */
  readonly style?: ViewStyle;
}

/** Size dimensions in dp */
const sizeMap: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 72,
};

/** Font size ratios relative to avatar size */
const fontSizeRatio = 0.4;

/**
 * Extract up to 2 initials from a name.
 * "John Doe" -> "JD", "Alice" -> "A", "" -> "?"
 */
function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';

  if (parts.length === 1) {
    return (parts[0]?.[0] ?? '?').toUpperCase();
  }

  const first = parts[0]?.[0] ?? '';
  const last = parts[parts.length - 1]?.[0] ?? '';
  return `${first}${last}`.toUpperCase();
}

/**
 * Generate a deterministic background color from a name string.
 * Uses a simple hash to pick from a set of pleasant colors.
 */
function getColorFromName(name: string): string {
  const colors = [
    '#7C3AED', // violet
    '#2563EB', // blue
    '#0891B2', // cyan
    '#059669', // emerald
    '#D97706', // amber
    '#DC2626', // red
    '#9333EA', // purple
    '#0284C7', // sky
    '#16A34A', // green
    '#EA580C', // orange
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % colors.length;
  return colors[index] ?? colors[0]!;
}

/**
 * Avatar component with initials fallback.
 *
 * @example
 * ```tsx
 * <Avatar name="John Doe" size="md" />
 * <Avatar name="Alice" size="lg" backgroundColor="#7C3AED" />
 * ```
 */
export function Avatar({ name, size = 'md', backgroundColor, textColor, style }: AvatarProps) {
  const { theme } = useTheme();

  const dimension = sizeMap[size];
  const initials = useMemo(() => getInitials(name), [name]);
  const bgColor = useMemo(() => backgroundColor ?? getColorFromName(name), [backgroundColor, name]);
  const fontSize = Math.round(dimension * fontSizeRatio);

  const containerStyle: ViewStyle = {
    width: dimension,
    height: dimension,
    borderRadius: dimension / 2,
    backgroundColor: bgColor,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  const textStyle: TextStyle = {
    fontSize,
    lineHeight: fontSize * 1.2,
    fontWeight: theme.typography.titleMedium.fontWeight,
    color: textColor ?? '#FFFFFF',
    textAlign: 'center',
  };

  return (
    <View
      style={StyleSheet.flatten([containerStyle, style])}
      accessibilityRole="image"
      accessibilityLabel={`Avatar for ${name}`}
    >
      <Text style={textStyle} allowFontScaling={false}>
        {initials}
      </Text>
    </View>
  );
}

Avatar.displayName = 'Avatar';

// Export helper for testing
export { getInitials, getColorFromName };
