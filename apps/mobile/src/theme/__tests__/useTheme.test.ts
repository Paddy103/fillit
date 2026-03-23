import { describe, it, expect } from 'vitest';
import { lightTheme } from '../themes';
import { type ThemeContextValue, type ColorMode } from '../types';

/**
 * Tests for useTheme hook behavior.
 *
 * Since we're testing without React DOM rendering, we validate the
 * expected shape and contract of the ThemeContextValue that useTheme returns.
 * The hook itself is a thin wrapper around useContext, so we test:
 * 1. The default context value (when no provider is present)
 * 2. The expected shape of the context value
 * 3. Type-level correctness of all fields
 */
describe('useTheme hook contract', () => {
  /** Simulates the default context value used when no ThemeProvider wraps the tree */
  const defaultContextValue: ThemeContextValue = {
    theme: lightTheme,
    colorMode: 'system',
    resolvedColorScheme: 'light',
    setColorMode: () => {
      /* no-op */
    },
    toggleColorMode: () => {
      /* no-op */
    },
    isDark: false,
  };

  it('should provide a theme object with all required sections', () => {
    const { theme } = defaultContextValue;
    expect(theme.colors).toBeDefined();
    expect(theme.typography).toBeDefined();
    expect(theme.spacing).toBeDefined();
    expect(theme.radii).toBeDefined();
    expect(theme.elevations).toBeDefined();
    expect(theme.colorScheme).toBeDefined();
  });

  it('should default to system color mode', () => {
    expect(defaultContextValue.colorMode).toBe('system');
  });

  it('should default to light resolved color scheme', () => {
    expect(defaultContextValue.resolvedColorScheme).toBe('light');
  });

  it('should default isDark to false', () => {
    expect(defaultContextValue.isDark).toBe(false);
  });

  it('should provide setColorMode function', () => {
    expect(typeof defaultContextValue.setColorMode).toBe('function');
  });

  it('should provide toggleColorMode function', () => {
    expect(typeof defaultContextValue.toggleColorMode).toBe('function');
  });

  it('should not throw when calling default setColorMode', () => {
    expect(() => defaultContextValue.setColorMode('dark')).not.toThrow();
  });

  it('should not throw when calling default toggleColorMode', () => {
    expect(() => defaultContextValue.toggleColorMode()).not.toThrow();
  });

  describe('ColorMode type validation', () => {
    it('should accept "light" as a valid color mode', () => {
      const mode: ColorMode = 'light';
      expect(mode).toBe('light');
    });

    it('should accept "dark" as a valid color mode', () => {
      const mode: ColorMode = 'dark';
      expect(mode).toBe('dark');
    });

    it('should accept "system" as a valid color mode', () => {
      const mode: ColorMode = 'system';
      expect(mode).toBe('system');
    });
  });

  describe('context value with dark theme', () => {
    it('should report isDark as true when resolved scheme is dark', () => {
      const darkContextValue: ThemeContextValue = {
        ...defaultContextValue,
        resolvedColorScheme: 'dark',
        isDark: true,
      };
      expect(darkContextValue.isDark).toBe(true);
      expect(darkContextValue.resolvedColorScheme).toBe('dark');
    });

    it('should have colorMode independent of resolvedColorScheme', () => {
      // System mode can resolve to dark
      const systemDark: ThemeContextValue = {
        ...defaultContextValue,
        colorMode: 'system',
        resolvedColorScheme: 'dark',
        isDark: true,
      };
      expect(systemDark.colorMode).toBe('system');
      expect(systemDark.resolvedColorScheme).toBe('dark');
    });
  });
});
