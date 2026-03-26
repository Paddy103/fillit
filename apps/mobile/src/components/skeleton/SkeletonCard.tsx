/**
 * Card skeleton placeholder.
 *
 * Renders a rounded card-shaped rectangle with shimmer animation,
 * using theme-consistent border radius and elevation.
 *
 * @example
 * ```tsx
 * <SkeletonCard height={120} />
 * <SkeletonCard width={300} height={200} />
 * ```
 */

import React from 'react';

import { useTheme } from '../../theme';
import { type SkeletonCardProps } from './types';
import { Skeleton } from './Skeleton';

export function SkeletonCard({
  width = '100%',
  height = 120,
  duration,
  animated,
  style,
  accessibilityLabel = 'Loading card...',
}: SkeletonCardProps) {
  const { theme } = useTheme();

  return (
    <Skeleton
      shape="rectangle"
      width={width}
      height={height}
      borderRadius={theme.radii.md}
      duration={duration}
      animated={animated}
      style={style}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

SkeletonCard.displayName = 'SkeletonCard';
