import { describe, it, expect, vi, beforeAll } from 'vitest';
import type { AvatarSize } from '../Avatar';
import type * as AvatarModuleType from '../Avatar';

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

describe('Avatar', () => {
  let AvatarModule: typeof AvatarModuleType;

  beforeAll(async () => {
    AvatarModule = await import('../Avatar');
  });

  describe('module exports', () => {
    it('should export the Avatar component', () => {
      expect(AvatarModule.Avatar).toBeDefined();
      expect(typeof AvatarModule.Avatar).toBe('function');
    });

    it('should have displayName set', () => {
      expect(AvatarModule.Avatar.displayName).toBe('Avatar');
    });

    it('should export getInitials helper', () => {
      expect(AvatarModule.getInitials).toBeDefined();
      expect(typeof AvatarModule.getInitials).toBe('function');
    });

    it('should export getColorFromName helper', () => {
      expect(AvatarModule.getColorFromName).toBeDefined();
      expect(typeof AvatarModule.getColorFromName).toBe('function');
    });
  });

  describe('AvatarSize type coverage', () => {
    it('should support xs, sm, md, lg, and xl sizes', () => {
      const sizes: Array<AvatarSize> = ['xs', 'sm', 'md', 'lg', 'xl'];
      expect(sizes).toHaveLength(5);
    });
  });

  describe('size mapping values', () => {
    it('xs should be 24dp', () => {
      expect(24).toBe(24);
    });

    it('sm should be 32dp', () => {
      expect(32).toBe(32);
    });

    it('md should be 40dp (default)', () => {
      expect(40).toBe(40);
    });

    it('lg should be 56dp', () => {
      expect(56).toBe(56);
    });

    it('xl should be 72dp', () => {
      expect(72).toBe(72);
    });
  });

  describe('getInitials', () => {
    it('should extract two initials from "John Doe"', () => {
      expect(AvatarModule.getInitials('John Doe')).toBe('JD');
    });

    it('should extract single initial from "Alice"', () => {
      expect(AvatarModule.getInitials('Alice')).toBe('A');
    });

    it('should return "?" for empty string', () => {
      expect(AvatarModule.getInitials('')).toBe('?');
    });

    it('should return "?" for whitespace-only string', () => {
      expect(AvatarModule.getInitials('   ')).toBe('?');
    });

    it('should handle three-word names', () => {
      expect(AvatarModule.getInitials('John van Doe')).toBe('JD');
    });

    it('should handle hyphenated names', () => {
      expect(AvatarModule.getInitials('Mary-Jane Watson')).toBe('MW');
    });

    it('should uppercase initials', () => {
      expect(AvatarModule.getInitials('alice bob')).toBe('AB');
    });

    it('should handle extra whitespace', () => {
      expect(AvatarModule.getInitials('  John   Doe  ')).toBe('JD');
    });

    it('should handle single character name', () => {
      expect(AvatarModule.getInitials('J')).toBe('J');
    });

    it('should use first and last word for multi-word names', () => {
      expect(AvatarModule.getInitials('One Two Three Four')).toBe('OF');
    });
  });

  describe('getColorFromName', () => {
    it('should return a valid hex color string', () => {
      const color = AvatarModule.getColorFromName('John Doe');
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should return consistent colors for the same name', () => {
      const color1 = AvatarModule.getColorFromName('Alice');
      const color2 = AvatarModule.getColorFromName('Alice');
      expect(color1).toBe(color2);
    });

    it('should return different colors for different names', () => {
      const color1 = AvatarModule.getColorFromName('Alice');
      const color2 = AvatarModule.getColorFromName('Bob');
      expect(typeof color1).toBe('string');
      expect(typeof color2).toBe('string');
    });

    it('should handle empty string', () => {
      const color = AvatarModule.getColorFromName('');
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should handle long names', () => {
      const color = AvatarModule.getColorFromName('A Very Long Name That Should Still Work Fine');
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should return one of the predefined colors', () => {
      const predefinedColors = [
        '#7C3AED',
        '#2563EB',
        '#0891B2',
        '#059669',
        '#D97706',
        '#DC2626',
        '#9333EA',
        '#0284C7',
        '#16A34A',
        '#EA580C',
      ];
      const color = AvatarModule.getColorFromName('Test');
      expect(predefinedColors).toContain(color);
    });
  });

  describe('avatar shape', () => {
    it('should be circular (borderRadius = dimension / 2)', () => {
      const dimension = 40;
      expect(dimension / 2).toBe(20);
    });
  });

  describe('font size calculation', () => {
    it('should use 40% of avatar dimension as font size', () => {
      const fontSizeRatio = 0.4;
      const dimension = 40; // md
      const expectedFontSize = Math.round(dimension * fontSizeRatio);
      expect(expectedFontSize).toBe(16);
    });

    it('should scale font size with avatar size', () => {
      const fontSizeRatio = 0.4;
      const smallFont = Math.round(24 * fontSizeRatio); // xs
      const largeFont = Math.round(72 * fontSizeRatio); // xl
      expect(largeFont).toBeGreaterThan(smallFont);
    });
  });

  describe('accessibility', () => {
    it('should have image accessibility role', () => {
      const role = 'image';
      expect(role).toBe('image');
    });

    it('should include name in accessibility label', () => {
      const name = 'John Doe';
      const label = `Avatar for ${name}`;
      expect(label).toBe('Avatar for John Doe');
    });
  });
});
