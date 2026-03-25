import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/theme';

export default function HomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();

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

      {/* TEMPORARY — Remove before merging */}
      <Pressable
        style={{
          marginTop: theme.spacing.xl,
          backgroundColor: theme.colors.primary,
          paddingVertical: 12,
          paddingHorizontal: 24,
          borderRadius: 8,
        }}
        onPress={() => router.push('/__dev-test-db' as never)}
      >
        <Text style={[theme.typography.labelLarge, { color: theme.colors.onPrimary }]}>
          Dev: Test Database
        </Text>
      </Pressable>
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
