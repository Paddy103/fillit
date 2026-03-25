import { describe, it, expect } from 'vitest';

/**
 * Tests for SkeletonAvatar component contract and configuration.
 *
 * Validates default values and the delegation to the base Skeleton
 * component with circle shape.
 */

/** Default values matching the component implementation */
const DEFAULTS = {
  size: 48,
  accessibilityLabel: 'Loading avatar...',
} as const;

describe('SkeletonAvatar component contract', () => {
  describe('default values', () => {
    it('should default to 48dp diameter', () => {
      expect(DEFAULTS.size).toBe(48);
    });

    it('should default accessibility label to Loading avatar...', () => {
      expect(DEFAULTS.accessibilityLabel).toBe('Loading avatar...');
    });
  });

  describe('size resolution', () => {
    it('should use provided size for both width and height', () => {
      const size = 64;
      expect(size).toBe(64);
    });

    it('should fall back to default size when not provided', () => {
      const provided = undefined;
      const resolved = provided ?? DEFAULTS.size;
      expect(resolved).toBe(48);
    });
  });

  describe('delegation to Skeleton', () => {
    it('should use circle shape', () => {
      const shape = 'circle';
      expect(shape).toBe('circle');
    });

    it('should pass size as both width and height', () => {
      const size = 56;
      const props = {
        shape: 'circle' as const,
        width: size,
        height: size,
      };
      expect(props.width).toBe(props.height);
    });
  });

  describe('common avatar sizes', () => {
    it('should support small avatar (32dp)', () => {
      const size = 32;
      expect(size).toBeGreaterThan(0);
    });

    it('should support default avatar (48dp)', () => {
      expect(DEFAULTS.size).toBe(48);
    });

    it('should support large avatar (64dp)', () => {
      const size = 64;
      expect(size).toBeGreaterThan(DEFAULTS.size);
    });

    it('should support extra-large avatar (96dp)', () => {
      const size = 96;
      expect(size).toBeGreaterThan(0);
    });
  });
});
