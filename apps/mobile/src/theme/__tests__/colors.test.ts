import { describe, it, expect } from 'vitest';
import { lightColors, darkColors, type ColorTokens } from '../tokens/colors';

describe('Color Tokens', () => {
  describe('lightColors', () => {
    it('should define all required primary color tokens', () => {
      expect(lightColors.primary).toBeDefined();
      expect(lightColors.primaryLight).toBeDefined();
      expect(lightColors.primaryDark).toBeDefined();
      expect(lightColors.onPrimary).toBeDefined();
    });

    it('should define all required secondary color tokens', () => {
      expect(lightColors.secondary).toBeDefined();
      expect(lightColors.secondaryLight).toBeDefined();
      expect(lightColors.secondaryDark).toBeDefined();
      expect(lightColors.onSecondary).toBeDefined();
    });

    it('should define all required surface color tokens', () => {
      expect(lightColors.background).toBeDefined();
      expect(lightColors.surface).toBeDefined();
      expect(lightColors.surfaceVariant).toBeDefined();
      expect(lightColors.onBackground).toBeDefined();
      expect(lightColors.onSurface).toBeDefined();
      expect(lightColors.onSurfaceVariant).toBeDefined();
    });

    it('should define all required status color tokens', () => {
      expect(lightColors.error).toBeDefined();
      expect(lightColors.errorLight).toBeDefined();
      expect(lightColors.onError).toBeDefined();
      expect(lightColors.success).toBeDefined();
      expect(lightColors.successLight).toBeDefined();
      expect(lightColors.onSuccess).toBeDefined();
      expect(lightColors.warning).toBeDefined();
      expect(lightColors.warningLight).toBeDefined();
      expect(lightColors.onWarning).toBeDefined();
      expect(lightColors.info).toBeDefined();
      expect(lightColors.infoLight).toBeDefined();
      expect(lightColors.onInfo).toBeDefined();
    });

    it('should define border and divider tokens', () => {
      expect(lightColors.outline).toBeDefined();
      expect(lightColors.outlineVariant).toBeDefined();
      expect(lightColors.divider).toBeDefined();
    });

    it('should define overlay and shadow tokens', () => {
      expect(lightColors.scrim).toBeDefined();
      expect(lightColors.shadow).toBeDefined();
    });

    it('should define disabled state tokens', () => {
      expect(lightColors.disabled).toBeDefined();
      expect(lightColors.onDisabled).toBeDefined();
    });

    it('should use valid color string values', () => {
      const hexOrRgba = /^(#[0-9A-Fa-f]{6}|rgba?\(.+\))$/;
      for (const [key, value] of Object.entries(lightColors)) {
        expect(value, `lightColors.${key} should be a valid color`).toMatch(hexOrRgba);
      }
    });

    it('should have a light background', () => {
      expect(lightColors.background).toBe('#FFFFFF');
    });
  });

  describe('darkColors', () => {
    it('should define all required primary color tokens', () => {
      expect(darkColors.primary).toBeDefined();
      expect(darkColors.primaryLight).toBeDefined();
      expect(darkColors.primaryDark).toBeDefined();
      expect(darkColors.onPrimary).toBeDefined();
    });

    it('should define all required surface color tokens', () => {
      expect(darkColors.background).toBeDefined();
      expect(darkColors.surface).toBeDefined();
      expect(darkColors.surfaceVariant).toBeDefined();
      expect(darkColors.onBackground).toBeDefined();
      expect(darkColors.onSurface).toBeDefined();
      expect(darkColors.onSurfaceVariant).toBeDefined();
    });

    it('should define all required status color tokens', () => {
      expect(darkColors.error).toBeDefined();
      expect(darkColors.success).toBeDefined();
      expect(darkColors.warning).toBeDefined();
      expect(darkColors.info).toBeDefined();
    });

    it('should use valid color string values', () => {
      const hexOrRgba = /^(#[0-9A-Fa-f]{6}|rgba?\(.+\))$/;
      for (const [key, value] of Object.entries(darkColors)) {
        expect(value, `darkColors.${key} should be a valid color`).toMatch(hexOrRgba);
      }
    });

    it('should have a dark background', () => {
      expect(darkColors.background).toBe('#121212');
    });
  });

  describe('ColorTokens interface', () => {
    it('should have the same keys in both light and dark palettes', () => {
      const lightKeys = Object.keys(lightColors).sort();
      const darkKeys = Object.keys(darkColors).sort();
      expect(lightKeys).toEqual(darkKeys);
    });

    it('should have different values for light and dark backgrounds', () => {
      expect(lightColors.background).not.toBe(darkColors.background);
    });

    it('should have different values for light and dark primary colors', () => {
      expect(lightColors.primary).not.toBe(darkColors.primary);
    });

    it('should satisfy the ColorTokens type constraint', () => {
      // Type-level assertion: both palettes implement ColorTokens
      const _lightCheck: ColorTokens = lightColors;
      const _darkCheck: ColorTokens = darkColors;
      expect(_lightCheck).toBe(lightColors);
      expect(_darkCheck).toBe(darkColors);
    });
  });
});
