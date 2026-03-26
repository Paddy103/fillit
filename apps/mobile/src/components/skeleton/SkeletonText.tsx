/**
 * Multi-line text skeleton placeholder.
 *
 * Renders a configurable number of text line skeletons with the last
 * line shorter to mimic natural text layout.
 *
 * @example
 * ```tsx
 * <SkeletonText lines={3} />
 * <SkeletonText lines={2} lastLineWidth={0.4} />
 * ```
 */

import React from 'react';
import { View, type ViewStyle } from 'react-native';

import { type SkeletonTextProps } from './types';
import { Skeleton } from './Skeleton';

export function SkeletonText({
  lines = 3,
  lineHeight = 14,
  lineGap = 8,
  lastLineWidth = 0.6,
  duration,
  animated,
  style,
  accessibilityLabel = 'Loading text...',
}: SkeletonTextProps) {
  const containerStyle: ViewStyle = {
    flexDirection: 'column',
    ...style,
  };

  const lineCount = Math.max(1, Math.round(lines));

  return (
    <View
      style={containerStyle}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: true }}
      testID="skeleton-text"
    >
      {Array.from({ length: lineCount }, (_, index) => {
        const isLast = index === lineCount - 1 && lineCount > 1;
        const widthValue = isLast ? `${lastLineWidth * 100}%` : '100%';

        return (
          <Skeleton
            key={index}
            shape="text"
            width={widthValue}
            height={lineHeight}
            duration={duration}
            animated={animated}
            style={index < lineCount - 1 ? { marginBottom: lineGap } : undefined}
            accessibilityLabel=""
          />
        );
      })}
    </View>
  );
}

SkeletonText.displayName = 'SkeletonText';
