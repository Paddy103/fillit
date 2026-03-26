/**
 * Home / Dashboard tab screen.
 *
 * Displays a welcome message, quick-action buttons (Scan, Import),
 * recent documents, and a profile completeness indicator.
 * This is the primary landing screen after app launch.
 */

import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '../../src/theme';

export default function HomeScreen() {
  const { theme } = useTheme();

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={[styles.content, { padding: theme.spacing.lg }]}
      testID="home-screen"
    >
      {/* Hero section */}
      <View style={[styles.hero, { marginBottom: theme.spacing['2xl'] }]}>
        <Text
          style={[
            theme.typography.displayMedium,
            { color: theme.colors.onBackground, marginBottom: theme.spacing.xs },
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

      {/* Quick actions */}
      <View style={[styles.quickActions, { gap: theme.spacing.md }]}>
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            {
              backgroundColor: theme.colors.primary,
              borderRadius: theme.radii.lg,
              padding: theme.spacing.lg,
              ...theme.elevations.md,
            },
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Scan a document"
          testID="action-scan"
        >
          <Ionicons name="scan" size={32} color={theme.colors.onPrimary} />
          <Text
            style={[
              theme.typography.titleLarge,
              { color: theme.colors.onPrimary, marginTop: theme.spacing.sm },
            ]}
          >
            Scan
          </Text>
          <Text
            style={[theme.typography.bodySmall, { color: theme.colors.onPrimary, opacity: 0.9 }]}
          >
            Use camera to scan
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            {
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radii.lg,
              borderWidth: 1,
              borderColor: theme.colors.outline,
              padding: theme.spacing.lg,
              ...theme.elevations.sm,
            },
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Import a document"
          testID="action-import"
        >
          <Ionicons name="document-attach-outline" size={32} color={theme.colors.primary} />
          <Text
            style={[
              theme.typography.titleLarge,
              { color: theme.colors.onSurface, marginTop: theme.spacing.sm },
            ]}
          >
            Import
          </Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.onSurfaceVariant }]}>
            PDF or image file
          </Text>
        </Pressable>
      </View>

      {/* Recent documents placeholder */}
      <View style={{ marginTop: theme.spacing['3xl'] }}>
        <Text
          style={[
            theme.typography.headlineMedium,
            { color: theme.colors.onBackground, marginBottom: theme.spacing.md },
          ]}
        >
          Recent Documents
        </Text>
        <View
          style={[
            styles.emptyState,
            {
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: theme.radii.lg,
              padding: theme.spacing['2xl'],
            },
          ]}
          testID="empty-recent-documents"
        >
          <Ionicons
            name="documents-outline"
            size={48}
            color={theme.colors.onSurfaceVariant}
            style={{ marginBottom: theme.spacing.md }}
          />
          <Text
            style={[
              theme.typography.bodyLarge,
              { color: theme.colors.onSurfaceVariant, textAlign: 'center' },
            ]}
          >
            No documents yet
          </Text>
          <Text
            style={[
              theme.typography.bodySmall,
              {
                color: theme.colors.onSurfaceVariant,
                textAlign: 'center',
                marginTop: theme.spacing.xs,
              },
            ]}
          >
            Scan or import your first document to get started.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 8,
  },
  quickActions: {
    flexDirection: 'row',
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  emptyState: {
    alignItems: 'center',
  },
});
