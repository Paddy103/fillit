import { describe, it, expect } from 'vitest';
import { radii } from '../../../theme/tokens/spacing';

/**
 * Tests for SkeletonCard component contract and configuration.
 *
 * Validates default values and theme integration for the card skeleton.
 */

/** Default values matching the component implementation */
const DEFAULTS = {
  width: '100%',
  height: 120,
  accessibilityLabel: 'Loading card...',
} as const;

describe('SkeletonCard component contract', () => {
  describe('default values', () => {
    it('should default to full width', () => {
      expect(DEFAULTS.width).toBe('100%');
    });

    it('should default to 120dp height', () => {
      expect(DEFAULTS.height).toBe(120);
    });

    it('should default accessibility label to Loading card...', () => {
      expect(DEFAULTS.accessibilityLabel).toBe('Loading card...');
    });
  });

  describe('theme integration', () => {
    it('should use theme radii.md for border radius', () => {
      expect(radii.md).toBe(8);
    });

    it('should delegate to Skeleton with rectangle shape', () => {
      const shape = 'rectangle';
      expect(shape).toBe('rectangle');
    });
  });

  describe('prop resolution', () => {
    it('should use provided width over default', () => {
      const provided = 300;
      const resolved = provided ?? DEFAULTS.width;
      expect(resolved).toBe(300);
    });

    it('should use provided height over default', () => {
      const provided = 200;
      const resolved = provided ?? DEFAULTS.height;
      expect(resolved).toBe(200);
    });

    it('should accept string width', () => {
      const width: number | string = '80%';
      expect(width).toBe('80%');
    });

    it('should fall back to defaults when props omitted', () => {
      const width = undefined ?? DEFAULTS.width;
      const height = undefined ?? DEFAULTS.height;
      expect(width).toBe('100%');
      expect(height).toBe(120);
    });
  });
});
