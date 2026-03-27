/**
 * Relationship picker section for dependent profile screens.
 *
 * Renders a Card with an OptionPicker for selecting the dependent's
 * relationship to the primary profile holder.
 */

import { View, Text } from 'react-native';
import type { ProfileRelationship } from '@fillit/shared';

import { useTheme } from '../../../src/theme';
import { Card } from '../../../src/components/ui';
import { SectionHeader, OptionPicker } from '../../../src/components/profile/ProfileFormSections';
import { RELATIONSHIP_OPTIONS } from '../../../src/components/profile/profileFormTypes';

interface RelationshipSectionProps {
  readonly value: ProfileRelationship | '';
  readonly onChange: (value: ProfileRelationship | '') => void;
  readonly error?: string;
}

export function RelationshipSection({ value, onChange, error }: RelationshipSectionProps) {
  const { theme } = useTheme();

  return (
    <Card style={{ marginBottom: theme.spacing.lg }}>
      <SectionHeader icon="people-outline" title="Relationship" />
      <OptionPicker
        label="Relationship to you"
        options={RELATIONSHIP_OPTIONS}
        value={value}
        onChange={onChange}
      />
      {error ? (
        <View style={{ marginTop: -theme.spacing.sm }}>
          <Text
            style={[theme.typography.caption, { color: theme.colors.error }]}
            testID="relationship-error"
          >
            {error}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

RelationshipSection.displayName = 'RelationshipSection';
