/**
 * Typography scale tokens for the FillIt design system.
 *
 * Uses a modular scale based on platform defaults.
 * Font weights use numeric values for cross-platform consistency.
 */

import { type TextStyle } from 'react-native';

/**
 * Font family tokens.
 * Uses system defaults for optimal rendering on each platform.
 */
export const fontFamilies = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
} as const;

/** Font weight tokens using numeric values for cross-platform compatibility */
export const fontWeights = {
  regular: '400' as TextStyle['fontWeight'],
  medium: '500' as TextStyle['fontWeight'],
  semibold: '600' as TextStyle['fontWeight'],
  bold: '700' as TextStyle['fontWeight'],
};

/** Font size scale (in dp) following a modular type scale */
export const fontSizes = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
} as const;

/** Line height scale (in dp) paired with font sizes */
export const lineHeights = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
} as const;

/** Letter spacing scale (in dp) */
export const letterSpacings = {
  tight: -0.5,
  normal: 0,
  wide: 0.5,
  wider: 1.0,
} as const;

/** Pre-composed typography styles for common text roles */
export const typographyStyles = {
  displayLarge: {
    fontSize: fontSizes['4xl'],
    lineHeight: lineHeights['4xl'],
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacings.tight,
  },
  displayMedium: {
    fontSize: fontSizes['3xl'],
    lineHeight: lineHeights['3xl'],
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacings.tight,
  },
  headlineLarge: {
    fontSize: fontSizes['2xl'],
    lineHeight: lineHeights['2xl'],
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacings.normal,
  },
  headlineMedium: {
    fontSize: fontSizes.xl,
    lineHeight: lineHeights.xl,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacings.normal,
  },
  titleLarge: {
    fontSize: fontSizes.lg,
    lineHeight: lineHeights.lg,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacings.normal,
  },
  titleMedium: {
    fontSize: fontSizes.md,
    lineHeight: lineHeights.md,
    fontWeight: fontWeights.medium,
    letterSpacing: letterSpacings.wide,
  },
  bodyLarge: {
    fontSize: fontSizes.lg,
    lineHeight: lineHeights.lg,
    fontWeight: fontWeights.regular,
    letterSpacing: letterSpacings.normal,
  },
  bodyMedium: {
    fontSize: fontSizes.md,
    lineHeight: lineHeights.md,
    fontWeight: fontWeights.regular,
    letterSpacing: letterSpacings.normal,
  },
  bodySmall: {
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
    fontWeight: fontWeights.regular,
    letterSpacing: letterSpacings.normal,
  },
  labelLarge: {
    fontSize: fontSizes.md,
    lineHeight: lineHeights.md,
    fontWeight: fontWeights.medium,
    letterSpacing: letterSpacings.wide,
  },
  labelMedium: {
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
    fontWeight: fontWeights.medium,
    letterSpacing: letterSpacings.wide,
  },
  labelSmall: {
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.xs,
    fontWeight: fontWeights.medium,
    letterSpacing: letterSpacings.wider,
  },
  caption: {
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.xs,
    fontWeight: fontWeights.regular,
    letterSpacing: letterSpacings.normal,
  },
} as const;

/** The shape of a single typography style */
export type TypographyStyle = {
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly fontWeight: TextStyle['fontWeight'];
  readonly letterSpacing: number;
};

/** The shape of the complete typography token set */
export type TypographyTokens = typeof typographyStyles;
