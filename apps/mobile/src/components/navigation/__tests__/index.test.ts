/**
 * Tests for the navigation components barrel export.
 *
 * Verifies all expected exports are available.
 * Uses mocks for React Native and icon dependencies.
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

// Mock @expo/vector-icons/Ionicons
vi.mock('@expo/vector-icons/Ionicons', () => ({
  default: vi.fn(() => null),
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

import { TabBar, TabBarIcon } from '../index';

describe('navigation barrel export', () => {
  it('should export TabBar', () => {
    expect(TabBar).toBeDefined();
    expect(typeof TabBar).toBe('function');
  });

  it('should export TabBarIcon', () => {
    expect(TabBarIcon).toBeDefined();
    expect(typeof TabBarIcon).toBe('function');
  });
});
