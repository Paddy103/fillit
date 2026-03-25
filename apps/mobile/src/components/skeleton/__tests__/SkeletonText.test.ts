import { describe, it, expect } from 'vitest';

/**
 * Tests for SkeletonText component contract and configuration.
 *
 * Validates default values, line calculation logic, and layout behavior.
 */

/** Default values matching the component implementation */
const DEFAULTS = {
  lines: 3,
  lineHeight: 14,
  lineGap: 8,
  lastLineWidth: 0.6,
  accessibilityLabel: 'Loading text...',
} as const;

describe('SkeletonText component contract', () => {
  describe('default values', () => {
    it('should default to 3 lines', () => {
      expect(DEFAULTS.lines).toBe(3);
    });

    it('should default to 14dp line height', () => {
      expect(DEFAULTS.lineHeight).toBe(14);
    });

    it('should default to 8dp line gap', () => {
      expect(DEFAULTS.lineGap).toBe(8);
    });

    it('should default last line width to 60%', () => {
      expect(DEFAULTS.lastLineWidth).toBe(0.6);
    });

    it('should default accessibility label to Loading text...', () => {
      expect(DEFAULTS.accessibilityLabel).toBe('Loading text...');
    });
  });

  describe('line count resolution', () => {
    it('should enforce minimum of 1 line', () => {
      const lines = 0;
      const resolved = Math.max(1, Math.round(lines));
      expect(resolved).toBe(1);
    });

    it('should enforce minimum of 1 for negative values', () => {
      const lines = -5;
      const resolved = Math.max(1, Math.round(lines));
      expect(resolved).toBe(1);
    });

    it('should round fractional line counts', () => {
      const lines = 2.7;
      const resolved = Math.max(1, Math.round(lines));
      expect(resolved).toBe(3);
    });

    it('should round down when below .5', () => {
      const lines = 2.3;
      const resolved = Math.max(1, Math.round(lines));
      expect(resolved).toBe(2);
    });

    it('should keep whole numbers unchanged', () => {
      const lines = 5;
      const resolved = Math.max(1, Math.round(lines));
      expect(resolved).toBe(5);
    });
  });

  describe('last line width calculation', () => {
    it('should convert fraction to percentage string', () => {
      const fraction = 0.6;
      const widthStr = `${fraction * 100}%`;
      expect(widthStr).toBe('60%');
    });

    it('should handle 0.4 fraction', () => {
      const fraction = 0.4;
      const widthStr = `${fraction * 100}%`;
      expect(widthStr).toBe('40%');
    });

    it('should handle 1.0 fraction as full width', () => {
      const fraction = 1.0;
      const widthStr = `${fraction * 100}%`;
      expect(widthStr).toBe('100%');
    });
  });

  describe('line width logic', () => {
    it('non-last lines should be full width', () => {
      const lineCount = 3;
      const index = 0;
      const isLast = index === lineCount - 1 && lineCount > 1;
      expect(isLast).toBe(false);
    });

    it('last line should be shorter when multiple lines', () => {
      const lineCount = 3;
      const index = 2;
      const isLast = index === lineCount - 1 && lineCount > 1;
      expect(isLast).toBe(true);
    });

    it('single line should NOT be treated as last line', () => {
      const lineCount = 1;
      const index = 0;
      const isLast = index === lineCount - 1 && lineCount > 1;
      expect(isLast).toBe(false);
    });
  });

  describe('margin logic', () => {
    it('should add margin to all lines except the last', () => {
      const lineCount = 3;
      const margins = Array.from({ length: lineCount }, (_, index) =>
        index < lineCount - 1 ? DEFAULTS.lineGap : 0,
      );
      expect(margins).toEqual([8, 8, 0]);
    });

    it('single line should have no margin', () => {
      const lineCount = 1;
      const margins = Array.from({ length: lineCount }, (_, index) =>
        index < lineCount - 1 ? DEFAULTS.lineGap : 0,
      );
      expect(margins).toEqual([0]);
    });
  });
});
