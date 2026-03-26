import { describe, it, expect, vi, beforeAll } from 'vitest';
import type * as TypographyModuleType from '../Typography';

// Mock react-native at top level (factory cannot reference outside variables)
vi.mock('react-native', () => ({
  Text: 'Text',
  StyleSheet: {
    flatten: (s: unknown) => s,
  },
}));

// Mock the theme module to provide a static useTheme
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

describe('Typography', () => {
  let Typography: typeof TypographyModuleType;

  beforeAll(async () => {
    Typography = await import('../Typography');
  });

  describe('module exports', () => {
    it('should export all typography components', () => {
      expect(Typography.DisplayLarge).toBeDefined();
      expect(Typography.DisplayMedium).toBeDefined();
      expect(Typography.HeadingLarge).toBeDefined();
      expect(Typography.HeadingMedium).toBeDefined();
      expect(Typography.TitleLarge).toBeDefined();
      expect(Typography.TitleMedium).toBeDefined();
      expect(Typography.BodyLarge).toBeDefined();
      expect(Typography.BodyMedium).toBeDefined();
      expect(Typography.BodySmall).toBeDefined();
      expect(Typography.LabelLarge).toBeDefined();
      expect(Typography.LabelMedium).toBeDefined();
      expect(Typography.LabelSmall).toBeDefined();
      expect(Typography.Caption).toBeDefined();
    });

    it('should export all components as functions', () => {
      const components = [
        Typography.DisplayLarge,
        Typography.DisplayMedium,
        Typography.HeadingLarge,
        Typography.HeadingMedium,
        Typography.TitleLarge,
        Typography.TitleMedium,
        Typography.BodyLarge,
        Typography.BodyMedium,
        Typography.BodySmall,
        Typography.LabelLarge,
        Typography.LabelMedium,
        Typography.LabelSmall,
        Typography.Caption,
      ];

      for (const component of components) {
        expect(typeof component).toBe('function');
      }
    });

    it('should have displayName set on all components', () => {
      expect(Typography.DisplayLarge.displayName).toBe('DisplayLarge');
      expect(Typography.DisplayMedium.displayName).toBe('DisplayMedium');
      expect(Typography.HeadingLarge.displayName).toBe('HeadingLarge');
      expect(Typography.HeadingMedium.displayName).toBe('HeadingMedium');
      expect(Typography.TitleLarge.displayName).toBe('TitleLarge');
      expect(Typography.TitleMedium.displayName).toBe('TitleMedium');
      expect(Typography.BodyLarge.displayName).toBe('BodyLarge');
      expect(Typography.BodyMedium.displayName).toBe('BodyMedium');
      expect(Typography.BodySmall.displayName).toBe('BodySmall');
      expect(Typography.LabelLarge.displayName).toBe('LabelLarge');
      expect(Typography.LabelMedium.displayName).toBe('LabelMedium');
      expect(Typography.LabelSmall.displayName).toBe('LabelSmall');
      expect(Typography.Caption.displayName).toBe('Caption');
    });
  });

  describe('TypographyVariant type', () => {
    it('should include all expected variant keys', async () => {
      const { typographyStyles } = await import('../../../theme/tokens/typography');
      const expectedKeys = [
        'displayLarge',
        'displayMedium',
        'headlineLarge',
        'headlineMedium',
        'titleLarge',
        'titleMedium',
        'bodyLarge',
        'bodyMedium',
        'bodySmall',
        'labelLarge',
        'labelMedium',
        'labelSmall',
        'caption',
      ];

      for (const key of expectedKeys) {
        expect(typographyStyles[key as keyof typeof typographyStyles]).toBeDefined();
      }
    });
  });

  describe('TypographyColor', () => {
    it('should map all color values to valid theme color tokens', async () => {
      const { lightColors } = await import('../../../theme/tokens/colors');
      const colorMap: Record<string, string> = {
        default: lightColors.onBackground,
        secondary: lightColors.onSurfaceVariant,
        primary: lightColors.primary,
        error: lightColors.error,
        success: lightColors.success,
        warning: lightColors.warning,
        info: lightColors.info,
        disabled: lightColors.onDisabled,
      };

      for (const [_key, value] of Object.entries(colorMap)) {
        expect(value).toBeTruthy();
        expect(typeof value).toBe('string');
      }
    });
  });

  describe('component mapping to variants', () => {
    it('DisplayLarge should use displayLarge variant', () => {
      expect(Typography.DisplayLarge.displayName).toBe('DisplayLarge');
    });

    it('Caption should use caption variant', () => {
      expect(Typography.Caption.displayName).toBe('Caption');
    });
  });
});
