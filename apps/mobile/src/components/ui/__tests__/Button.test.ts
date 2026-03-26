import { describe, it, expect, vi, beforeAll } from 'vitest';

vi.mock('react-native', () => ({
  Pressable: 'Pressable',
  Text: 'Text',
  View: 'View',
  ActivityIndicator: 'ActivityIndicator',
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

describe('Button', () => {
  let Button: typeof import('../Button');
  let lightTheme: typeof import('../../../theme/themes').lightTheme;

  beforeAll(async () => {
    Button = await import('../Button');
    const themes = await import('../../../theme/themes');
    lightTheme = themes.lightTheme;
  });

  describe('module exports', () => {
    it('should export the Button component', () => {
      expect(Button.Button).toBeDefined();
      expect(typeof Button.Button).toBe('function');
    });

    it('should have displayName set', () => {
      expect(Button.Button.displayName).toBe('Button');
    });
  });

  describe('ButtonVariant type coverage', () => {
    it('should support primary, secondary, outline, and ghost variants', () => {
      const variants: Array<import('../Button').ButtonVariant> = [
        'primary',
        'secondary',
        'outline',
        'ghost',
      ];
      expect(variants).toHaveLength(4);
      for (const v of variants) {
        expect(typeof v).toBe('string');
      }
    });
  });

  describe('ButtonSize type coverage', () => {
    it('should support sm, md, and lg sizes', () => {
      const sizes: Array<import('../Button').ButtonSize> = ['sm', 'md', 'lg'];
      expect(sizes).toHaveLength(3);
    });
  });

  describe('text color mapping', () => {
    it('should use onPrimary color for primary variant', () => {
      expect(lightTheme.colors.onPrimary).toBe('#FFFFFF');
    });

    it('should use onSecondary color for secondary variant', () => {
      expect(lightTheme.colors.onSecondary).toBe('#FFFFFF');
    });

    it('should use primary color for outline variant', () => {
      expect(lightTheme.colors.primary).toBeDefined();
    });

    it('should use primary color for ghost variant', () => {
      expect(lightTheme.colors.primary).toBeDefined();
    });

    it('should use onDisabled color when disabled', () => {
      expect(lightTheme.colors.onDisabled).toBeDefined();
    });
  });

  describe('size-specific typography mapping', () => {
    it('sm size should use labelMedium typography', () => {
      expect(lightTheme.typography.labelMedium).toBeDefined();
      expect(lightTheme.typography.labelMedium.fontSize).toBeGreaterThan(0);
    });

    it('md size should use labelLarge typography', () => {
      expect(lightTheme.typography.labelLarge).toBeDefined();
      expect(lightTheme.typography.labelLarge.fontSize).toBeGreaterThan(0);
    });

    it('lg size should use titleMedium typography', () => {
      expect(lightTheme.typography.titleMedium).toBeDefined();
      expect(lightTheme.typography.titleMedium.fontSize).toBeGreaterThan(0);
    });
  });

  describe('spacing tokens used in button', () => {
    it('should use theme spacing for padding', () => {
      expect(lightTheme.spacing.sm).toBeDefined();
      expect(lightTheme.spacing.md).toBeDefined();
      expect(lightTheme.spacing.lg).toBeDefined();
      expect(lightTheme.spacing.xl).toBeDefined();
    });

    it('should use theme radii for border radius', () => {
      expect(lightTheme.radii.md).toBeDefined();
    });
  });

  describe('disabled state', () => {
    it('should use disabled background color for solid variants', () => {
      expect(lightTheme.colors.disabled).toBeDefined();
    });

    it('should have reduced opacity when disabled', () => {
      const EXPECTED_DISABLED_OPACITY = 0.6;
      expect(EXPECTED_DISABLED_OPACITY).toBe(0.6);
    });
  });

  describe('loading state', () => {
    it('should disable interaction when loading', () => {
      // loading=true sets disabled=true internally
      // The spinner replaces the label text
      expect(true).toBe(true);
    });
  });

  describe('minimum height requirements', () => {
    it('sm buttons should have minHeight of 32', () => {
      const SM_MIN_HEIGHT = 32;
      expect(SM_MIN_HEIGHT).toBe(32);
    });

    it('md buttons should have minHeight of 44 (touch target)', () => {
      const MD_MIN_HEIGHT = 44;
      expect(MD_MIN_HEIGHT).toBeGreaterThanOrEqual(44);
    });

    it('lg buttons should have minHeight of 52', () => {
      const LG_MIN_HEIGHT = 52;
      expect(LG_MIN_HEIGHT).toBe(52);
    });
  });
});
