/**
 * Profiles tab screen.
 *
 * Manages user profiles and dependents. Shows the primary user profile
 * card and dependent profiles. Provides navigation to edit profiles
 * and add new dependents.
 */

import { StyleSheet, Text, View, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '../../src/theme';

export default function ProfilesScreen() {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, padding: theme.spacing.lg },
      ]}
      testID="profiles-screen"
    >
      {/* Profile completeness indicator placeholder */}
      <View
        style={[
          styles.completenessCard,
          {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radii.lg,
            padding: theme.spacing.lg,
            marginBottom: theme.spacing.lg,
            ...theme.elevations.sm,
          },
        ]}
        testID="profile-completeness"
      >
        <View style={styles.completenessHeader}>
          <Ionicons name="shield-checkmark-outline" size={24} color={theme.colors.primary} />
          <Text
            style={[
              theme.typography.titleLarge,
              { color: theme.colors.onSurface, marginLeft: theme.spacing.sm },
            ]}
          >
            Profile
          </Text>
        </View>
        <Text
          style={[
            theme.typography.bodyMedium,
            { color: theme.colors.onSurfaceVariant, marginTop: theme.spacing.sm },
          ]}
        >
          Complete your profile to enable automatic form filling.
        </Text>

        {/* Progress bar placeholder */}
        <View
          style={[
            styles.progressTrack,
            {
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: theme.radii.full,
              marginTop: theme.spacing.md,
            },
          ]}
        >
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: theme.colors.primary,
                borderRadius: theme.radii.full,
                width: '0%',
              },
            ]}
          />
        </View>
        <Text
          style={[
            theme.typography.labelSmall,
            { color: theme.colors.onSurfaceVariant, marginTop: theme.spacing.xs },
          ]}
        >
          0% complete
        </Text>
      </View>

      {/* Empty state / Setup prompt */}
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
          name="people-outline"
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
          Set Up Your Profile
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
          Add your details so FillIt can auto-fill forms for you.
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.setupButton,
            {
              backgroundColor: theme.colors.primary,
              borderRadius: theme.radii.md,
              marginTop: theme.spacing.lg,
              paddingVertical: theme.spacing.md,
              paddingHorizontal: theme.spacing['2xl'],
            },
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Set up your profile"
          testID="setup-profile-button"
        >
          <Text style={[theme.typography.labelLarge, { color: theme.colors.onPrimary }]}>
            Get Started
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  completenessCard: {},
  completenessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressTrack: {
    height: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  emptyState: {
    alignItems: 'center',
  },
  setupButton: {
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
});
