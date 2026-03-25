/**
 * Type definitions for skeleton loading components.
 *
 * All skeleton components share common props for animation control,
 * accessibility, and theme integration.
 */

import { type ViewStyle } from 'react-native';

/** Supported skeleton shape variants */
export type SkeletonShape = 'rectangle' | 'circle' | 'text';

/** Animation configuration for shimmer effect */
export interface ShimmerConfig {
  /** Duration of one shimmer cycle in milliseconds. Default: 1200 */
  readonly duration?: number;
  /** Whether shimmer animation is active. Default: true */
  readonly animated?: boolean;
}

/** Base props shared by all skeleton components */
export interface SkeletonBaseProps extends ShimmerConfig {
  /** Width of the skeleton element (number in dp or string like '100%') */
  readonly width?: number | string;
  /** Height of the skeleton element (number in dp or string like '100%') */
  readonly height?: number | string;
  /** Border radius override. Uses theme defaults per shape if omitted. */
  readonly borderRadius?: number;
  /** Additional styles applied to the skeleton container */
  readonly style?: ViewStyle;
  /** Accessible label for screen readers. Default: 'Loading...' */
  readonly accessibilityLabel?: string;
}

/** Props for the base Skeleton component */
export interface SkeletonProps extends SkeletonBaseProps {
  /** Shape of the skeleton. Default: 'rectangle' */
  readonly shape?: SkeletonShape;
}

/** Props for SkeletonText (multi-line text placeholder) */
export interface SkeletonTextProps extends ShimmerConfig {
  /** Number of text lines to render. Default: 3 */
  readonly lines?: number;
  /** Height of each text line in dp. Default: 14 */
  readonly lineHeight?: number;
  /** Gap between lines in dp. Default: 8 */
  readonly lineGap?: number;
  /** Width of the last line as a fraction (0-1). Default: 0.6 */
  readonly lastLineWidth?: number;
  /** Additional styles applied to the container */
  readonly style?: ViewStyle;
  /** Accessible label for screen readers. Default: 'Loading text...' */
  readonly accessibilityLabel?: string;
}

/** Props for SkeletonAvatar (circular avatar placeholder) */
export interface SkeletonAvatarProps extends ShimmerConfig {
  /** Diameter of the avatar circle in dp. Default: 48 */
  readonly size?: number;
  /** Additional styles applied to the container */
  readonly style?: ViewStyle;
  /** Accessible label for screen readers. Default: 'Loading avatar...' */
  readonly accessibilityLabel?: string;
}

/** Props for SkeletonCard (card placeholder with content area) */
export interface SkeletonCardProps extends ShimmerConfig {
  /** Width of the card. Default: '100%' */
  readonly width?: number | string;
  /** Height of the card in dp. Default: 120 */
  readonly height?: number;
  /** Additional styles applied to the card container */
  readonly style?: ViewStyle;
  /** Accessible label for screen readers. Default: 'Loading card...' */
  readonly accessibilityLabel?: string;
}

/** Props for SkeletonProfileCard composition */
export interface SkeletonProfileCardProps extends ShimmerConfig {
  /** Additional styles applied to the container */
  readonly style?: ViewStyle;
  /** Accessible label for screen readers. Default: 'Loading profile...' */
  readonly accessibilityLabel?: string;
}

/** Props for SkeletonListItem composition */
export interface SkeletonListItemProps extends ShimmerConfig {
  /** Whether to show an avatar on the left. Default: true */
  readonly showAvatar?: boolean;
  /** Number of text lines in the list item. Default: 2 */
  readonly lines?: number;
  /** Additional styles applied to the container */
  readonly style?: ViewStyle;
  /** Accessible label for screen readers. Default: 'Loading list item...' */
  readonly accessibilityLabel?: string;
}

/** Props for SkeletonDocumentCard composition */
export interface SkeletonDocumentCardProps extends ShimmerConfig {
  /** Additional styles applied to the container */
  readonly style?: ViewStyle;
  /** Accessible label for screen readers. Default: 'Loading document...' */
  readonly accessibilityLabel?: string;
}
