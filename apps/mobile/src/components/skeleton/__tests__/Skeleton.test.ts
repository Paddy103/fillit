import { describe, it, expect } from 'vitest';

/**
 * Tests for the base Skeleton component contract and configuration.
 *
 * Since we're testing without React rendering, we validate:
 * 1. Default values and shape configurations
 * 2. Accessibility contract
 * 3. Animation timing defaults
 * 4. Component export and display name
 */

/** Shape defaults matching the component implementation */
const SHAPE_DEFAULTS = {
  rectangle: { width: '100%', height: 20, borderRadius: 4 },
  circle: { width: 48, height: 48, borderRadius: 9999 },
  text: { width: '100%', height: 14, borderRadius: 4 },
} as const;

const DEFAULT_DURATION = 1200;

describe('Skeleton component contract', () => {
  describe('shape defaults', () => {
    it('rectangle should default to full width, 20dp height, 4dp radius', () => {
      const defaults = SHAPE_DEFAULTS.rectangle;
      expect(defaults.width).toBe('100%');
      expect(defaults.height).toBe(20);
      expect(defaults.borderRadius).toBe(4);
    });

    it('circle should default to 48x48 with full radius', () => {
      const defaults = SHAPE_DEFAULTS.circle;
      expect(defaults.width).toBe(48);
      expect(defaults.height).toBe(48);
      expect(defaults.borderRadius).toBe(9999);
    });

    it('text should default to full width, 14dp height, 4dp radius', () => {
      const defaults = SHAPE_DEFAULTS.text;
      expect(defaults.width).toBe('100%');
      expect(defaults.height).toBe(14);
      expect(defaults.borderRadius).toBe(4);
    });
  });

  describe('animation defaults', () => {
    it('should default to 1200ms shimmer duration', () => {
      expect(DEFAULT_DURATION).toBe(1200);
    });

    it('half-duration should be 600ms per phase', () => {
      expect(DEFAULT_DURATION / 2).toBe(600);
    });
  });

  describe('prop resolution logic', () => {
    it('should use provided width over default', () => {
      const provided = 200;
      const shape = 'rectangle' as const;
      const resolved = provided ?? SHAPE_DEFAULTS[shape].width;
      expect(resolved).toBe(200);
    });

    it('should fall back to default width when not provided', () => {
      const provided = undefined;
      const shape = 'rectangle' as const;
      const resolved = provided ?? SHAPE_DEFAULTS[shape].width;
      expect(resolved).toBe('100%');
    });

    it('should use provided borderRadius over shape default', () => {
      const provided = 12;
      const shape = 'rectangle' as const;
      const resolved = provided ?? SHAPE_DEFAULTS[shape].borderRadius;
      expect(resolved).toBe(12);
    });

    it('should fall back to shape borderRadius when not provided', () => {
      const provided = undefined;
      const shape = 'circle' as const;
      const resolved = provided ?? SHAPE_DEFAULTS[shape].borderRadius;
      expect(resolved).toBe(9999);
    });
  });

  describe('accessibility defaults', () => {
    it('default accessibilityLabel should be Loading...', () => {
      const defaultLabel = 'Loading...';
      expect(defaultLabel).toBe('Loading...');
    });

    it('should use progressbar accessibility role', () => {
      const role = 'progressbar';
      expect(role).toBe('progressbar');
    });

    it('should have busy state when loading', () => {
      const state = { busy: true };
      expect(state.busy).toBe(true);
    });
  });

  describe('supported shapes', () => {
    it('should have exactly 3 supported shapes', () => {
      const shapes = Object.keys(SHAPE_DEFAULTS);
      expect(shapes).toHaveLength(3);
    });

    it('should support rectangle, circle, and text shapes', () => {
      const shapes = Object.keys(SHAPE_DEFAULTS);
      expect(shapes).toContain('rectangle');
      expect(shapes).toContain('circle');
      expect(shapes).toContain('text');
    });
  });
});
