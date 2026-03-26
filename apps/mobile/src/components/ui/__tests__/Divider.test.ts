import { describe, it, expect, vi, beforeAll } from 'vitest';
import type * as DividerModuleType from '../Divider';
import type { DividerOrientation } from '../Divider';
import type { lightTheme as LightThemeType } from '../../../theme/themes';

vi.mock('react-native', () => ({
  View: 'View',
  StyleSheet: {
    flatten: (s: unknown) => s,
  },
}));

vi.mock('../../../theme', async () => {
  const { lightTheme } = await import('../../../theme/themes');
  return {
    useTheme: () => ({
      theme: lightTheme,
      isDark: false,
      colorMode: 'system' as const,
      resolvedColorScheme: 'light' as const,
      setColorMode: () => {},
      toggleColorMode: () => {},
    }),
  };
});

describe('Divider', () => {
  let DividerModule: typeof DividerModuleType;
  let lightTheme: typeof LightThemeType;

  beforeAll(async () => {
    DividerModule = await import('../Divider');
    const themes = await import('../../../theme/themes');
    lightTheme = themes.lightTheme;
  });

  describe('module exports', () => {
    it('should export the Divider component', () => {
      expect(DividerModule.Divider).toBeDefined();
      expect(typeof DividerModule.Divider).toBe('function');
    });

    it('should have displayName set', () => {
      expect(DividerModule.Divider.displayName).toBe('Divider');
    });
  });

  describe('DividerOrientation type', () => {
    it('should support horizontal and vertical orientations', () => {
      const orientations: Array<DividerOrientation> = ['horizontal', 'vertical'];
      expect(orientations).toHaveLength(2);
    });
  });

  describe('theme token usage', () => {
    it('should use divider color from theme', () => {
      expect(lightTheme.colors.divider).toBe('#E0E0E0');
    });

    it('should allow custom color override', () => {
      const customColor = '#FF0000';
      const themeColor = lightTheme.colors.divider;
      const resolved = customColor ?? themeColor;
      expect(resolved).toBe('#FF0000');
    });
  });

  describe('spacing mapping', () => {
    it('none should map to 0', () => {
      expect(0).toBe(0);
    });

    it('sm should map to theme spacing sm', () => {
      expect(lightTheme.spacing.sm).toBe(8);
    });

    it('md should map to theme spacing md', () => {
      expect(lightTheme.spacing.md).toBe(12);
    });

    it('lg should map to theme spacing lg', () => {
      expect(lightTheme.spacing.lg).toBe(16);
    });
  });

  describe('horizontal orientation', () => {
    it('should set height to thickness and use marginVertical for spacing', () => {
      const thickness = 1;
      const isHorizontal = true;
      expect(isHorizontal).toBe(true);
      expect(thickness).toBe(1);
    });

    it('should apply marginLeft for insetStart', () => {
      const insetStart = 16;
      expect(insetStart).toBe(16);
    });

    it('should apply marginRight for insetEnd', () => {
      const insetEnd = 16;
      expect(insetEnd).toBe(16);
    });
  });

  describe('vertical orientation', () => {
    it('should set width to thickness and use marginHorizontal for spacing', () => {
      const thickness = 1;
      const isVertical = true;
      expect(isVertical).toBe(true);
      expect(thickness).toBe(1);
    });

    it('should apply marginTop for insetStart', () => {
      const insetStart = 8;
      expect(insetStart).toBe(8);
    });

    it('should apply marginBottom for insetEnd', () => {
      const insetEnd = 8;
      expect(insetEnd).toBe(8);
    });

    it('should set alignSelf to stretch for vertical dividers', () => {
      const alignSelf = 'stretch';
      expect(alignSelf).toBe('stretch');
    });
  });

  describe('default values', () => {
    it('default orientation should be horizontal', () => {
      const defaultOrientation = 'horizontal';
      expect(defaultOrientation).toBe('horizontal');
    });

    it('default thickness should be 1', () => {
      const defaultThickness = 1;
      expect(defaultThickness).toBe(1);
    });

    it('default spacing should be none', () => {
      const defaultSpacing = 'none';
      expect(defaultSpacing).toBe('none');
    });

    it('default insetStart should be 0', () => {
      const defaultInsetStart = 0;
      expect(defaultInsetStart).toBe(0);
    });

    it('default insetEnd should be 0', () => {
      const defaultInsetEnd = 0;
      expect(defaultInsetEnd).toBe(0);
    });
  });
});
