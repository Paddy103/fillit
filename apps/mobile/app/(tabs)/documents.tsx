/**
 * Documents tab screen.
 *
 * Displays a list of all processed documents with their current status.
 * Shows status chips (scanned, matched, exported, etc.) and allows
 * users to tap into a document to continue processing or review.
 */

import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '../../src/theme';

export default function DocumentsScreen() {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, padding: theme.spacing.lg },
      ]}
      testID="documents-screen"
    >
      <View
        style={[
          styles.emptyState,
          {
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: theme.radii.lg,
            padding: theme.spacing['2xl'],
          },
        ]}
      >
        <Ionicons
          name="folder-open-outline"
          size={64}
          color={theme.colors.onSurfaceVariant}
          style={{ marginBottom: theme.spacing.lg }}
        />
        <Text
          style={[
            theme.typography.headlineMedium,
            { color: theme.colors.onSurfaceVariant, textAlign: 'center' },
          ]}
        >
          No Documents Yet
        </Text>
        <Text
          style={[
            theme.typography.bodyMedium,
            {
              color: theme.colors.onSurfaceVariant,
              textAlign: 'center',
              marginTop: theme.spacing.sm,
            },
          ]}
        >
          Scanned and imported documents will appear here.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    width: '100%',
  },
});
