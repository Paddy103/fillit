import { lightColors, darkColors } from './tokens/colors';
import { typographyStyles } from './tokens/typography';
import { spacing, radii, elevations } from './tokens/spacing';
import { type Theme } from './types';

/** Light theme — default for the app */
export const lightTheme: Theme = {
  colorScheme: 'light',
  colors: lightColors,
  typography: typographyStyles,
  spacing,
  radii,
  elevations,
};

/** Dark theme */
export const darkTheme: Theme = {
  colorScheme: 'dark',
  colors: darkColors,
  typography: typographyStyles,
  spacing,
  radii,
  elevations,
};

/** Resolve a theme by color scheme */
export function getThemeForScheme(scheme: 'light' | 'dark'): Theme {
  return scheme === 'dark' ? darkTheme : lightTheme;
}
