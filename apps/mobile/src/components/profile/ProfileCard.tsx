/**
 * Profile card component for the profiles tab.
 *
 * Shows the user's name, contact info, and quick info chips
 * for their SA ID and employer.
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { UserProfile } from '@fillit/shared';

import { useTheme } from '../../theme';
import { Card, Avatar } from '../ui';

interface ProfileCardProps {
  readonly profile: UserProfile;
  readonly onPress: () => void;
}

export function ProfileCard({ profile, onPress }: ProfileCardProps) {
  const { theme } = useTheme();

  return (
    <Pressable onPress={onPress} accessibilityRole="button" testID="profile-card">
      <Card style={{ marginBottom: theme.spacing.lg }}>
        <View style={styles.profileRow}>
          <Avatar name={`${profile.firstName} ${profile.lastName}`} size="lg" />
          <View style={[styles.profileInfo, { marginLeft: theme.spacing.md }]}>
            <Text style={[theme.typography.titleLarge, { color: theme.colors.onSurface }]}>
              {profile.firstName} {profile.lastName}
            </Text>
            {profile.email ? (
              <Text
                style={[
                  theme.typography.bodyMedium,
                  { color: theme.colors.onSurfaceVariant, marginTop: theme.spacing['2xs'] },
                ]}
              >
                {profile.email}
              </Text>
            ) : null}
            {profile.phoneMobile ? (
              <Text
                style={[
                  theme.typography.bodySmall,
                  { color: theme.colors.onSurfaceVariant, marginTop: theme.spacing['2xs'] },
                ]}
              >
                {profile.phoneMobile}
              </Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.onSurfaceVariant} />
        </View>

        <View style={[styles.chipRow, { marginTop: theme.spacing.md }]}>
          {profile.saIdNumber ? <InfoChip icon="finger-print-outline" label="SA ID" /> : null}
          {profile.employer ? <InfoChip icon="briefcase-outline" label={profile.employer} /> : null}
        </View>
      </Card>
    </Pressable>
  );
}

function InfoChip({ icon, label }: { icon: string; label: string }) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.infoChip,
        {
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: theme.radii.full,
          paddingVertical: theme.spacing.xs,
          paddingHorizontal: theme.spacing.md,
          marginRight: theme.spacing.sm,
        },
      ]}
    >
      <Ionicons
        name={icon as React.ComponentProps<typeof Ionicons>['name']}
        size={14}
        color={theme.colors.primary}
        style={{ marginRight: theme.spacing.xs }}
      />
      <Text style={[theme.typography.labelSmall, { color: theme.colors.onSurfaceVariant }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

ProfileCard.displayName = 'ProfileCard';
