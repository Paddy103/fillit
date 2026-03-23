import { describe, it, expect } from 'vitest';
import { spacing, radii, elevations } from '../tokens/spacing';

describe('Spacing Tokens', () => {
  describe('spacing', () => {
    it('should start with none at 0', () => {
      expect(spacing.none).toBe(0);
    });

    it('should define a complete spacing scale', () => {
      expect(spacing['2xs']).toBe(2);
      expect(spacing.xs).toBe(4);
      expect(spacing.sm).toBe(8);
      expect(spacing.md).toBe(12);
      expect(spacing.lg).toBe(16);
      expect(spacing.xl).toBe(20);
      expect(spacing['2xl']).toBe(24);
      expect(spacing['3xl']).toBe(32);
      expect(spacing['4xl']).toBe(40);
      expect(spacing['5xl']).toBe(48);
      expect(spacing['6xl']).toBe(64);
    });

    it('should have values in ascending order (except none)', () => {
      const orderedValues = [
        spacing['2xs'],
        spacing.xs,
        spacing.sm,
        spacing.md,
        spacing.lg,
        spacing.xl,
        spacing['2xl'],
        spacing['3xl'],
        spacing['4xl'],
        spacing['5xl'],
        spacing['6xl'],
      ];
      for (let i = 1; i < orderedValues.length; i++) {
        expect(orderedValues[i]).toBeGreaterThan(orderedValues[i - 1]!);
      }
    });

    it('should only contain non-negative numbers', () => {
      for (const [_key, value] of Object.entries(spacing)) {
        expect(value).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('radii', () => {
    it('should start with none at 0', () => {
      expect(radii.none).toBe(0);
    });

    it('should define a complete border radius scale', () => {
      expect(radii.sm).toBe(4);
      expect(radii.md).toBe(8);
      expect(radii.lg).toBe(12);
      expect(radii.xl).toBe(16);
      expect(radii['2xl']).toBe(24);
      expect(radii.full).toBe(9999);
    });

    it('should have values in ascending order', () => {
      const orderedValues = [radii.none, radii.sm, radii.md, radii.lg, radii.xl, radii['2xl']];
      for (let i = 1; i < orderedValues.length; i++) {
        expect(orderedValues[i]).toBeGreaterThan(orderedValues[i - 1]!);
      }
    });

    it('should have full radius as the largest value', () => {
      expect(radii.full).toBeGreaterThan(radii['2xl']);
    });
  });

  describe('elevations', () => {
    it('should define elevation levels', () => {
      expect(elevations.none).toBeDefined();
      expect(elevations.sm).toBeDefined();
      expect(elevations.md).toBeDefined();
      expect(elevations.lg).toBeDefined();
      expect(elevations.xl).toBeDefined();
    });

    it('should have no shadow for "none" elevation', () => {
      expect(elevations.none.shadowOpacity).toBe(0);
      expect(elevations.none.elevation).toBe(0);
    });

    it('should include required shadow properties in each elevation', () => {
      const levels = [elevations.none, elevations.sm, elevations.md, elevations.lg, elevations.xl];

      for (const level of levels) {
        expect(level).toHaveProperty('shadowColor');
        expect(level).toHaveProperty('shadowOffset');
        expect(level.shadowOffset).toHaveProperty('width');
        expect(level.shadowOffset).toHaveProperty('height');
        expect(level).toHaveProperty('shadowOpacity');
        expect(level).toHaveProperty('shadowRadius');
        expect(level).toHaveProperty('elevation');
      }
    });

    it('should have increasing elevation values', () => {
      expect(elevations.sm.elevation).toBeGreaterThan(elevations.none.elevation);
      expect(elevations.md.elevation).toBeGreaterThan(elevations.sm.elevation);
      expect(elevations.lg.elevation).toBeGreaterThan(elevations.md.elevation);
      expect(elevations.xl.elevation).toBeGreaterThan(elevations.lg.elevation);
    });

    it('should have increasing shadow opacity for higher elevations', () => {
      expect(elevations.sm.shadowOpacity).toBeGreaterThan(elevations.none.shadowOpacity);
      expect(elevations.md.shadowOpacity).toBeGreaterThan(elevations.sm.shadowOpacity);
      expect(elevations.lg.shadowOpacity).toBeGreaterThan(elevations.md.shadowOpacity);
      expect(elevations.xl.shadowOpacity).toBeGreaterThan(elevations.lg.shadowOpacity);
    });
  });
});
