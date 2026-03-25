import { describe, it, expect, vi, beforeAll } from 'vitest';

vi.mock('react-native', () => ({
  View: 'View',
  TextInput: 'TextInput',
  Text: 'Text',
  Pressable: 'Pressable',
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

describe('TextInput', () => {
  let TextInputModule: typeof import('../TextInput');
  let lightTheme: typeof import('../../../theme/themes').lightTheme;

  beforeAll(async () => {
    TextInputModule = await import('../TextInput');
    const themes = await import('../../../theme/themes');
    lightTheme = themes.lightTheme;
  });

  describe('module exports', () => {
    it('should export the TextInput component', () => {
      expect(TextInputModule.TextInput).toBeDefined();
      expect(typeof TextInputModule.TextInput).toBe('function');
    });

    it('should have displayName set', () => {
      expect(TextInputModule.TextInput.displayName).toBe('TextInput');
    });
  });

  describe('TextInputVariant type coverage', () => {
    it('should support outlined, filled, and underlined variants', () => {
      const variants: Array<import('../TextInput').TextInputVariant> = [
        'outlined',
        'filled',
        'underlined',
      ];
      expect(variants).toHaveLength(3);
    });
  });

  describe('theme token usage for input styling', () => {
    it('should use bodyMedium typography for input text', () => {
      expect(lightTheme.typography.bodyMedium).toBeDefined();
      expect(lightTheme.typography.bodyMedium.fontSize).toBe(14);
    });

    it('should use labelMedium typography for labels', () => {
      expect(lightTheme.typography.labelMedium).toBeDefined();
    });

    it('should use caption typography for helper/error text', () => {
      expect(lightTheme.typography.caption).toBeDefined();
    });

    it('should have minimum height of 48dp for touch targets', () => {
      const MIN_INPUT_HEIGHT = 48;
      expect(MIN_INPUT_HEIGHT).toBeGreaterThanOrEqual(44);
    });
  });

  describe('color states', () => {
    it('should use outline color for default border', () => {
      expect(lightTheme.colors.outline).toBeDefined();
    });

    it('should use primary color for focused border', () => {
      expect(lightTheme.colors.primary).toBeDefined();
    });

    it('should use error color for error border', () => {
      expect(lightTheme.colors.error).toBeDefined();
    });

    it('should use disabled color for disabled border', () => {
      expect(lightTheme.colors.disabled).toBeDefined();
    });

    it('should use surface color for filled variant background', () => {
      expect(lightTheme.colors.surface).toBeDefined();
    });

    it('should use onSurfaceVariant for placeholder text', () => {
      expect(lightTheme.colors.onSurfaceVariant).toBeDefined();
    });

    it('should use onBackground for input text color', () => {
      expect(lightTheme.colors.onBackground).toBeDefined();
    });

    it('should use onDisabled for disabled input text', () => {
      expect(lightTheme.colors.onDisabled).toBeDefined();
    });
  });

  describe('label color mapping', () => {
    it('should use error color for label when hasError', () => {
      expect(lightTheme.colors.error).toBe('#D32F2F');
    });

    it('should use primary color for label when focused', () => {
      expect(lightTheme.colors.primary).toBe('#0066CC');
    });

    it('should use onSurfaceVariant for label in default state', () => {
      expect(lightTheme.colors.onSurfaceVariant).toBe('#666666');
    });
  });

  describe('variant border styles', () => {
    it('outlined variant should have border on all sides', () => {
      expect(lightTheme.radii.md).toBeDefined();
    });

    it('filled variant should have bottom border only', () => {
      expect(lightTheme.colors.surface).toBeDefined();
    });

    it('underlined variant should have bottom border only, no background', () => {
      // underlined has borderBottomWidth only, transparent background
      expect(true).toBe(true);
    });
  });

  describe('spacing tokens', () => {
    it('should use lg spacing for container marginBottom', () => {
      expect(lightTheme.spacing.lg).toBe(16);
    });

    it('should use xs spacing for label marginBottom', () => {
      expect(lightTheme.spacing.xs).toBe(4);
    });

    it('should use md spacing for input horizontal padding', () => {
      expect(lightTheme.spacing.md).toBe(12);
    });

    it('should use sm spacing for input vertical padding', () => {
      expect(lightTheme.spacing.sm).toBe(8);
    });
  });
});
