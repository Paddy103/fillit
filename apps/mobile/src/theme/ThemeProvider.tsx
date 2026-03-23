import React, { useState, useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { ThemeContext } from './ThemeContext';
import { getThemeForScheme } from './themes';
import { type ColorMode, type ResolvedColorScheme, type ThemeContextValue } from './types';

/** Props for the ThemeProvider component */
interface ThemeProviderProps {
  /** Initial color mode preference. Defaults to 'system'. */
  readonly initialColorMode?: ColorMode;
  /** Children to render within the theme context */
  readonly children: React.ReactNode;
}

/**
 * Provides theme context to the application.
 *
 * Supports three modes:
 * - `'light'` — always use light theme
 * - `'dark'` — always use dark theme
 * - `'system'` — follow the device color scheme preference
 *
 * @example
 * ```tsx
 * <ThemeProvider initialColorMode="system">
 *   <App />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({ initialColorMode = 'system', children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [colorMode, setColorMode] = useState<ColorMode>(initialColorMode);

  const resolvedColorScheme: ResolvedColorScheme = useMemo(() => {
    if (colorMode === 'system') {
      return systemColorScheme === 'dark' ? 'dark' : 'light';
    }
    return colorMode;
  }, [colorMode, systemColorScheme]);

  const theme = useMemo(() => getThemeForScheme(resolvedColorScheme), [resolvedColorScheme]);

  const toggleColorMode = useCallback(() => {
    setColorMode((current) => {
      if (current === 'system') {
        // When toggling from system, go to the opposite of current resolved scheme
        return resolvedColorScheme === 'dark' ? 'light' : 'dark';
      }
      return current === 'dark' ? 'light' : 'dark';
    });
  }, [resolvedColorScheme]);

  const contextValue: ThemeContextValue = useMemo(
    () => ({
      theme,
      colorMode,
      resolvedColorScheme,
      setColorMode,
      toggleColorMode,
      isDark: resolvedColorScheme === 'dark',
    }),
    [theme, colorMode, resolvedColorScheme, toggleColorMode],
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}
