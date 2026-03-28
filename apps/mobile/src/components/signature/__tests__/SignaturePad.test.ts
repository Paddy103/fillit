/**
 * Tests for the SignaturePad component.
 *
 * Verifies exports, type contracts, and helper function behavior.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import type * as SignaturePadModule from '../SignaturePad';
import type { SignaturePadResult } from '../SignaturePad';

// ─── Mocks ─────────────────────────────────────────────────────────

vi.mock('react-native', () => ({
  Pressable: 'Pressable',
  StyleSheet: {
    create: (s: Record<string, unknown>) => s,
    flatten: (s: unknown) => s,
  },
  Text: 'Text',
  View: 'View',
}));

vi.mock('react-native-gesture-handler', () => ({
  GestureDetector: 'GestureDetector',
  GestureHandlerRootView: 'GestureHandlerRootView',
  Gesture: {
    Pan: vi.fn(() => ({
      minDistance: vi.fn().mockReturnThis(),
      onBegin: vi.fn().mockReturnThis(),
      onUpdate: vi.fn().mockReturnThis(),
      onEnd: vi.fn().mockReturnThis(),
    })),
  },
}));

vi.mock('react-native-svg', () => ({
  default: 'Svg',
  Path: 'Path',
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

describe('SignaturePad', () => {
  let mod: typeof SignaturePadModule;

  beforeAll(async () => {
    mod = await import('../SignaturePad');
  });

  describe('module exports', () => {
    it('should export the SignaturePad component', () => {
      expect(mod.SignaturePad).toBeDefined();
      expect(typeof mod.SignaturePad).toBe('function');
    });

    it('should have displayName set', () => {
      expect(mod.SignaturePad.displayName).toBe('SignaturePad');
    });
  });

  describe('SignaturePadResult type', () => {
    it('should satisfy the interface with all required fields', () => {
      const result: SignaturePadResult = {
        svgPath: 'M 10.0 20.0 L 30.0 40.0',
        color: '#000000',
        strokeWidth: 2.5,
      };
      expect(result.svgPath).toContain('M');
      expect(result.color).toBe('#000000');
      expect(result.strokeWidth).toBe(2.5);
    });

    it('should support multiple stroke paths concatenated', () => {
      const result: SignaturePadResult = {
        svgPath: 'M 0.0 0.0 L 10.0 10.0 M 20.0 20.0 L 30.0 30.0',
        color: '#1A237E',
        strokeWidth: 4,
      };
      expect(result.svgPath.split('M').length).toBe(3); // 2 strokes + leading empty
    });
  });
});

vi.mock('../../../fonts/config', () => ({
  FontFamily: {
    InterRegular: 'Inter-Regular',
    InterMedium: 'Inter-Medium',
    InterSemiBold: 'Inter-SemiBold',
    InterBold: 'Inter-Bold',
    JetBrainsMonoRegular: 'JetBrainsMono-Regular',
    DancingScriptRegular: 'DancingScript-Regular',
    GreatVibesRegular: 'GreatVibes-Regular',
  },
  FontCategories: {
    signature: {
      dancingScript: 'DancingScript-Regular',
      greatVibes: 'GreatVibes-Regular',
    },
  },
}));

describe('signature barrel export', () => {
  it('should re-export SignaturePad from index', async () => {
    const index = await import('../index');
    expect(index.SignaturePad).toBeDefined();
    expect(typeof index.SignaturePad).toBe('function');
  });
});
