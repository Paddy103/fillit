/**
 * Reusable header bar for profile screens (create/edit).
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '../../theme';

interface ScreenHeaderProps {
  readonly title: string;
  readonly onBack: () => void;
}

export function ScreenHeader({ title, onBack }: ScreenHeaderProps) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: theme.colors.surface,
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing['3xl'],
          paddingBottom: theme.spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.outline,
        },
      ]}
    >
      <Pressable
        onPress={onBack}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        testID="back-button"
      >
        <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />
      </Pressable>
      <Text
        style={[
          theme.typography.titleLarge,
          { color: theme.colors.onSurface, marginLeft: theme.spacing.md, flex: 1 },
        ]}
      >
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

ScreenHeader.displayName = 'ScreenHeader';
