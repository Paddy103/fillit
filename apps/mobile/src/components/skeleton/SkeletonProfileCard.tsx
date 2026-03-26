/**
 * Profile card skeleton composition.
 *
 * Renders a complete profile card loading state with avatar, name lines,
 * and detail text. Commonly used on profile screens and user cards.
 *
 * Layout:
 * ┌────────────────────────────┐
 * │  ┌────┐                    │
 * │  │ OO │  ████████████████  │
 * │  └────┘  ██████████        │
 * │                            │
 * │  ████████████████████████  │
 * │  ██████████████████        │
 * │  ██████████                │
 * └────────────────────────────┘
 *
 * @example
 * ```tsx
 * <SkeletonProfileCard />
 * ```
 */

import React from 'react';
import { View, type ViewStyle } from 'react-native';

import { useTheme } from '../../theme';
import { type SkeletonProfileCardProps } from './types';
import { SkeletonAvatar } from './SkeletonAvatar';
import { SkeletonText } from './SkeletonText';
import { Skeleton } from './Skeleton';

export function SkeletonProfileCard({
  duration,
  animated,
  style,
  accessibilityLabel = 'Loading profile...',
}: SkeletonProfileCardProps) {
  const { theme } = useTheme();

  const containerStyle: ViewStyle = {
    padding: theme.spacing.lg,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    ...style,
  };

  const headerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  };

  const headerTextStyle: ViewStyle = {
    flex: 1,
    marginLeft: theme.spacing.md,
  };

  return (
    <View
      style={containerStyle}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: true }}
      testID="skeleton-profile-card"
    >
      {/* Header: avatar + name */}
      <View style={headerStyle}>
        <SkeletonAvatar size={56} duration={duration} animated={animated} accessibilityLabel="" />
        <View style={headerTextStyle}>
          <Skeleton
            shape="text"
            width="70%"
            height={16}
            duration={duration}
            animated={animated}
            style={{ marginBottom: theme.spacing.sm }}
            accessibilityLabel=""
          />
          <Skeleton
            shape="text"
            width="45%"
            height={12}
            duration={duration}
            animated={animated}
            accessibilityLabel=""
          />
        </View>
      </View>

      {/* Detail lines */}
      <SkeletonText
        lines={3}
        lineHeight={12}
        lineGap={theme.spacing.sm}
        lastLineWidth={0.5}
        duration={duration}
        animated={animated}
        accessibilityLabel=""
      />
    </View>
  );
}

SkeletonProfileCard.displayName = 'SkeletonProfileCard';
