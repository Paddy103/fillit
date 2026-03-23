import { type ColorTokens } from './tokens/colors';
import { type TypographyTokens } from './tokens/typography';
import { type SpacingTokens, type RadiiTokens, type ElevationTokens } from './tokens/spacing';

/** Supported color scheme modes */
export type ColorMode = 'light' | 'dark' | 'system';

/** Resolved color scheme (never 'system') */
export type ResolvedColorScheme = 'light' | 'dark';

/** Complete theme object shape */
export interface Theme {
  /** Resolved color scheme (light or dark) */
  readonly colorScheme: ResolvedColorScheme;
  /** Semantic color tokens */
  readonly colors: ColorTokens;
  /** Pre-composed typography styles */
  readonly typography: TypographyTokens;
  /** Spacing scale */
  readonly spacing: SpacingTokens;
  /** Border radius scale */
  readonly radii: RadiiTokens;
  /** Elevation / shadow tokens */
  readonly elevations: ElevationTokens;
}

/** Context value provided by ThemeProvider */
export interface ThemeContextValue {
  /** The resolved theme object */
  readonly theme: Theme;
  /** Current color mode preference (may be 'system') */
  readonly colorMode: ColorMode;
  /** Resolved color scheme (never 'system') */
  readonly resolvedColorScheme: ResolvedColorScheme;
  /** Update color mode preference */
  readonly setColorMode: (mode: ColorMode) => void;
  /** Toggle between light and dark (ignores system) */
  readonly toggleColorMode: () => void;
  /** Whether the current resolved scheme is dark */
  readonly isDark: boolean;
}
