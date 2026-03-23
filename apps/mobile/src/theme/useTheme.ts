import { useContext } from 'react';
import { ThemeContext } from './ThemeContext';
import { type ThemeContextValue } from './types';

/**
 * Hook to access the current theme and color mode controls.
 *
 * Returns the full theme object, current color mode, and functions to
 * change or toggle the color mode.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { theme, isDark, toggleColorMode } = useTheme();
 *
 *   return (
 *     <View style={{ backgroundColor: theme.colors.background }}>
 *       <Text style={{ color: theme.colors.onBackground }}>
 *         Current mode: {isDark ? 'Dark' : 'Light'}
 *       </Text>
 *       <Button onPress={toggleColorMode} title="Toggle" />
 *     </View>
 *   );
 * }
 * ```
 */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
