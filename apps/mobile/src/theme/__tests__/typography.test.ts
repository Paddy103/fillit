import { describe, it, expect } from 'vitest';
import {
  fontFamilies,
  fontWeights,
  fontSizes,
  lineHeights,
  letterSpacings,
  typographyStyles,
} from '../tokens/typography';

describe('Typography Tokens', () => {
  describe('fontFamilies', () => {
    it('should define system font families', () => {
      expect(fontFamilies.regular).toBe('System');
      expect(fontFamilies.medium).toBe('System');
      expect(fontFamilies.bold).toBe('System');
    });
  });

  describe('fontWeights', () => {
    it('should define all weight levels', () => {
      expect(fontWeights.regular).toBe('400');
      expect(fontWeights.medium).toBe('500');
      expect(fontWeights.semibold).toBe('600');
      expect(fontWeights.bold).toBe('700');
    });

    it('should use string values for cross-platform compatibility', () => {
      for (const [_key, value] of Object.entries(fontWeights)) {
        expect(typeof value).toBe('string');
      }
    });
  });

  describe('fontSizes', () => {
    it('should define a complete size scale', () => {
      expect(fontSizes.xs).toBe(10);
      expect(fontSizes.sm).toBe(12);
      expect(fontSizes.md).toBe(14);
      expect(fontSizes.lg).toBe(16);
      expect(fontSizes.xl).toBe(20);
      expect(fontSizes['2xl']).toBe(24);
      expect(fontSizes['3xl']).toBe(32);
      expect(fontSizes['4xl']).toBe(40);
    });

    it('should have sizes in ascending order', () => {
      const sizes = [
        fontSizes.xs,
        fontSizes.sm,
        fontSizes.md,
        fontSizes.lg,
        fontSizes.xl,
        fontSizes['2xl'],
        fontSizes['3xl'],
        fontSizes['4xl'],
      ];
      for (let i = 1; i < sizes.length; i++) {
        expect(sizes[i]).toBeGreaterThan(sizes[i - 1]!);
      }
    });

    it('should only contain positive numbers', () => {
      for (const [_key, value] of Object.entries(fontSizes)) {
        expect(value).toBeGreaterThan(0);
      }
    });
  });

  describe('lineHeights', () => {
    it('should define a complete line height scale', () => {
      expect(lineHeights.xs).toBeDefined();
      expect(lineHeights.sm).toBeDefined();
      expect(lineHeights.md).toBeDefined();
      expect(lineHeights.lg).toBeDefined();
      expect(lineHeights.xl).toBeDefined();
      expect(lineHeights['2xl']).toBeDefined();
      expect(lineHeights['3xl']).toBeDefined();
      expect(lineHeights['4xl']).toBeDefined();
    });

    it('should have line heights greater than or equal to corresponding font sizes', () => {
      expect(lineHeights.xs).toBeGreaterThanOrEqual(fontSizes.xs);
      expect(lineHeights.sm).toBeGreaterThanOrEqual(fontSizes.sm);
      expect(lineHeights.md).toBeGreaterThanOrEqual(fontSizes.md);
      expect(lineHeights.lg).toBeGreaterThanOrEqual(fontSizes.lg);
      expect(lineHeights.xl).toBeGreaterThanOrEqual(fontSizes.xl);
      expect(lineHeights['2xl']).toBeGreaterThanOrEqual(fontSizes['2xl']);
      expect(lineHeights['3xl']).toBeGreaterThanOrEqual(fontSizes['3xl']);
      expect(lineHeights['4xl']).toBeGreaterThanOrEqual(fontSizes['4xl']);
    });
  });

  describe('letterSpacings', () => {
    it('should define spacing values', () => {
      expect(letterSpacings.tight).toBeLessThan(0);
      expect(letterSpacings.normal).toBe(0);
      expect(letterSpacings.wide).toBeGreaterThan(0);
      expect(letterSpacings.wider).toBeGreaterThan(letterSpacings.wide);
    });
  });

  describe('typographyStyles', () => {
    const styleNames = [
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
    ] as const;

    it('should define all expected typography styles', () => {
      for (const name of styleNames) {
        expect(typographyStyles[name], `${name} should be defined`).toBeDefined();
      }
    });

    it('should include fontSize, lineHeight, fontWeight, and letterSpacing in every style', () => {
      for (const name of styleNames) {
        const style = typographyStyles[name];
        expect(style.fontSize, `${name}.fontSize`).toBeGreaterThan(0);
        expect(style.lineHeight, `${name}.lineHeight`).toBeGreaterThan(0);
        expect(style.fontWeight, `${name}.fontWeight`).toBeDefined();
        expect(typeof style.letterSpacing, `${name}.letterSpacing`).toBe('number');
      }
    });

    it('should have display styles larger than headline styles', () => {
      expect(typographyStyles.displayLarge.fontSize).toBeGreaterThan(
        typographyStyles.headlineLarge.fontSize,
      );
      expect(typographyStyles.displayMedium.fontSize).toBeGreaterThan(
        typographyStyles.headlineMedium.fontSize,
      );
    });

    it('should have headline styles larger than or equal to title styles', () => {
      expect(typographyStyles.headlineLarge.fontSize).toBeGreaterThanOrEqual(
        typographyStyles.titleLarge.fontSize,
      );
    });

    it('should have body styles larger than label styles of the same relative size', () => {
      expect(typographyStyles.bodyLarge.fontSize).toBeGreaterThanOrEqual(
        typographyStyles.labelLarge.fontSize,
      );
    });

    it('should have caption as the smallest style', () => {
      expect(typographyStyles.caption.fontSize).toBeLessThanOrEqual(
        typographyStyles.bodySmall.fontSize,
      );
    });
  });
});
