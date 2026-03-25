/**
 * TabBarIcon component for the bottom tab navigator.
 *
 * Renders a Ionicons icon with theme-aware colors.
 * Supports focused/unfocused states for active tab indication.
 */

import { type ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet } from 'react-native';

/** Props for the TabBarIcon component */
export interface TabBarIconProps {
  /** Ionicons icon name */
  readonly name: ComponentProps<typeof Ionicons>['name'];
  /** Icon color (set by tab navigator based on focus state) */
  readonly color: string;
  /** Icon size in dp */
  readonly size?: number;
  /** Whether this tab is currently focused */
  readonly focused?: boolean;
}

/**
 * Renders a tab bar icon using Ionicons.
 *
 * The icon automatically adjusts opacity based on focus state
 * for a subtle visual cue beyond color changes.
 */
export function TabBarIcon({ name, color, size = 24, focused }: TabBarIconProps) {
  return (
    <Ionicons
      name={name}
      size={size}
      color={color}
      style={[styles.icon, focused === false && styles.unfocused]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

const styles = StyleSheet.create({
  icon: {
    marginBottom: 2,
  },
  unfocused: {
    opacity: 0.8,
  },
});
