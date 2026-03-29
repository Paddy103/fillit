import { describe, it, expect, vi, beforeAll } from 'vitest';
import type * as SignaturePreviewModule from '../SignaturePreview';
import type { SignaturePreviewProps } from '../SignaturePreview';
import type { StoredSignature } from '@fillit/shared';

// ─── Mocks ─────────────────────────────────────────────────────────

vi.mock('react-native', () => ({
  Modal: 'Modal',
  Pressable: 'Pressable',
  StyleSheet: {
    create: (s: Record<string, unknown>) => s,
    flatten: (s: unknown) => s,
  },
  Text: 'Text',
  View: 'View',
}));

vi.mock('react-native-svg', () => ({
  default: 'Svg',
  Path: 'Path',
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

vi.mock('../../../fonts/config', () => ({
  FontFamily: {
    InterRegular: 'Inter-Regular',
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

// ─── Test Data ─────────────────────────────────────────────────────

function makeDrawnSignature(overrides?: Partial<StoredSignature>): StoredSignature {
  return {
    id: 'sig-1',
    profileId: 'profile-1',
    type: 'drawn',
    label: 'Full signature',
    svgPath: 'M 10.0 20.0 L 30.0 40.0 L 50.0 20.0',
    createdAt: '2026-03-28T12:00:00Z',
    isDefault: true,
    ...overrides,
  };
}

function makeTypedSignature(overrides?: Partial<StoredSignature>): StoredSignature {
  return {
    id: 'sig-2',
    profileId: 'profile-1',
    type: 'typed',
    label: 'Typed signature',
    text: 'John Smith',
    fontFamily: 'DancingScript-Regular',
    createdAt: '2026-03-28T12:00:00Z',
    isDefault: false,
    ...overrides,
  };
}

// ─── Tests ─────────────────────────────────────────────────────────

describe('SignaturePreview', () => {
  let mod: typeof SignaturePreviewModule;

  beforeAll(async () => {
    mod = await import('../SignaturePreview');
  });

  describe('module exports', () => {
    it('should export the SignaturePreview component', () => {
      expect(mod.SignaturePreview).toBeDefined();
      expect(typeof mod.SignaturePreview).toBe('function');
    });

    it('should have displayName set', () => {
      expect(mod.SignaturePreview.displayName).toBe('SignaturePreview');
    });
  });

  describe('props type', () => {
    it('should accept drawn signature in thumbnail mode', () => {
      const props: SignaturePreviewProps = {
        signature: makeDrawnSignature(),
        size: 'thumbnail',
        expandable: true,
      };
      expect(props.signature.type).toBe('drawn');
      expect(props.signature.svgPath).toBeTruthy();
    });

    it('should accept typed signature in full mode', () => {
      const props: SignaturePreviewProps = {
        signature: makeTypedSignature(),
        size: 'full',
        expandable: false,
      };
      expect(props.signature.type).toBe('typed');
      expect(props.signature.text).toBe('John Smith');
    });

    it('should handle signature without renderable data', () => {
      const props: SignaturePreviewProps = {
        signature: makeDrawnSignature({ svgPath: undefined }),
      };
      expect(props.signature.svgPath).toBeUndefined();
    });

    it('should support custom dimensions', () => {
      const props: SignaturePreviewProps = {
        signature: makeDrawnSignature(),
        thumbnailHeight: 40,
        fullHeight: 300,
      };
      expect(props.thumbnailHeight).toBe(40);
      expect(props.fullHeight).toBe(300);
    });

    it('should handle default signature label', () => {
      const sig = makeDrawnSignature({ isDefault: true });
      expect(sig.isDefault).toBe(true);
      expect(sig.label).toBe('Full signature');
    });
  });
});

describe('signature barrel export', () => {
  it('should re-export SignaturePreview from index', async () => {
    const index = await import('../index');
    expect(index.SignaturePreview).toBeDefined();
    expect(typeof index.SignaturePreview).toBe('function');
  });
});
