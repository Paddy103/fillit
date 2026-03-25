/**
 * Hook to get skeleton-specific colors based on the current theme.
 *
 * Provides the base color and shimmer highlight color for skeleton
 * placeholders, adapting to light and dark modes.
 */

import { useMemo } from 'react';
import { useTheme } from '../../theme';

/** Skeleton color values */
export interface SkeletonColors {
  /** Background color of the skeleton element */
  readonly base: string;
  /** Highlight color of the shimmer sweep */
  readonly highlight: string;
}

/**
 * Returns skeleton-appropriate colors for the current theme.
 *
 * In light mode: uses subtle gray tones (surface/surfaceVariant).
 * In dark mode: uses slightly lighter surface tones for visibility.
 */
export function useSkeletonColors(): SkeletonColors {
  const { theme, isDark } = useTheme();

  return useMemo(
    () => ({
      base: isDark ? theme.colors.surfaceVariant : theme.colors.surface,
      highlight: isDark ? theme.colors.surface : theme.colors.surfaceVariant,
    }),
    [isDark, theme.colors.surface, theme.colors.surfaceVariant],
  );
}
