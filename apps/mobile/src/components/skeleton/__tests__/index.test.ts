import { describe, it, expect, vi } from 'vitest';

// Mock react and react-native (and JSX runtime) to prevent import errors in Node
vi.mock('react', () => ({
  default: { createElement: vi.fn() },
  createElement: vi.fn(),
  useEffect: vi.fn(),
  useRef: vi.fn(() => ({ current: { interpolate: vi.fn(), setValue: vi.fn() } })),
  useMemo: vi.fn((fn: () => unknown) => fn()),
  useCallback: vi.fn((fn: unknown) => fn),
  useState: vi.fn((init: unknown) => [init, vi.fn()]),
  useContext: vi.fn(() => ({
    theme: {
      colorScheme: 'light',
      colors: { surface: '#F5F5F5', surfaceVariant: '#E8E8E8' },
      spacing: { sm: 8, md: 12, lg: 16 },
      radii: { md: 8, full: 9999 },
    },
    isDark: false,
  })),
  createContext: vi.fn(() => ({ Provider: 'Provider', Consumer: 'Consumer' })),
}));

vi.mock('react/jsx-dev-runtime', () => ({
  jsxDEV: vi.fn(),
  Fragment: 'Fragment',
}));

vi.mock('react/jsx-runtime', () => ({
  jsx: vi.fn(),
  jsxs: vi.fn(),
  Fragment: 'Fragment',
}));

vi.mock('react-native', () => ({
  Animated: {
    View: 'Animated.View',
    Value: vi.fn(() => ({ interpolate: vi.fn(), setValue: vi.fn() })),
    timing: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
    loop: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
    sequence: vi.fn(),
  },
  View: 'View',
  useColorScheme: vi.fn(() => 'light'),
}));

/**
 * Tests for the skeleton module barrel export.
 *
 * Validates that all expected components, hooks, and types
 * are properly exported from the index module.
 */
describe('skeleton module exports', () => {
  it('should export Skeleton component', async () => {
    const mod = await import('../index');
    expect(mod.Skeleton).toBeDefined();
  });

  it('should export SkeletonText component', async () => {
    const mod = await import('../index');
    expect(mod.SkeletonText).toBeDefined();
  });

  it('should export SkeletonAvatar component', async () => {
    const mod = await import('../index');
    expect(mod.SkeletonAvatar).toBeDefined();
  });

  it('should export SkeletonCard component', async () => {
    const mod = await import('../index');
    expect(mod.SkeletonCard).toBeDefined();
  });

  it('should export SkeletonProfileCard component', async () => {
    const mod = await import('../index');
    expect(mod.SkeletonProfileCard).toBeDefined();
  });

  it('should export SkeletonListItem component', async () => {
    const mod = await import('../index');
    expect(mod.SkeletonListItem).toBeDefined();
  });

  it('should export SkeletonDocumentCard component', async () => {
    const mod = await import('../index');
    expect(mod.SkeletonDocumentCard).toBeDefined();
  });

  it('should export useSkeletonColors hook', async () => {
    const mod = await import('../index');
    expect(mod.useSkeletonColors).toBeDefined();
    expect(typeof mod.useSkeletonColors).toBe('function');
  });

  it('should export exactly 8 runtime exports', async () => {
    const mod = await import('../index');
    const runtimeExports = Object.keys(mod).filter(
      (key) => typeof mod[key as keyof typeof mod] !== 'undefined',
    );
    expect(runtimeExports).toHaveLength(8);
  });

  describe('component display names', () => {
    it('Skeleton should have displayName', async () => {
      const mod = await import('../index');
      expect((mod.Skeleton as { displayName?: string }).displayName).toBe('Skeleton');
    });

    it('SkeletonText should have displayName', async () => {
      const mod = await import('../index');
      expect((mod.SkeletonText as { displayName?: string }).displayName).toBe('SkeletonText');
    });

    it('SkeletonAvatar should have displayName', async () => {
      const mod = await import('../index');
      expect((mod.SkeletonAvatar as { displayName?: string }).displayName).toBe('SkeletonAvatar');
    });

    it('SkeletonCard should have displayName', async () => {
      const mod = await import('../index');
      expect((mod.SkeletonCard as { displayName?: string }).displayName).toBe('SkeletonCard');
    });

    it('SkeletonProfileCard should have displayName', async () => {
      const mod = await import('../index');
      expect((mod.SkeletonProfileCard as { displayName?: string }).displayName).toBe(
        'SkeletonProfileCard',
      );
    });

    it('SkeletonListItem should have displayName', async () => {
      const mod = await import('../index');
      expect((mod.SkeletonListItem as { displayName?: string }).displayName).toBe(
        'SkeletonListItem',
      );
    });

    it('SkeletonDocumentCard should have displayName', async () => {
      const mod = await import('../index');
      expect((mod.SkeletonDocumentCard as { displayName?: string }).displayName).toBe(
        'SkeletonDocumentCard',
      );
    });
  });
});
