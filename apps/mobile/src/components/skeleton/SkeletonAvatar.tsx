/**
 * Circular avatar skeleton placeholder.
 *
 * Renders a circle with shimmer animation, commonly used as an avatar
 * or profile picture loading state.
 *
 * @example
 * ```tsx
 * <SkeletonAvatar size={48} />
 * <SkeletonAvatar size={64} animated={false} />
 * ```
 */

import React from 'react';

import { type SkeletonAvatarProps } from './types';
import { Skeleton } from './Skeleton';

export function SkeletonAvatar({
  size = 48,
  duration,
  animated,
  style,
  accessibilityLabel = 'Loading avatar...',
}: SkeletonAvatarProps) {
  return (
    <Skeleton
      shape="circle"
      width={size}
      height={size}
      duration={duration}
      animated={animated}
      style={style}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

SkeletonAvatar.displayName = 'SkeletonAvatar';
