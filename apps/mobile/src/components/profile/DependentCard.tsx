/**
 * Card component for a single dependent profile.
 *
 * Displays the dependent's name, relationship badge, completeness
 * percentage, and an active indicator. Supports tap to edit and
 * a "Set Active" button.
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { UserProfile, ProfileRelationship } from '@fillit/shared';

import { useTheme } from '../../theme';
import { Card, Avatar, Chip } from '../ui';

interface DependentCardProps {
  readonly profile: UserProfile;
  readonly completeness: number;
  readonly isActive: boolean;
  readonly onPress: () => void;
  readonly onSetActive: () => void;
}

const RELATIONSHIP_LABELS: Record<ProfileRelationship, string> = {
  spouse: 'Spouse',
  child: 'Child',
  parent: 'Parent',
  other: 'Other',
};

function getRelationshipLabel(rel?: ProfileRelationship): string {
  return rel ? RELATIONSHIP_LABELS[rel] : 'Unknown';
}

export function DependentCard({
  profile,
  completeness,
  isActive,
  onPress,
  onSetActive,
}: DependentCardProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Edit ${profile.firstName} ${profile.lastName}`}
      testID={`dependent-card-${profile.id}`}
    >
      <Card style={{ marginBottom: theme.spacing.md }}>
        <CardHeader profile={profile} isActive={isActive} />
        <CardFooter completeness={completeness} isActive={isActive} onSetActive={onSetActive} />
      </Card>
    </Pressable>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────

function CardHeader({ profile, isActive }: { profile: UserProfile; isActive: boolean }) {
  const { theme } = useTheme();
  const fullName = `${profile.firstName} ${profile.lastName}`;
  const relLabel = getRelationshipLabel(profile.relationship);

  return (
    <View style={styles.headerRow}>
      <Avatar name={fullName} size="md" />
      <View style={[styles.headerInfo, { marginLeft: theme.spacing.md }]}>
        <View style={styles.nameRow}>
          <Text
            style={[theme.typography.titleMedium, { color: theme.colors.onSurface, flex: 1 }]}
            numberOfLines={1}
          >
            {fullName}
          </Text>
          {isActive ? (
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={theme.colors.success}
              style={{ marginLeft: theme.spacing.xs }}
            />
          ) : null}
        </View>
        <View style={[styles.chipRow, { marginTop: theme.spacing.xs }]}>
          <Chip label={relLabel} color="primary" />
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.onSurfaceVariant} />
    </View>
  );
}

function CardFooter({
  completeness,
  isActive,
  onSetActive,
}: {
  completeness: number;
  isActive: boolean;
  onSetActive: () => void;
}) {
  const { theme } = useTheme();

  return (
    <View style={[styles.footerRow, { marginTop: theme.spacing.md }]}>
      <Text style={[theme.typography.caption, { color: theme.colors.onSurfaceVariant, flex: 1 }]}>
        {completeness}% complete
      </Text>
      {!isActive ? (
        <Pressable
          onPress={onSetActive}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Set as active profile"
          testID="set-active-button"
        >
          <Text style={[theme.typography.labelMedium, { color: theme.colors.primary }]}>
            Set Active
          </Text>
        </Pressable>
      ) : (
        <Text style={[theme.typography.labelMedium, { color: theme.colors.success }]}>Active</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

DependentCard.displayName = 'DependentCard';
