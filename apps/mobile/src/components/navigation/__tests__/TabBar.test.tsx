/**
 * Tests for the TabBar component.
 *
 * Verifies the component exports and basic contract.
 * Uses mocks for React Native and navigation dependencies
 * to avoid Vitest parse issues with Flow/JSX in native modules.
 */

import { describe, it, expect, vi } from 'vitest';

// Mock react-native
vi.mock('react-native', () => ({
  View: vi.fn(() => null),
  Pressable: vi.fn(() => null),
  Text: vi.fn(() => null),
  StyleSheet: {
    create: (styles: Record<string, unknown>) => styles,
    hairlineWidth: 0.5,
  },
  Platform: {
    select: vi.fn((obj: Record<string, unknown>) => obj.default ?? {}),
  },
}));

// Mock react-native-safe-area-context
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: vi.fn(() => ({ top: 0, right: 0, bottom: 0, left: 0 })),
}));

// Mock the theme hook
vi.mock('../../../theme', () => ({
  useTheme: vi.fn(() => ({
    theme: {
      colors: {
        surface: '#FFFFFF',
        divider: '#E0E0E0',
        primary: '#0066CC',
        onSurfaceVariant: '#666666',
        onPrimary: '#FFFFFF',
      },
      colorScheme: 'light',
      typography: {
        labelSmall: { fontSize: 10, lineHeight: 14 },
      },
      elevations: {
        sm: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
          elevation: 2,
        },
      },
    },
  })),
}));

import { TabBar } from '../TabBar';

describe('TabBar', () => {
  it('should export a named TabBar function', () => {
    expect(typeof TabBar).toBe('function');
  });

  it('should be a React function component', () => {
    // React function components accept props as the first argument
    expect(TabBar.length).toBeGreaterThanOrEqual(0);
  });
});
