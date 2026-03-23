import { createContext } from 'react';
import { type ThemeContextValue } from './types';
import { lightTheme } from './themes';

/**
 * Default context value used when no ThemeProvider is present.
 * Falls back to light theme with no-op setters.
 */
const defaultContextValue: ThemeContextValue = {
  theme: lightTheme,
  colorMode: 'system',
  resolvedColorScheme: 'light',
  setColorMode: () => {
    /* no-op outside provider */
  },
  toggleColorMode: () => {
    /* no-op outside provider */
  },
  isDark: false,
};

/**
 * React context for the theme system.
 * Use the `useTheme` hook instead of consuming this directly.
 */
export const ThemeContext = createContext<ThemeContextValue>(defaultContextValue);

ThemeContext.displayName = 'ThemeContext';
