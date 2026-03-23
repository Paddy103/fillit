import { describe, it, expect } from 'vitest';
import { lightTheme, darkTheme, getThemeForScheme } from '../themes';
import { lightColors, darkColors } from '../tokens/colors';
import { typographyStyles } from '../tokens/typography';
import { spacing, radii, elevations } from '../tokens/spacing';

describe('Themes', () => {
  describe('lightTheme', () => {
    it('should have colorScheme set to light', () => {
      expect(lightTheme.colorScheme).toBe('light');
    });

    it('should use light colors', () => {
      expect(lightTheme.colors).toBe(lightColors);
    });

    it('should include typography styles', () => {
      expect(lightTheme.typography).toBe(typographyStyles);
    });

    it('should include spacing tokens', () => {
      expect(lightTheme.spacing).toBe(spacing);
    });

    it('should include border radius tokens', () => {
      expect(lightTheme.radii).toBe(radii);
    });

    it('should include elevation tokens', () => {
      expect(lightTheme.elevations).toBe(elevations);
    });
  });

  describe('darkTheme', () => {
    it('should have colorScheme set to dark', () => {
      expect(darkTheme.colorScheme).toBe('dark');
    });

    it('should use dark colors', () => {
      expect(darkTheme.colors).toBe(darkColors);
    });

    it('should include typography styles', () => {
      expect(darkTheme.typography).toBe(typographyStyles);
    });

    it('should share spacing tokens with light theme', () => {
      expect(darkTheme.spacing).toBe(lightTheme.spacing);
    });

    it('should share radii tokens with light theme', () => {
      expect(darkTheme.radii).toBe(lightTheme.radii);
    });

    it('should share elevation tokens with light theme', () => {
      expect(darkTheme.elevations).toBe(lightTheme.elevations);
    });
  });

  describe('getThemeForScheme', () => {
    it('should return light theme for "light" scheme', () => {
      expect(getThemeForScheme('light')).toBe(lightTheme);
    });

    it('should return dark theme for "dark" scheme', () => {
      expect(getThemeForScheme('dark')).toBe(darkTheme);
    });

    it('should return different themes for light and dark', () => {
      const light = getThemeForScheme('light');
      const dark = getThemeForScheme('dark');
      expect(light).not.toBe(dark);
      expect(light.colorScheme).toBe('light');
      expect(dark.colorScheme).toBe('dark');
    });
  });
});
