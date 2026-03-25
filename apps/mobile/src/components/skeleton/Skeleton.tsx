/**
 * Base skeleton loading component with shimmer animation.
 *
 * Renders a placeholder shape (rectangle, circle, or text line) with
 * a smooth animated shimmer effect. Adapts colors to the current theme
 * (light/dark mode) and announces loading state to screen readers.
 *
 * @example
 * ```tsx
 * // Rectangle skeleton
 * <Skeleton width={200} height={20} />
 *
 * // Circle skeleton
 * <Skeleton shape="circle" width={48} height={48} />
 *
 * // Full-width text line skeleton
 * <Skeleton shape="text" width="100%" height={14} />
 * ```
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { Animated, View, type ViewStyle } from 'react-native';

import { useTheme } from '../../theme';
import { type SkeletonProps } from './types';
import { useSkeletonColors } from './useSkeletonColors';

/** Default shimmer animation duration in ms */
const DEFAULT_DURATION = 1200;

/** Default dimensions by shape */
const SHAPE_DEFAULTS = {
  rectangle: { width: '100%' as const, height: 20, borderRadius: 4 },
  circle: { width: 48, height: 48, borderRadius: 9999 },
  text: { width: '100%' as const, height: 14, borderRadius: 4 },
} as const;

export function Skeleton({
  shape = 'rectangle',
  width,
  height,
  borderRadius,
  duration = DEFAULT_DURATION,
  animated = true,
  style,
  accessibilityLabel = 'Loading...',
}: SkeletonProps) {
  const { theme } = useTheme();
  const colors = useSkeletonColors();
  const pulseAnim = useRef(new Animated.Value(0)).current;

  const defaults = SHAPE_DEFAULTS[shape];
  const resolvedWidth = width ?? defaults.width;
  const resolvedHeight = height ?? defaults.height;
  const resolvedBorderRadius = borderRadius ?? defaults.borderRadius;

  useEffect(() => {
    if (!animated) {
      pulseAnim.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: duration / 2,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: duration / 2,
          useNativeDriver: false,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [animated, duration, pulseAnim]);

  const animatedStyle = useMemo<ViewStyle>(
    () => ({
      width: resolvedWidth as ViewStyle['width'],
      height: resolvedHeight as ViewStyle['height'],
      borderRadius: resolvedBorderRadius,
      overflow: 'hidden' as const,
    }),
    [resolvedWidth, resolvedHeight, resolvedBorderRadius],
  );

  const backgroundColor = animated
    ? pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [colors.base, colors.highlight],
      })
    : colors.base;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: true }}
    >
      <Animated.View
        style={[animatedStyle, { backgroundColor }, style]}
        testID="skeleton-element"
      />
    </View>
  );
}

Skeleton.displayName = 'Skeleton';
