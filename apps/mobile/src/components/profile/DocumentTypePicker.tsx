/**
 * Document type picker with categories.
 *
 * Renders a modal-style grouped list of document types,
 * organized by category (Core ID, Driving, etc.).
 */

import { useState, useCallback } from 'react';
import { View, Text, Pressable, Modal, FlatList, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { DocumentType } from '@fillit/shared';

import { useTheme } from '../../theme';
import {
  getDocumentTypeGroups,
  getDocumentTypeLabel,
  getDocumentTypeIcon,
  type DocumentTypeGroup,
} from '../../utils/documentHelpers';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DocumentTypePickerProps {
  readonly value: DocumentType;
  readonly onChange: (type: DocumentType) => void;
  readonly error?: string;
}

// ---------------------------------------------------------------------------
// List item
// ---------------------------------------------------------------------------

function TypeItem({
  type,
  selected,
  onSelect,
}: {
  type: DocumentType;
  selected: boolean;
  onSelect: (t: DocumentType) => void;
}) {
  const { theme } = useTheme();
  const iconName = getDocumentTypeIcon(type) as keyof typeof Ionicons.glyphMap;
  const label = getDocumentTypeLabel(type);

  return (
    <Pressable
      onPress={() => onSelect(type)}
      style={[
        styles.typeItem,
        {
          backgroundColor: selected ? theme.colors.primaryContainer : 'transparent',
          paddingVertical: theme.spacing.sm,
          paddingHorizontal: theme.spacing.md,
        },
      ]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      testID={`doc-type-${type}`}
    >
      <Ionicons
        name={iconName}
        size={20}
        color={selected ? theme.colors.primary : theme.colors.onSurfaceVariant}
      />
      <Text
        style={[
          theme.typography.bodyMedium,
          {
            color: selected ? theme.colors.primary : theme.colors.onSurface,
            marginLeft: theme.spacing.sm,
            flex: 1,
          },
        ]}
      >
        {label}
      </Text>
      {selected ? <Ionicons name="checkmark" size={20} color={theme.colors.primary} /> : null}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Category header
// ---------------------------------------------------------------------------

function CategoryHeader({ title }: { title: string }) {
  const { theme } = useTheme();
  return (
    <Text
      style={[
        theme.typography.labelLarge,
        {
          color: theme.colors.onSurfaceVariant,
          paddingHorizontal: theme.spacing.md,
          paddingTop: theme.spacing.lg,
          paddingBottom: theme.spacing.xs,
        },
      ]}
    >
      {title}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// Flattened list data
// ---------------------------------------------------------------------------

type ListItem = { kind: 'header'; category: string } | { kind: 'type'; type: DocumentType };

function buildFlatList(groups: DocumentTypeGroup[]): ListItem[] {
  const items: ListItem[] = [];
  for (const group of groups) {
    items.push({ kind: 'header', category: group.category });
    for (const type of group.types) {
      items.push({ kind: 'type', type });
    }
  }
  return items;
}

function getItemKey(item: ListItem): string {
  return item.kind === 'header' ? `header-${item.category}` : `type-${item.type}`;
}

// ---------------------------------------------------------------------------
// Selector trigger button
// ---------------------------------------------------------------------------

function SelectorButton({
  value,
  error,
  onPress,
}: {
  value: DocumentType;
  error?: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const selectedLabel = getDocumentTypeLabel(value);
  const selectedIcon = getDocumentTypeIcon(value) as keyof typeof Ionicons.glyphMap;

  return (
    <>
      <Text
        style={[
          theme.typography.labelMedium,
          {
            color: error ? theme.colors.error : theme.colors.onSurfaceVariant,
            marginBottom: theme.spacing.xs,
          },
        ]}
      >
        Document Type
      </Text>
      <Pressable
        onPress={onPress}
        style={[
          styles.selector,
          {
            borderColor: error ? theme.colors.error : theme.colors.outline,
            borderRadius: theme.radii.md,
            paddingHorizontal: theme.spacing.md,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Document type: ${selectedLabel}`}
        testID="doc-type-selector"
      >
        <Ionicons name={selectedIcon} size={20} color={theme.colors.onSurface} />
        <Text
          style={[
            theme.typography.bodyMedium,
            { color: theme.colors.onSurface, flex: 1, marginLeft: theme.spacing.sm },
          ]}
        >
          {selectedLabel}
        </Text>
        <Ionicons name="chevron-down" size={20} color={theme.colors.onSurfaceVariant} />
      </Pressable>
      {error ? (
        <Text
          style={[
            theme.typography.caption,
            { color: theme.colors.error, marginTop: theme.spacing.xs },
          ]}
        >
          {error}
        </Text>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// Modal content
// ---------------------------------------------------------------------------

function TypeListModal({
  visible,
  value,
  flatData,
  onSelect,
  onClose,
}: {
  visible: boolean;
  value: DocumentType;
  flatData: ListItem[];
  onSelect: (type: DocumentType) => void;
  onClose: () => void;
}) {
  const { theme } = useTheme();

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.kind === 'header') {
        return <CategoryHeader title={item.category} />;
      }
      return <TypeItem type={item.type} selected={item.type === value} onSelect={onSelect} />;
    },
    [value, onSelect],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      testID="doc-type-modal"
    >
      <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
        <View
          style={[
            styles.modalHeader,
            {
              borderBottomColor: theme.colors.outline,
              paddingHorizontal: theme.spacing.lg,
              paddingVertical: theme.spacing.md,
            },
          ]}
        >
          <Text style={[theme.typography.titleLarge, { color: theme.colors.onSurface, flex: 1 }]}>
            Select Document Type
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
            testID="doc-type-modal-close"
          >
            <Ionicons name="close" size={24} color={theme.colors.onSurface} />
          </Pressable>
        </View>
        <FlatList
          data={flatData}
          keyExtractor={getItemKey}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: theme.spacing['3xl'] }}
        />
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DocumentTypePicker({ value, onChange, error }: DocumentTypePickerProps) {
  const { theme } = useTheme();
  const [visible, setVisible] = useState(false);
  const groups = getDocumentTypeGroups();
  const flatData = buildFlatList(groups);

  const handleSelect = useCallback(
    (type: DocumentType) => {
      onChange(type);
      setVisible(false);
    },
    [onChange],
  );

  return (
    <View style={{ marginBottom: theme.spacing.lg }} testID="document-type-picker">
      <SelectorButton value={value} error={error} onPress={() => setVisible(true)} />
      <TypeListModal
        visible={visible}
        value={value}
        flatData={flatData}
        onSelect={handleSelect}
        onClose={() => setVisible(false)}
      />
    </View>
  );
}

DocumentTypePicker.displayName = 'DocumentTypePicker';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 48,
  },
  typeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
});
