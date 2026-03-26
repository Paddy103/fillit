/**
 * Custom tab bar component for the bottom navigation.
 *
 * Styled with the FillIt design system tokens for consistent
 * theming across light and dark modes. Includes proper
 * accessibility labels and roles for screen reader support.
 */

import { type ReactNode } from 'react';
import { View, Pressable, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../theme';

/** Height of the tab bar content area (excluding safe area inset) */
const TAB_BAR_HEIGHT = 56;

/** Route shape from the tab navigator state */
interface TabRoute {
  readonly key: string;
  readonly name: string;
  readonly params?: object;
}

/** Options we read from each tab descriptor */
interface TabOptions {
  readonly tabBarLabel?: string | ((...args: unknown[]) => ReactNode);
  readonly title?: string;
  readonly tabBarAccessibilityLabel?: string;
  readonly tabBarTestID?: string;
  readonly tabBarIcon?: (props: { focused: boolean; color: string; size: number }) => ReactNode;
}

/**
 * Props passed to the custom tab bar by the bottom tab navigator.
 *
 * We use a permissive record type for descriptors and navigation
 * to avoid tight coupling with @react-navigation/bottom-tabs types,
 * which are a transitive dependency not directly accessible in pnpm strict mode.
 */
export interface TabBarProps {
  readonly state: {
    readonly index: number;
    readonly routes: readonly TabRoute[];
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly descriptors: Record<string, { readonly options: any }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly navigation: any;
  /** Accept additional props from the navigator (e.g., insets) */
  readonly [key: string]: unknown;
}

/**
 * Custom bottom tab bar with theme-aware styling.
 *
 * Features:
 * - Theme token-based colors (light/dark mode)
 * - Safe area inset handling for devices with home indicators
 * - Elevation shadow on the top edge
 * - Accessible tab buttons with labels and roles
 * - Pressed state feedback
 */
/** Resolve the display label for a tab route */
function resolveTabLabel(options: TabOptions, routeName: string): string {
  if (typeof options.tabBarLabel === 'string') return options.tabBarLabel;
  if (typeof options.title === 'string') return options.title;
  return routeName;
}

/** Render a single tab item */
function TabItem({
  route,
  options,
  isFocused,
  navigation,
  theme,
}: {
  route: TabRoute;
  options: TabOptions;
  isFocused: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  const label = resolveTabLabel(options, route.name);
  const color = isFocused ? theme.colors.primary : theme.colors.onSurfaceVariant;

  const onPress = () => {
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  };

  const onLongPress = () => {
    navigation.emit({ type: 'tabLongPress', target: route.key });
  };

  return (
    <Pressable
      key={route.key}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={options.tabBarAccessibilityLabel ?? `${label} tab`}
      testID={options.tabBarTestID ?? `tab-${route.name}`}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.tab,
        pressed && styles.tabPressed,
        isFocused && {
          backgroundColor:
            theme.colorScheme === 'dark' ? 'rgba(94, 166, 255, 0.08)' : 'rgba(0, 102, 204, 0.06)',
        },
      ]}
    >
      {options.tabBarIcon?.({ focused: isFocused, color, size: 24 })}
      <Text
        style={[
          styles.label,
          theme.typography.labelSmall,
          { color },
          isFocused && styles.labelFocused,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function TabBar({ state, descriptors, navigation }: TabBarProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.divider,
          paddingBottom: insets.bottom,
          ...theme.elevations.sm,
        },
      ]}
      accessibilityRole="tablist"
      testID="tab-bar"
    >
      {state.routes.map((route, index) => {
        const descriptor = descriptors[route.key];
        if (!descriptor) return null;
        const options = descriptor.options as TabOptions;
        return (
          <TabItem
            key={route.key}
            route={route}
            options={options}
            isFocused={state.index === index}
            navigation={navigation}
            theme={theme}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      android: {
        elevation: 8,
      },
      default: {},
    }),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 4,
    minHeight: TAB_BAR_HEIGHT,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  tabPressed: {
    opacity: 0.7,
  },
  label: {
    marginTop: 2,
    textAlign: 'center',
  },
  labelFocused: {
    fontWeight: '600',
  },
});
