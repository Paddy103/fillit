/**
 * Province picker modal for selecting a South African province.
 *
 * Renders a bottom-sheet-style modal with a list of SA provinces
 * from the shared SA_PROVINCE_DATA constant.
 */

import { View, Text, Pressable, Modal, FlatList, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SA_PROVINCE_DATA } from '@fillit/shared';

import { useTheme } from '../../theme';

interface ProvincePickerProps {
  readonly visible: boolean;
  readonly selectedProvince: string;
  readonly onSelect: (province: string) => void;
  readonly onClose: () => void;
}

export function ProvincePicker({
  visible,
  selectedProvince,
  onSelect,
  onClose,
}: ProvincePickerProps) {
  const { theme } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      testID="province-picker-modal"
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.surface,
              borderTopLeftRadius: theme.radii.xl,
              borderTopRightRadius: theme.radii.xl,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <PickerHeader onClose={onClose} />
          <ProvinceList selectedProvince={selectedProvince} onSelect={onSelect} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function PickerHeader({ onClose }: { onClose: () => void }) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.header,
        {
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.outline,
        },
      ]}
    >
      <Text style={[theme.typography.titleLarge, { color: theme.colors.onSurface, flex: 1 }]}>
        Select Province
      </Text>
      <Pressable
        onPress={onClose}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Close province picker"
        testID="province-picker-close"
      >
        <Ionicons name="close" size={24} color={theme.colors.onSurface} />
      </Pressable>
    </View>
  );
}

function ProvinceList({
  selectedProvince,
  onSelect,
}: {
  selectedProvince: string;
  onSelect: (province: string) => void;
}) {
  const { theme } = useTheme();

  return (
    <FlatList
      data={SA_PROVINCE_DATA}
      keyExtractor={(item) => item.abbreviation}
      renderItem={({ item }) => {
        const isSelected = item.name === selectedProvince;
        return (
          <Pressable
            onPress={() => onSelect(item.name)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={item.name}
            testID={`province-option-${item.abbreviation}`}
            style={[
              styles.item,
              {
                paddingHorizontal: theme.spacing.lg,
                paddingVertical: theme.spacing.md,
                backgroundColor: isSelected ? theme.colors.primaryLight : 'transparent',
              },
            ]}
          >
            <Text
              style={[
                theme.typography.bodyLarge,
                {
                  color: isSelected ? theme.colors.primary : theme.colors.onSurface,
                  flex: 1,
                },
              ]}
            >
              {item.name}
            </Text>
            <Text style={[theme.typography.labelMedium, { color: theme.colors.onSurfaceVariant }]}>
              {item.abbreviation}
            </Text>
            {isSelected ? (
              <Ionicons
                name="checkmark"
                size={20}
                color={theme.colors.primary}
                style={{ marginLeft: theme.spacing.sm }}
              />
            ) : null}
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    maxHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

ProvincePicker.displayName = 'ProvincePicker';
