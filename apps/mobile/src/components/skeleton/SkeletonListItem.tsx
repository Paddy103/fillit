/**
 * List item skeleton composition.
 *
 * Renders a list item loading state with an optional avatar and
 * configurable text lines. Commonly used in lists, search results,
 * and document feeds.
 *
 * Layout:
 * ┌──────────────────────────────────┐
 * │  ┌────┐  ████████████████████    │
 * │  │ OO │  ██████████████          │
 * │  └────┘                          │
 * └──────────────────────────────────┘
 *
 * @example
 * ```tsx
 * <SkeletonListItem />
 * <SkeletonListItem showAvatar={false} lines={3} />
 * ```
 */

import React from 'react';
import { View, type ViewStyle } from 'react-native';

import { useTheme } from '../../theme';
import { type SkeletonListItemProps } from './types';
import { SkeletonAvatar } from './SkeletonAvatar';
import { Skeleton } from './Skeleton';

export function SkeletonListItem({
  showAvatar = true,
  lines = 2,
  duration,
  animated,
  style,
  accessibilityLabel = 'Loading list item...',
}: SkeletonListItemProps) {
  const { theme } = useTheme();

  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    ...style,
  };

  const textContainerStyle: ViewStyle = {
    flex: 1,
    marginLeft: showAvatar ? theme.spacing.md : 0,
  };

  const lineCount = Math.max(1, Math.round(lines));

  return (
    <View
      style={containerStyle}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: true }}
      testID="skeleton-list-item"
    >
      {showAvatar && (
        <SkeletonAvatar size={40} duration={duration} animated={animated} accessibilityLabel="" />
      )}

      <View style={textContainerStyle}>
        {Array.from({ length: lineCount }, (_, index) => {
          const isFirst = index === 0;
          const isLast = index === lineCount - 1 && lineCount > 1;

          return (
            <Skeleton
              key={index}
              shape="text"
              width={isLast ? '60%' : isFirst ? '80%' : '70%'}
              height={isFirst ? 14 : 12}
              duration={duration}
              animated={animated}
              style={index < lineCount - 1 ? { marginBottom: theme.spacing.sm } : undefined}
              accessibilityLabel=""
            />
          );
        })}
      </View>
    </View>
  );
}

SkeletonListItem.displayName = 'SkeletonListItem';
