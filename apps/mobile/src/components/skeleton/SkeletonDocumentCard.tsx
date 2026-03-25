/**
 * Document card skeleton composition.
 *
 * Renders a document card loading state matching the home dashboard
 * layout. Shows a document thumbnail area, title, and status chip.
 *
 * Layout:
 * ┌────────────────────────────────┐
 * │  ┌──────────────────────────┐  │
 * │  │                          │  │
 * │  │      (thumbnail)         │  │
 * │  │                          │  │
 * │  └──────────────────────────┘  │
 * │  ████████████████████          │
 * │  ██████████  ┌──────┐         │
 * │              │ chip │         │
 * │              └──────┘         │
 * └────────────────────────────────┘
 *
 * @example
 * ```tsx
 * <SkeletonDocumentCard />
 * ```
 */

import React from 'react';
import { View, type ViewStyle } from 'react-native';

import { useTheme } from '../../theme';
import { type SkeletonDocumentCardProps } from './types';
import { Skeleton } from './Skeleton';

export function SkeletonDocumentCard({
  duration,
  animated,
  style,
  accessibilityLabel = 'Loading document...',
}: SkeletonDocumentCardProps) {
  const { theme } = useTheme();

  const containerStyle: ViewStyle = {
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
    ...style,
  };

  const contentStyle: ViewStyle = {
    padding: theme.spacing.md,
  };

  const footerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
  };

  return (
    <View
      style={containerStyle}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: true }}
      testID="skeleton-document-card"
    >
      {/* Thumbnail area */}
      <Skeleton
        shape="rectangle"
        width="100%"
        height={140}
        borderRadius={0}
        duration={duration}
        animated={animated}
        accessibilityLabel=""
      />

      {/* Content area */}
      <View style={contentStyle}>
        {/* Title */}
        <Skeleton
          shape="text"
          width="75%"
          height={16}
          duration={duration}
          animated={animated}
          style={{ marginBottom: theme.spacing.sm }}
          accessibilityLabel=""
        />

        {/* Subtitle + status chip */}
        <View style={footerStyle}>
          <Skeleton
            shape="text"
            width="40%"
            height={12}
            duration={duration}
            animated={animated}
            accessibilityLabel=""
          />
          <Skeleton
            shape="rectangle"
            width={60}
            height={22}
            borderRadius={theme.radii.full}
            duration={duration}
            animated={animated}
            accessibilityLabel=""
          />
        </View>
      </View>
    </View>
  );
}

SkeletonDocumentCard.displayName = 'SkeletonDocumentCard';
