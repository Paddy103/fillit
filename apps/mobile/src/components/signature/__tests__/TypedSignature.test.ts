/**
 * Tests for the TypedSignature component.
 *
 * Verifies exports, type contracts, and default font configuration.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import type * as TypedSignatureModule from '../TypedSignature';
import type { TypedSignatureResult, SignatureFont } from '../TypedSignature';

// ─── Mocks ─────────────────────────────────────────────────────────

vi.mock('react-native', () => ({
  Pressable: 'Pressable',
  StyleSheet: {
    create: (s: Record<string, unknown>) => s,
    flatten: (s: unknown) => s,
  },
  Text: 'Text',
  View: 'View',
  TextInput: 'TextInput',
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

describe('TypedSignature', () => {
  let mod: typeof TypedSignatureModule;

  beforeAll(async () => {
    mod = await import('../TypedSignature');
  });

  describe('module exports', () => {
    it('should export the TypedSignature component', () => {
      expect(mod.TypedSignature).toBeDefined();
      expect(typeof mod.TypedSignature).toBe('function');
    });

    it('should have displayName set', () => {
      expect(mod.TypedSignature.displayName).toBe('TypedSignature');
    });
  });

  describe('TypedSignatureResult type', () => {
    it('should satisfy the interface with text and font', () => {
      const result: TypedSignatureResult = {
        text: 'John Smith',
        fontFamily: 'DancingScript-Regular',
      };
      expect(result.text).toBe('John Smith');
      expect(result.fontFamily).toBe('DancingScript-Regular');
    });

    it('should allow different font families', () => {
      const results: TypedSignatureResult[] = [
        { text: 'Jane', fontFamily: 'DancingScript-Regular' },
        { text: 'Jane', fontFamily: 'GreatVibes-Regular' },
        { text: 'Jane', fontFamily: 'Inter-Regular' },
      ];
      const families = new Set(results.map((r) => r.fontFamily));
      expect(families.size).toBe(3);
    });
  });

  describe('SignatureFont type', () => {
    it('should have family and label fields', () => {
      const font: SignatureFont = {
        family: 'DancingScript-Regular',
        label: 'Script',
      };
      expect(font.family).toBe('DancingScript-Regular');
      expect(font.label).toBe('Script');
    });
  });
});

describe('signature barrel export', () => {
  it('should re-export TypedSignature from index', async () => {
    const index = await import('../index');
    expect(index.TypedSignature).toBeDefined();
    expect(typeof index.TypedSignature).toBe('function');
  });
});
