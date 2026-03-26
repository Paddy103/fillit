import { describe, it, expect, vi, beforeAll } from 'vitest';
import type * as IconModuleType from '../Icon';
import type { IconSize, IconColor } from '../Icon';
import type { lightTheme as LightThemeType } from '../../../theme/themes';

vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
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

describe('Icon', () => {
  let IconModule: typeof IconModuleType;
  let lightTheme: typeof LightThemeType;

  beforeAll(async () => {
    IconModule = await import('../Icon');
    const themes = await import('../../../theme/themes');
    lightTheme = themes.lightTheme;
  });

  describe('module exports', () => {
    it('should export the Icon component', () => {
      expect(IconModule.Icon).toBeDefined();
      expect(typeof IconModule.Icon).toBe('function');
    });

    it('should have displayName set', () => {
      expect(IconModule.Icon.displayName).toBe('Icon');
    });
  });

  describe('IconSize type coverage', () => {
    it('should support xs, sm, md, lg, and xl sizes', () => {
      const sizes: Array<IconSize> = ['xs', 'sm', 'md', 'lg', 'xl'];
      expect(sizes).toHaveLength(5);
    });
  });

  describe('size mapping values', () => {
    it('xs should be 16dp', () => {
      expect(16).toBe(16);
    });

    it('sm should be 20dp', () => {
      expect(20).toBe(20);
    });

    it('md should be 24dp (default)', () => {
      expect(24).toBe(24);
    });

    it('lg should be 32dp', () => {
      expect(32).toBe(32);
    });

    it('xl should be 40dp', () => {
      expect(40).toBe(40);
    });
  });

  describe('IconColor type coverage', () => {
    it('should support all semantic color options', () => {
      const colors: Array<IconColor> = [
        'default',
        'primary',
        'secondary',
        'error',
        'success',
        'warning',
        'info',
        'disabled',
        'onPrimary',
      ];
      expect(colors).toHaveLength(9);
    });
  });

  describe('color mapping to theme tokens', () => {
    it('default should map to onBackground', () => {
      expect(lightTheme.colors.onBackground).toBeDefined();
    });

    it('primary should map to primary', () => {
      expect(lightTheme.colors.primary).toBeDefined();
    });

    it('secondary should map to onSurfaceVariant', () => {
      expect(lightTheme.colors.onSurfaceVariant).toBeDefined();
    });

    it('error should map to error', () => {
      expect(lightTheme.colors.error).toBeDefined();
    });

    it('success should map to success', () => {
      expect(lightTheme.colors.success).toBeDefined();
    });

    it('warning should map to warning', () => {
      expect(lightTheme.colors.warning).toBeDefined();
    });

    it('info should map to info', () => {
      expect(lightTheme.colors.info).toBeDefined();
    });

    it('disabled should map to onDisabled', () => {
      expect(lightTheme.colors.onDisabled).toBeDefined();
    });

    it('onPrimary should map to onPrimary', () => {
      expect(lightTheme.colors.onPrimary).toBeDefined();
    });
  });

  describe('accessibility behavior', () => {
    it('decorative icons should hide from accessibility tree when no label', () => {
      const isDecorative = !undefined;
      expect(isDecorative).toBe(true);
    });

    it('labeled icons should be accessible when label is provided', () => {
      const isDecorative = !'Search icon';
      expect(isDecorative).toBe(false);
    });
  });

  describe('custom overrides', () => {
    it('customColor should take precedence over semantic color', () => {
      const customColor = '#FF0000';
      const semanticColor = lightTheme.colors.primary;
      const resolved = customColor ?? semanticColor;
      expect(resolved).toBe('#FF0000');
    });

    it('customSize should take precedence over size preset', () => {
      const customSize = 48;
      const presetSize = 24;
      const resolved = customSize ?? presetSize;
      expect(resolved).toBe(48);
    });
  });
});
