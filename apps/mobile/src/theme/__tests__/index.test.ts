import { describe, it, expect, vi, beforeAll } from 'vitest';

// Mock react-native since Vitest cannot parse its Flow syntax
vi.mock('react-native', () => ({
  useColorScheme: vi.fn(() => 'light'),
}));

/* eslint-disable @typescript-eslint/consistent-type-imports */
let mod: typeof import('../index');

beforeAll(async () => {
  mod = await import('../index');
});

describe('Theme public API (index.ts)', () => {
  it('should export ThemeProvider', () => {
    expect(mod.ThemeProvider).toBeDefined();
    expect(typeof mod.ThemeProvider).toBe('function');
  });

  it('should export ThemeContext', () => {
    expect(mod.ThemeContext).toBeDefined();
    expect(mod.ThemeContext.Provider).toBeDefined();
  });

  it('should export useTheme hook', () => {
    expect(mod.useTheme).toBeDefined();
    expect(typeof mod.useTheme).toBe('function');
  });

  it('should export lightTheme and darkTheme', () => {
    expect(mod.lightTheme).toBeDefined();
    expect(mod.darkTheme).toBeDefined();
    expect(mod.lightTheme.colorScheme).toBe('light');
    expect(mod.darkTheme.colorScheme).toBe('dark');
  });

  it('should export getThemeForScheme', () => {
    expect(mod.getThemeForScheme).toBeDefined();
    expect(typeof mod.getThemeForScheme).toBe('function');
  });

  it('should export color token objects', () => {
    expect(mod.lightColors).toBeDefined();
    expect(mod.darkColors).toBeDefined();
    expect(typeof mod.lightColors.primary).toBe('string');
    expect(typeof mod.darkColors.primary).toBe('string');
  });

  it('should export typography token objects', () => {
    expect(mod.fontFamilies).toBeDefined();
    expect(mod.fontWeights).toBeDefined();
    expect(mod.fontSizes).toBeDefined();
    expect(mod.lineHeights).toBeDefined();
    expect(mod.letterSpacings).toBeDefined();
    expect(mod.typographyStyles).toBeDefined();
  });

  it('should export spacing and layout token objects', () => {
    expect(mod.spacing).toBeDefined();
    expect(mod.radii).toBeDefined();
    expect(mod.elevations).toBeDefined();
  });

  describe('theme consistency', () => {
    it('should have lightTheme.colors equal to lightColors', () => {
      expect(mod.lightTheme.colors).toBe(mod.lightColors);
    });

    it('should have darkTheme.colors equal to darkColors', () => {
      expect(mod.darkTheme.colors).toBe(mod.darkColors);
    });

    it('should share typography across themes', () => {
      expect(mod.lightTheme.typography).toBe(mod.darkTheme.typography);
    });

    it('should share spacing across themes', () => {
      expect(mod.lightTheme.spacing).toBe(mod.darkTheme.spacing);
    });

    it('should share radii across themes', () => {
      expect(mod.lightTheme.radii).toBe(mod.darkTheme.radii);
    });

    it('should share elevations across themes', () => {
      expect(mod.lightTheme.elevations).toBe(mod.darkTheme.elevations);
    });
  });
});
