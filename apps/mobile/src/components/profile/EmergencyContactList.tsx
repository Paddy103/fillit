/**
 * Emergency contact list component.
 *
 * Displays existing contacts as cards with name, relationship, and
 * phone. Provides edit/delete actions and an "Add Contact" button
 * that is disabled when the maximum of 2 contacts is reached.
 */

import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { EmergencyContact } from '@fillit/shared';

import { useTheme } from '../../theme';
import { Button, Card } from '../ui';

// ─── Constants ───────────────────────────────────────────────────────

const MAX_EMERGENCY_CONTACTS = 2;

// ─── Types ───────────────────────────────────────────────────────────

export interface EmergencyContactListProps {
  readonly contacts: EmergencyContact[];
  readonly onAdd: () => void;
  readonly onEdit: (contact: EmergencyContact) => void;
  readonly onDelete: (id: string) => Promise<void>;
  readonly isDeleting?: boolean;
}

// ─── Sub-components ──────────────────────────────────────────────────

function PhoneRow({ icon, label }: { icon: string; label: string }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.phoneRow, { marginTop: theme.spacing.sm }]}>
      <Ionicons
        name={icon as React.ComponentProps<typeof Ionicons>['name']}
        size={16}
        color={theme.colors.onSurfaceVariant}
      />
      <Text
        style={[
          theme.typography.bodyMedium,
          {
            color: theme.colors.onSurface,
            marginLeft: theme.spacing.sm,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function ContactCardActions({
  contactId,
  onEdit,
  onDelete,
}: {
  contactId: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { theme } = useTheme();
  return (
    <View style={[styles.actions, { marginTop: theme.spacing.md }]}>
      <Button
        label="Edit"
        variant="outline"
        size="sm"
        onPress={onEdit}
        testID={`edit-contact-${contactId}`}
      />
      <Button
        label="Delete"
        variant="ghost"
        size="sm"
        onPress={onDelete}
        style={{ marginLeft: theme.spacing.sm }}
        testID={`delete-contact-${contactId}`}
      />
    </View>
  );
}

function ContactCard({
  contact,
  onEdit,
  onDelete,
}: {
  contact: EmergencyContact;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { theme } = useTheme();
  const fullName = `${contact.firstName} ${contact.lastName}`;

  return (
    <Card
      elevation="sm"
      padding="lg"
      bordered
      style={{ marginBottom: theme.spacing.md }}
      accessibilityLabel={`Emergency contact: ${fullName}`}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Text
            style={[theme.typography.titleMedium, { color: theme.colors.onSurface }]}
            testID={`contact-name-${contact.id}`}
          >
            {fullName}
          </Text>
          <Text
            style={[
              theme.typography.bodyMedium,
              {
                color: theme.colors.onSurfaceVariant,
                marginTop: theme.spacing.xs,
              },
            ]}
          >
            {contact.relationship}
          </Text>
        </View>
        <Ionicons name="people-outline" size={24} color={theme.colors.primary} />
      </View>
      <PhoneRow icon="call-outline" label={contact.phoneMobile} />
      {contact.phoneWork ? <PhoneRow icon="briefcase-outline" label={contact.phoneWork} /> : null}
      {contact.email ? <PhoneRow icon="mail-outline" label={contact.email} /> : null}
      <ContactCardActions contactId={contact.id} onEdit={onEdit} onDelete={onDelete} />
    </Card>
  );
}

function EmptyState() {
  const { theme } = useTheme();
  return (
    <View style={[styles.emptyState, { padding: theme.spacing.xl }]}>
      <Ionicons name="people-outline" size={48} color={theme.colors.onSurfaceVariant} />
      <Text
        style={[
          theme.typography.bodyLarge,
          {
            color: theme.colors.onSurfaceVariant,
            marginTop: theme.spacing.md,
            textAlign: 'center',
          },
        ]}
      >
        No emergency contacts added yet
      </Text>
    </View>
  );
}

function AddButton({
  hasMaxContacts,
  isDeleting,
  onAdd,
}: {
  hasMaxContacts: boolean;
  isDeleting: boolean;
  onAdd: () => void;
}) {
  const { theme } = useTheme();
  return (
    <View style={{ marginTop: theme.spacing.md }}>
      <Button
        label={
          hasMaxContacts
            ? `Maximum ${MAX_EMERGENCY_CONTACTS} contacts reached`
            : 'Add Emergency Contact'
        }
        onPress={onAdd}
        disabled={hasMaxContacts || isDeleting}
        fullWidth
        size="lg"
        variant={hasMaxContacts ? 'outline' : 'primary'}
        iconLeft={
          !hasMaxContacts ? (
            <Ionicons name="add-circle-outline" size={20} color={theme.colors.onPrimary} />
          ) : undefined
        }
        testID="add-emergency-contact"
      />
      {hasMaxContacts ? (
        <Text
          style={[
            theme.typography.caption,
            {
              color: theme.colors.onSurfaceVariant,
              textAlign: 'center',
              marginTop: theme.spacing.sm,
            },
          ]}
        >
          You can add up to {MAX_EMERGENCY_CONTACTS} emergency contacts
        </Text>
      ) : null}
    </View>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export function EmergencyContactList({
  contacts,
  onAdd,
  onEdit,
  onDelete,
  isDeleting = false,
}: EmergencyContactListProps) {
  const hasMaxContacts = contacts.length >= MAX_EMERGENCY_CONTACTS;

  const handleDelete = (contact: EmergencyContact) => {
    const fullName = `${contact.firstName} ${contact.lastName}`;
    Alert.alert(
      'Delete Contact',
      `Are you sure you want to remove ${fullName} as an emergency contact?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(contact.id),
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      {contacts.length === 0 ? <EmptyState /> : null}
      {contacts.map((contact) => (
        <ContactCard
          key={contact.id}
          contact={contact}
          onEdit={() => onEdit(contact)}
          onDelete={() => handleDelete(contact)}
        />
      ))}
      <AddButton hasMaxContacts={hasMaxContacts} isDeleting={isDeleting} onAdd={onAdd} />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardInfo: {
    flex: 1,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

EmergencyContactList.displayName = 'EmergencyContactList';
