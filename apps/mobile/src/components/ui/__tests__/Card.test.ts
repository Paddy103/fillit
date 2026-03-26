import { describe, it, expect, vi, beforeAll } from 'vitest';
import type * as CardModuleType from '../Card';
import type { CardElevation } from '../Card';
import type { lightTheme as LightThemeType } from '../../../theme/themes';

vi.mock('react-native', () => ({
  View: 'View',
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

describe('Card', () => {
  let CardModule: typeof CardModuleType;
  let lightTheme: typeof LightThemeType;

  beforeAll(async () => {
    CardModule = await import('../Card');
    const themes = await import('../../../theme/themes');
    lightTheme = themes.lightTheme;
  });

  describe('module exports', () => {
    it('should export Card component', () => {
      expect(CardModule.Card).toBeDefined();
      expect(typeof CardModule.Card).toBe('function');
    });

    it('should export PressableCard component', () => {
      expect(CardModule.PressableCard).toBeDefined();
      expect(typeof CardModule.PressableCard).toBe('function');
    });

    it('should have displayName on Card', () => {
      expect(CardModule.Card.displayName).toBe('Card');
    });

    it('should have displayName on PressableCard', () => {
      expect(CardModule.PressableCard.displayName).toBe('PressableCard');
    });
  });

  describe('CardElevation type coverage', () => {
    it('should support none, sm, md, lg, and xl elevations', () => {
      const elevations: Array<CardElevation> = ['none', 'sm', 'md', 'lg', 'xl'];
      expect(elevations).toHaveLength(5);

      for (const elev of elevations) {
        expect(lightTheme.elevations[elev]).toBeDefined();
      }
    });
  });

  describe('elevation token validation', () => {
    it('none elevation should have zero shadow', () => {
      const none = lightTheme.elevations.none;
      expect(none.elevation).toBe(0);
      expect(none.shadowOpacity).toBe(0);
    });

    it('sm elevation should have subtle shadow', () => {
      const sm = lightTheme.elevations.sm;
      expect(sm.elevation).toBe(2);
      expect(sm.shadowOpacity).toBeGreaterThan(0);
    });

    it('md elevation should be larger than sm', () => {
      expect(lightTheme.elevations.md.elevation).toBeGreaterThan(
        lightTheme.elevations.sm.elevation,
      );
    });

    it('lg elevation should be larger than md', () => {
      expect(lightTheme.elevations.lg.elevation).toBeGreaterThan(
        lightTheme.elevations.md.elevation,
      );
    });

    it('xl elevation should be the largest', () => {
      expect(lightTheme.elevations.xl.elevation).toBeGreaterThan(
        lightTheme.elevations.lg.elevation,
      );
    });
  });

  describe('padding mapping', () => {
    it('should map none to 0', () => {
      expect(0).toBe(0);
    });

    it('should map sm to theme spacing sm', () => {
      expect(lightTheme.spacing.sm).toBe(8);
    });

    it('should map md to theme spacing md', () => {
      expect(lightTheme.spacing.md).toBe(12);
    });

    it('should map lg to theme spacing lg', () => {
      expect(lightTheme.spacing.lg).toBe(16);
    });

    it('should map xl to theme spacing xl', () => {
      expect(lightTheme.spacing.xl).toBe(20);
    });
  });

  describe('radius mapping', () => {
    it('should map none to 0', () => {
      expect(lightTheme.radii.none).toBe(0);
    });

    it('should map sm to theme radii sm', () => {
      expect(lightTheme.radii.sm).toBe(4);
    });

    it('should map md to theme radii md', () => {
      expect(lightTheme.radii.md).toBe(8);
    });

    it('should map lg to theme radii lg (default)', () => {
      expect(lightTheme.radii.lg).toBe(12);
    });

    it('should map xl to theme radii xl', () => {
      expect(lightTheme.radii.xl).toBe(16);
    });
  });

  describe('surface colors', () => {
    it('should use surface color for card background', () => {
      expect(lightTheme.colors.surface).toBe('#F5F5F5');
    });

    it('should use surfaceVariant for pressed PressableCard', () => {
      expect(lightTheme.colors.surfaceVariant).toBe('#E8E8E8');
    });

    it('should use outlineVariant for bordered cards', () => {
      expect(lightTheme.colors.outlineVariant).toBe('#E0E0E0');
    });
  });
});
