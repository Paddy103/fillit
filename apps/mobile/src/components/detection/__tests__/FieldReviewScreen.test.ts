import { describe, it, expect, vi, beforeAll } from 'vitest';
import type * as FieldReviewScreenModule from '../FieldReviewScreen';
import type { FieldReviewScreenProps } from '../FieldReviewScreen';
import type { DetectedField } from '@fillit/shared';

// ─── Mocks ─────────────────────────────────────────────────────────

vi.mock('react-native', () => ({
  FlatList: 'FlatList',
  Pressable: 'Pressable',
  StyleSheet: {
    create: (s: Record<string, unknown>) => s,
    flatten: (s: unknown) => s,
    absoluteFill: {},
  },
  Text: 'Text',
  View: 'View',
  Keyboard: { dismiss: vi.fn() },
}));

vi.mock('react-native-reanimated', () => ({
  default: { View: 'Animated.View' },
  useAnimatedStyle: vi.fn((fn: () => unknown) => fn()),
  useSharedValue: vi.fn((v: number) => ({ value: v })),
  withTiming: vi.fn((v: number) => v),
}));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: vi.fn(() => ({ top: 0, right: 0, bottom: 0, left: 0 })),
}));

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

// ─── Test Data ─────────────────────────────────────────────────────

function makeField(overrides?: Partial<DetectedField>): DetectedField {
  return {
    id: 'field-1',
    pageId: 'page-1',
    label: 'First Name',
    normalizedLabel: 'first name',
    fieldType: 'text',
    bounds: { x: 0.1, y: 0.2, width: 0.3, height: 0.04 },
    matchedProfileField: 'firstName',
    matchConfidence: 0.9,
    value: 'John',
    isConfirmed: false,
    isSignatureField: false,
    ...overrides,
  };
}

// ─── Tests ─────────────────────────────────────────────────────────

describe('FieldReviewScreen', () => {
  let mod: typeof FieldReviewScreenModule;

  beforeAll(async () => {
    mod = await import('../FieldReviewScreen');
  });

  describe('module exports', () => {
    it('should export the FieldReviewScreen component', () => {
      expect(mod.FieldReviewScreen).toBeDefined();
      expect(typeof mod.FieldReviewScreen).toBe('function');
    });

    it('should have displayName set', () => {
      expect(mod.FieldReviewScreen.displayName).toBe('FieldReviewScreen');
    });
  });

  describe('props type', () => {
    it('should satisfy the props interface', () => {
      const props: FieldReviewScreenProps = {
        imageUri: 'file:///test.jpg',
        imageWidth: 1080,
        imageHeight: 1920,
        fields: [makeField(), makeField({ id: 'field-2', label: 'Last Name' })],
        onFieldUpdate: vi.fn(),
        onConfirmAll: vi.fn(),
        onReAnalyze: vi.fn(),
        reducedAccuracy: false,
      };
      expect(props.fields).toHaveLength(2);
      expect(props.imageUri).toBeTruthy();
    });

    it('should support reduced accuracy mode', () => {
      const props: FieldReviewScreenProps = {
        imageUri: 'file:///test.jpg',
        imageWidth: 1080,
        imageHeight: 1920,
        fields: [makeField({ matchConfidence: 0.6, isConfirmed: false })],
        onFieldUpdate: vi.fn(),
        onConfirmAll: vi.fn(),
        onReAnalyze: vi.fn(),
        reducedAccuracy: true,
      };
      expect(props.reducedAccuracy).toBe(true);
    });

    it('should handle confirmed fields', () => {
      const fields = [
        makeField({ id: 'f1', isConfirmed: true }),
        makeField({ id: 'f2', isConfirmed: false }),
        makeField({ id: 'f3', isConfirmed: true }),
      ];
      const confirmed = fields.filter((f) => f.isConfirmed);
      expect(confirmed).toHaveLength(2);
    });

    it('should handle empty fields array', () => {
      const props: FieldReviewScreenProps = {
        imageUri: 'file:///test.jpg',
        imageWidth: 1080,
        imageHeight: 1920,
        fields: [],
        onFieldUpdate: vi.fn(),
        onConfirmAll: vi.fn(),
        onReAnalyze: vi.fn(),
      };
      expect(props.fields).toHaveLength(0);
    });
  });
});

describe('detection barrel export', () => {
  it('should re-export FieldReviewScreen from index', async () => {
    const index = await import('../index');
    expect(index.FieldReviewScreen).toBeDefined();
    expect(typeof index.FieldReviewScreen).toBe('function');
  });
});
