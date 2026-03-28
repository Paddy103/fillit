/**
 * Tests for the FieldEditorSheet component.
 *
 * Verifies exports, type contracts, helper functions,
 * and component behavior for the field editor bottom sheet.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import type * as FieldEditorSheetModule from '../FieldEditorSheet';
import type { FieldSource, FieldEditResult } from '../FieldEditorSheet';

// ─── Mocks ─────────────────────────────────────────────────────────

vi.mock('react-native', () => ({
  Keyboard: { dismiss: vi.fn() },
  Pressable: 'Pressable',
  StyleSheet: {
    absoluteFill: {},
    create: (styles: Record<string, unknown>) => styles,
    flatten: (s: unknown) => s,
  },
  Text: 'Text',
  View: 'View',
}));

vi.mock('react-native-reanimated', () => ({
  default: {
    View: 'Animated.View',
  },
  useAnimatedStyle: vi.fn((fn: () => unknown) => fn()),
  useSharedValue: vi.fn((v: number) => ({ value: v })),
  withTiming: vi.fn((v: number) => v),
}));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: vi.fn(() => ({ top: 0, right: 0, bottom: 0, left: 0 })),
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

// ─── Test Setup ────────────────────────────────────────────────────

describe('FieldEditorSheet', () => {
  let mod: typeof FieldEditorSheetModule;

  beforeAll(async () => {
    mod = await import('../FieldEditorSheet');
  });

  // ─── Module exports ──────────────────────────────────────────────

  describe('module exports', () => {
    it('should export the FieldEditorSheet component', () => {
      expect(mod.FieldEditorSheet).toBeDefined();
      expect(typeof mod.FieldEditorSheet).toBe('function');
    });

    it('should have displayName set', () => {
      expect(mod.FieldEditorSheet.displayName).toBe('FieldEditorSheet');
    });
  });

  // ─── FieldSource type ────────────────────────────────────────────

  describe('FieldSource type coverage', () => {
    it('should support profile, manual, and skip sources', () => {
      const sources: FieldSource[] = ['profile', 'manual', 'skip'];
      expect(sources).toHaveLength(3);
      for (const s of sources) {
        expect(typeof s).toBe('string');
      }
    });
  });

  // ─── FieldEditResult type ────────────────────────────────────────

  describe('FieldEditResult type', () => {
    it('should satisfy the interface with all required fields', () => {
      const result: FieldEditResult = {
        fieldId: 'field-1',
        value: 'John',
        source: 'profile',
        isConfirmed: true,
      };
      expect(result.fieldId).toBe('field-1');
      expect(result.value).toBe('John');
      expect(result.source).toBe('profile');
      expect(result.isConfirmed).toBe(true);
    });

    it('should allow skip source with empty value', () => {
      const result: FieldEditResult = {
        fieldId: 'field-2',
        value: '',
        source: 'skip',
        isConfirmed: false,
      };
      expect(result.source).toBe('skip');
      expect(result.value).toBe('');
      expect(result.isConfirmed).toBe(false);
    });

    it('should allow manual source', () => {
      const result: FieldEditResult = {
        fieldId: 'field-3',
        value: 'Custom Value',
        source: 'manual',
        isConfirmed: true,
      };
      expect(result.source).toBe('manual');
      expect(result.isConfirmed).toBe(true);
    });
  });
});

// ─── Barrel export ─────────────────────────────────────────────────

vi.mock('react-native-gesture-handler', () => ({
  GestureDetector: 'GestureDetector',
  GestureHandlerRootView: 'GestureHandlerRootView',
  Gesture: {
    Pinch: vi.fn(() => ({ onUpdate: vi.fn().mockReturnThis(), onEnd: vi.fn().mockReturnThis() })),
    Pan: vi.fn(() => ({ onUpdate: vi.fn().mockReturnThis(), onEnd: vi.fn().mockReturnThis() })),
    Tap: vi.fn(() => ({
      numberOfTaps: vi.fn().mockReturnThis(),
      onEnd: vi.fn().mockReturnThis(),
    })),
    Simultaneous: vi.fn(),
  },
}));

describe('document barrel export', () => {
  it('should re-export FieldEditorSheet from index', async () => {
    const index = await import('../index');
    expect(index.FieldEditorSheet).toBeDefined();
    expect(typeof index.FieldEditorSheet).toBe('function');
  });
});
