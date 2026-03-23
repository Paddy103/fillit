/**
 * Font configuration for the FillIt mobile app.
 *
 * Defines all custom font families and their weight mappings
 * used throughout the application.
 */

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';
import { DancingScript_400Regular } from '@expo-google-fonts/dancing-script';
import { GreatVibes_400Regular } from '@expo-google-fonts/great-vibes';

/**
 * Map of font names to their source assets.
 * Keys become the `fontFamily` values used in styles.
 */
export const fontAssets: Record<string, number> = {
  'Inter-Regular': Inter_400Regular,
  'Inter-Medium': Inter_500Medium,
  'Inter-SemiBold': Inter_600SemiBold,
  'Inter-Bold': Inter_700Bold,
  'JetBrainsMono-Regular': JetBrainsMono_400Regular,
  'DancingScript-Regular': DancingScript_400Regular,
  'GreatVibes-Regular': GreatVibes_400Regular,
};

/**
 * Font family constants for use in component styles.
 *
 * Use these instead of hardcoding font family strings to ensure
 * consistency and catch typos at compile time.
 */
export const FontFamily = {
  /** Inter Regular (400) — default body text */
  InterRegular: 'Inter-Regular',
  /** Inter Medium (500) — emphasized body text */
  InterMedium: 'Inter-Medium',
  /** Inter SemiBold (600) — subheadings */
  InterSemiBold: 'Inter-SemiBold',
  /** Inter Bold (700) — headings */
  InterBold: 'Inter-Bold',
  /** JetBrains Mono Regular (400) — monospace / code */
  JetBrainsMonoRegular: 'JetBrainsMono-Regular',
  /** Dancing Script Regular (400) — signature style 1 */
  DancingScriptRegular: 'DancingScript-Regular',
  /** Great Vibes Regular (400) — signature style 2 */
  GreatVibesRegular: 'GreatVibes-Regular',
} as const;

/** Union type of all available font family names */
export type FontFamilyName = (typeof FontFamily)[keyof typeof FontFamily];

/**
 * Semantic font categories for higher-level usage.
 *
 * Maps semantic purposes to specific font families, making it easy
 * to update the design system in one place.
 */
export const FontCategories = {
  /** Primary sans-serif font for body text */
  sans: {
    regular: FontFamily.InterRegular,
    medium: FontFamily.InterMedium,
    semiBold: FontFamily.InterSemiBold,
    bold: FontFamily.InterBold,
  },
  /** Monospace font for code or technical content */
  mono: {
    regular: FontFamily.JetBrainsMonoRegular,
  },
  /** Signature/handwriting fonts for document signatures */
  signature: {
    dancingScript: FontFamily.DancingScriptRegular,
    greatVibes: FontFamily.GreatVibesRegular,
  },
} as const;
