/**
 * Tests for the TabBarIcon component.
 *
 * Verifies the component exports and interface contract.
 * Uses mocks for React Native and @expo/vector-icons to avoid
 * Vitest parse issues with Flow/JSX in native modules.
 */

import { describe, it, expect, vi } from 'vitest';

// Mock react-native
vi.mock('react-native', () => ({
  StyleSheet: {
    create: (styles: Record<string, unknown>) => styles,
  },
}));

// Mock @expo/vector-icons/Ionicons
vi.mock('@expo/vector-icons/Ionicons', () => ({
  default: vi.fn(() => null),
}));

import { TabBarIcon, type TabBarIconProps } from '../TabBarIcon';

describe('TabBarIcon', () => {
  it('should export a named TabBarIcon function', () => {
    expect(typeof TabBarIcon).toBe('function');
  });

  it('should be callable with required props', () => {
    expect(() => {
      TabBarIcon({ name: 'home', color: '#000000' });
    }).not.toThrow();
  });

  it('should be callable with all props', () => {
    expect(() => {
      TabBarIcon({
        name: 'home-outline',
        color: '#FFFFFF',
        size: 28,
        focused: true,
      });
    }).not.toThrow();
  });

  it('should accept unfocused state', () => {
    expect(() => {
      TabBarIcon({
        name: 'settings-outline',
        color: '#666666',
        focused: false,
      });
    }).not.toThrow();
  });

  it('should satisfy the TabBarIconProps interface', () => {
    const props: TabBarIconProps = {
      name: 'document-text',
      color: '#0066CC',
      size: 24,
      focused: true,
    };
    expect(props.name).toBe('document-text');
    expect(props.color).toBe('#0066CC');
    expect(props.size).toBe(24);
    expect(props.focused).toBe(true);
  });
});
