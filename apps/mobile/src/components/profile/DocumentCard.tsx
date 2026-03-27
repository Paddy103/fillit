/**
 * Single identity document card for the document list.
 *
 * Displays the document type icon, label, masked number (with tap
 * to reveal), and an expiry status badge. Tapping the card navigates
 * to the edit screen.
 */

import { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { IdentityDocument } from '@fillit/shared';

import { useTheme } from '../../theme';
import { PressableCard, Chip } from '../ui';
import {
  getDocumentTypeLabel,
  getDocumentTypeIcon,
  checkExpiryStatus,
  getExpiryLabel,
  maskDocumentNumber,
  type ExpiryStatus,
} from '../../utils/documentHelpers';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DocumentCardProps {
  readonly document: IdentityDocument;
  readonly onPress: (id: string) => void;
  readonly onDelete?: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Expiry badge mapping
// ---------------------------------------------------------------------------

function expiryChipColor(status: ExpiryStatus): 'success' | 'warning' | 'error' | 'default' {
  switch (status) {
    case 'valid':
      return 'success';
    case 'expiring_soon':
      return 'warning';
    case 'expired':
      return 'error';
    default:
      return 'default';
  }
}

// ---------------------------------------------------------------------------
// Number display with mask/reveal
// ---------------------------------------------------------------------------

function MaskedNumber({ number }: { number: string }) {
  const { theme } = useTheme();
  const [revealed, setRevealed] = useState(false);

  const toggle = useCallback(() => {
    setRevealed((prev) => !prev);
  }, []);

  const displayText = revealed ? number : maskDocumentNumber(number);

  return (
    <Pressable
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel={revealed ? 'Tap to hide number' : 'Tap to reveal number'}
      accessibilityHint="Toggles document number visibility"
      style={styles.numberRow}
      testID="doc-card-number-toggle"
    >
      <Text style={[theme.typography.bodyMedium, { color: theme.colors.onSurfaceVariant }]}>
        {displayText}
      </Text>
      <Ionicons
        name={revealed ? 'eye-off-outline' : 'eye-outline'}
        size={16}
        color={theme.colors.onSurfaceVariant}
        style={{ marginLeft: theme.spacing.xs }}
      />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Card icon
// ---------------------------------------------------------------------------

function CardIcon({ type }: { type: IdentityDocument['type'] }) {
  const { theme } = useTheme();
  const iconName = getDocumentTypeIcon(type) as keyof typeof Ionicons.glyphMap;
  return (
    <View
      style={[
        styles.iconContainer,
        {
          backgroundColor: theme.colors.primaryContainer,
          borderRadius: theme.radii.md,
          width: 40,
          height: 40,
        },
      ]}
    >
      <Ionicons name={iconName} size={20} color={theme.colors.primary} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Card detail content
// ---------------------------------------------------------------------------

function CardDetails({
  document: doc,
  onDelete,
}: {
  document: IdentityDocument;
  onDelete?: () => void;
}) {
  const { theme } = useTheme();
  const typeLabel = getDocumentTypeLabel(doc.type);
  const expiryStatus = checkExpiryStatus(doc.expiryDate);
  const expiryLabel = getExpiryLabel(expiryStatus);

  return (
    <View style={styles.cardContent}>
      <View style={styles.titleRow}>
        <Text
          style={[theme.typography.titleMedium, { color: theme.colors.onSurface, flex: 1 }]}
          numberOfLines={1}
        >
          {doc.label}
        </Text>
        {onDelete ? (
          <Pressable
            onPress={onDelete}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${doc.label}`}
            testID={`doc-delete-${doc.id}`}
          >
            <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
          </Pressable>
        ) : null}
      </View>
      <Text
        style={[theme.typography.bodySmall, { color: theme.colors.onSurfaceVariant, marginTop: 2 }]}
      >
        {typeLabel}
      </Text>
      <MaskedNumber number={doc.number} />
      {expiryStatus !== 'none' ? (
        <View style={{ marginTop: theme.spacing.xs }}>
          <Chip
            label={expiryLabel}
            color={expiryChipColor(expiryStatus)}
            variant="filled"
            style={{ alignSelf: 'flex-start' }}
          />
        </View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main card component
// ---------------------------------------------------------------------------

export function DocumentCard({ document, onPress, onDelete }: DocumentCardProps) {
  const { theme } = useTheme();
  const typeLabel = getDocumentTypeLabel(document.type);

  const handlePress = useCallback(() => {
    onPress(document.id);
  }, [document.id, onPress]);

  const handleDelete = useCallback(() => {
    onDelete?.(document.id);
  }, [document.id, onDelete]);

  return (
    <PressableCard
      onPress={handlePress}
      elevation="sm"
      padding="lg"
      style={{ marginBottom: theme.spacing.md }}
      accessibilityLabel={`${document.label}, ${typeLabel}`}
      testID={`doc-card-${document.id}`}
    >
      <View style={styles.cardRow}>
        <CardIcon type={document.type} />
        <CardDetails document={document} onDelete={onDelete ? handleDelete : undefined} />
      </View>
    </PressableCard>
  );
}

DocumentCard.displayName = 'DocumentCard';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
});
