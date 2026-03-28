import { describe, it, expect, vi, beforeAll } from 'vitest';
import type * as FieldDetectionProgressModule from '../FieldDetectionProgress';
import type { UseFieldDetectionReturn } from '../../../hooks/useFieldDetection';

// ─── Mocks ─────────────────────────────────────────────────────────

vi.mock('react-native', () => ({
  ActivityIndicator: 'ActivityIndicator',
  Pressable: 'Pressable',
  StyleSheet: {
    create: (s: Record<string, unknown>) => s,
    flatten: (s: unknown) => s,
  },
  Text: 'Text',
  View: 'View',
}));

vi.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
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

// ─── Tests ─────────────────────────────────────────────────────────

describe('FieldDetectionProgress', () => {
  let mod: typeof FieldDetectionProgressModule;

  beforeAll(async () => {
    mod = await import('../FieldDetectionProgress');
  });

  describe('module exports', () => {
    it('should export the FieldDetectionProgress component', () => {
      expect(mod.FieldDetectionProgress).toBeDefined();
      expect(typeof mod.FieldDetectionProgress).toBe('function');
    });

    it('should have displayName set', () => {
      expect(mod.FieldDetectionProgress.displayName).toBe('FieldDetectionProgress');
    });
  });
});

describe('UseFieldDetectionReturn type', () => {
  it('should satisfy the return type with processing state', () => {
    const state: UseFieldDetectionReturn = {
      pages: [
        { pageId: 'p1', pageNumber: 1, status: 'processing' },
        { pageId: 'p2', pageNumber: 2, status: 'pending' },
      ],
      progress: 0.5,
      isProcessing: true,
      isComplete: false,
      method: 'cloud',
      reducedAccuracy: false,
      error: null,
      start: vi.fn(),
      cancel: vi.fn(),
    };
    expect(state.isProcessing).toBe(true);
    expect(state.method).toBe('cloud');
  });

  it('should satisfy the return type with complete state', () => {
    const state: UseFieldDetectionReturn = {
      pages: [{ pageId: 'p1', pageNumber: 1, status: 'complete', fieldCount: 5 }],
      progress: 1,
      isProcessing: false,
      isComplete: true,
      method: 'offline',
      reducedAccuracy: true,
      error: null,
      start: vi.fn(),
      cancel: vi.fn(),
    };
    expect(state.isComplete).toBe(true);
    expect(state.reducedAccuracy).toBe(true);
  });

  it('should satisfy the return type with error state', () => {
    const state: UseFieldDetectionReturn = {
      pages: [{ pageId: 'p1', pageNumber: 1, status: 'error', error: 'Timeout' }],
      progress: 0.3,
      isProcessing: false,
      isComplete: false,
      method: null,
      reducedAccuracy: false,
      error: 'API timeout',
      start: vi.fn(),
      cancel: vi.fn(),
    };
    expect(state.error).toBe('API timeout');
    expect(state.pages[0]!.status).toBe('error');
  });
});

describe('detection barrel export', () => {
  it('should re-export FieldDetectionProgress from index', async () => {
    const index = await import('../index');
    expect(index.FieldDetectionProgress).toBeDefined();
    expect(typeof index.FieldDetectionProgress).toBe('function');
  });
});
