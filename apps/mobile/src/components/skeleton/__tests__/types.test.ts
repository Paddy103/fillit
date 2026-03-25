import { describe, it, expect } from 'vitest';
import {
  type SkeletonShape,
  type ShimmerConfig,
  type SkeletonBaseProps,
  type SkeletonProps,
  type SkeletonTextProps,
  type SkeletonAvatarProps,
  type SkeletonCardProps,
  type SkeletonProfileCardProps,
  type SkeletonListItemProps,
  type SkeletonDocumentCardProps,
} from '../types';

describe('Skeleton type definitions', () => {
  describe('SkeletonShape', () => {
    it('should accept rectangle as a valid shape', () => {
      const shape: SkeletonShape = 'rectangle';
      expect(shape).toBe('rectangle');
    });

    it('should accept circle as a valid shape', () => {
      const shape: SkeletonShape = 'circle';
      expect(shape).toBe('circle');
    });

    it('should accept text as a valid shape', () => {
      const shape: SkeletonShape = 'text';
      expect(shape).toBe('text');
    });
  });

  describe('ShimmerConfig', () => {
    it('should allow empty config (all optional)', () => {
      const config: ShimmerConfig = {};
      expect(config).toEqual({});
    });

    it('should accept duration', () => {
      const config: ShimmerConfig = { duration: 1500 };
      expect(config.duration).toBe(1500);
    });

    it('should accept animated flag', () => {
      const config: ShimmerConfig = { animated: false };
      expect(config.animated).toBe(false);
    });

    it('should accept both duration and animated', () => {
      const config: ShimmerConfig = { duration: 800, animated: true };
      expect(config.duration).toBe(800);
      expect(config.animated).toBe(true);
    });
  });

  describe('SkeletonBaseProps', () => {
    it('should allow empty props (all optional)', () => {
      const props: SkeletonBaseProps = {};
      expect(props).toEqual({});
    });

    it('should accept numeric width and height', () => {
      const props: SkeletonBaseProps = { width: 200, height: 20 };
      expect(props.width).toBe(200);
      expect(props.height).toBe(20);
    });

    it('should accept string width and height', () => {
      const props: SkeletonBaseProps = { width: '100%', height: '50%' };
      expect(props.width).toBe('100%');
      expect(props.height).toBe('50%');
    });

    it('should accept borderRadius', () => {
      const props: SkeletonBaseProps = { borderRadius: 8 };
      expect(props.borderRadius).toBe(8);
    });

    it('should accept accessibilityLabel', () => {
      const props: SkeletonBaseProps = { accessibilityLabel: 'Loading content...' };
      expect(props.accessibilityLabel).toBe('Loading content...');
    });
  });

  describe('SkeletonProps', () => {
    it('should accept shape prop', () => {
      const props: SkeletonProps = { shape: 'circle' };
      expect(props.shape).toBe('circle');
    });

    it('should extend SkeletonBaseProps', () => {
      const props: SkeletonProps = {
        shape: 'rectangle',
        width: 100,
        height: 50,
        borderRadius: 4,
        duration: 1200,
        animated: true,
        accessibilityLabel: 'Test',
      };
      expect(props.shape).toBe('rectangle');
      expect(props.width).toBe(100);
    });
  });

  describe('SkeletonTextProps', () => {
    it('should allow empty props (all optional)', () => {
      const props: SkeletonTextProps = {};
      expect(props).toEqual({});
    });

    it('should accept lines count', () => {
      const props: SkeletonTextProps = { lines: 5 };
      expect(props.lines).toBe(5);
    });

    it('should accept lineHeight', () => {
      const props: SkeletonTextProps = { lineHeight: 16 };
      expect(props.lineHeight).toBe(16);
    });

    it('should accept lineGap', () => {
      const props: SkeletonTextProps = { lineGap: 12 };
      expect(props.lineGap).toBe(12);
    });

    it('should accept lastLineWidth as a fraction', () => {
      const props: SkeletonTextProps = { lastLineWidth: 0.4 };
      expect(props.lastLineWidth).toBe(0.4);
    });

    it('should include ShimmerConfig props', () => {
      const props: SkeletonTextProps = { duration: 1000, animated: false };
      expect(props.duration).toBe(1000);
      expect(props.animated).toBe(false);
    });
  });

  describe('SkeletonAvatarProps', () => {
    it('should allow empty props (all optional)', () => {
      const props: SkeletonAvatarProps = {};
      expect(props).toEqual({});
    });

    it('should accept size', () => {
      const props: SkeletonAvatarProps = { size: 64 };
      expect(props.size).toBe(64);
    });

    it('should include ShimmerConfig props', () => {
      const props: SkeletonAvatarProps = { size: 48, duration: 1500, animated: true };
      expect(props.duration).toBe(1500);
    });
  });

  describe('SkeletonCardProps', () => {
    it('should allow empty props (all optional)', () => {
      const props: SkeletonCardProps = {};
      expect(props).toEqual({});
    });

    it('should accept numeric width', () => {
      const props: SkeletonCardProps = { width: 300 };
      expect(props.width).toBe(300);
    });

    it('should accept string width', () => {
      const props: SkeletonCardProps = { width: '100%' };
      expect(props.width).toBe('100%');
    });

    it('should accept height', () => {
      const props: SkeletonCardProps = { height: 200 };
      expect(props.height).toBe(200);
    });
  });

  describe('SkeletonProfileCardProps', () => {
    it('should allow empty props (all optional)', () => {
      const props: SkeletonProfileCardProps = {};
      expect(props).toEqual({});
    });

    it('should include ShimmerConfig and accessibility props', () => {
      const props: SkeletonProfileCardProps = {
        duration: 1000,
        animated: true,
        accessibilityLabel: 'Loading user profile...',
      };
      expect(props.duration).toBe(1000);
      expect(props.accessibilityLabel).toBe('Loading user profile...');
    });
  });

  describe('SkeletonListItemProps', () => {
    it('should allow empty props (all optional)', () => {
      const props: SkeletonListItemProps = {};
      expect(props).toEqual({});
    });

    it('should accept showAvatar flag', () => {
      const props: SkeletonListItemProps = { showAvatar: false };
      expect(props.showAvatar).toBe(false);
    });

    it('should accept lines count', () => {
      const props: SkeletonListItemProps = { lines: 3 };
      expect(props.lines).toBe(3);
    });
  });

  describe('SkeletonDocumentCardProps', () => {
    it('should allow empty props (all optional)', () => {
      const props: SkeletonDocumentCardProps = {};
      expect(props).toEqual({});
    });

    it('should include ShimmerConfig and accessibility props', () => {
      const props: SkeletonDocumentCardProps = {
        duration: 800,
        animated: false,
        accessibilityLabel: 'Loading document preview...',
      };
      expect(props.duration).toBe(800);
      expect(props.animated).toBe(false);
    });
  });
});
