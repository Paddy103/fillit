import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../src/theme';

export default function HomeScreen() {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, padding: theme.spacing.lg },
      ]}
    >
      <Text
        style={[
          theme.typography.displayMedium,
          { color: theme.colors.onBackground, marginBottom: theme.spacing.sm },
        ]}
      >
        FillIt
      </Text>
      <Text
        style={[
          theme.typography.bodyLarge,
          { color: theme.colors.onSurfaceVariant, textAlign: 'center' },
        ]}
      >
        Scan, fill, and export documents with ease.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
