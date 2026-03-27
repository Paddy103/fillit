/**
 * Form section components for the profile form.
 *
 * Each section renders a Card with themed inputs for a logical
 * group of profile fields.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '../../theme';
import { TextInput, Card } from '../ui';
import {
  GENDER_OPTIONS,
  MARITAL_OPTIONS,
  CITIZENSHIP_OPTIONS,
  type ProfileFormData,
  type FormErrors,
} from './profileFormTypes';

// ─── Shared sub-components ──────────────────────────────────────────

export function SectionHeader({ icon, title }: { icon: string; title: string }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.sectionHeader, { marginBottom: theme.spacing.md }]}>
      <Ionicons
        name={icon as React.ComponentProps<typeof Ionicons>['name']}
        size={20}
        color={theme.colors.primary}
      />
      <Text
        style={[
          theme.typography.titleMedium,
          { color: theme.colors.onSurface, marginLeft: theme.spacing.sm },
        ]}
      >
        {title}
      </Text>
    </View>
  );
}

export function OptionPicker<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { label: string; value: T }[];
  value: T | '';
  onChange: (value: T | '') => void;
}) {
  const { theme } = useTheme();

  return (
    <View style={{ marginBottom: theme.spacing.lg }}>
      <Text
        style={[
          theme.typography.labelMedium,
          { color: theme.colors.onSurfaceVariant, marginBottom: theme.spacing.xs },
        ]}
      >
        {label}
      </Text>
      <View style={styles.optionRow}>
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(selected ? '' : opt.value)}
              style={[
                styles.optionChip,
                {
                  backgroundColor: selected ? theme.colors.primary : theme.colors.surfaceVariant,
                  borderRadius: theme.radii.full,
                  paddingVertical: theme.spacing.sm,
                  paddingHorizontal: theme.spacing.md,
                  marginRight: theme.spacing.sm,
                  marginBottom: theme.spacing.xs,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${opt.label}${selected ? ', selected' : ''}`}
            >
              <Text
                style={[
                  theme.typography.labelMedium,
                  { color: selected ? theme.colors.onPrimary : theme.colors.onSurfaceVariant },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── Prop types ─────────────────────────────────────────────────────

interface SectionProps {
  form: ProfileFormData;
  errors: FormErrors;
  updateField: <K extends keyof ProfileFormData>(field: K, value: ProfileFormData[K]) => void;
}

interface SaIdSectionProps extends SectionProps {
  onSaIdChange: (text: string) => void;
  saIdHelperText: string;
}

// ─── Section Components ─────────────────────────────────────────────

export function SaIdSection({
  form,
  errors,
  updateField,
  onSaIdChange,
  saIdHelperText,
}: SaIdSectionProps) {
  const { theme } = useTheme();
  return (
    <Card style={{ marginBottom: theme.spacing.lg }}>
      <SectionHeader icon="finger-print-outline" title="SA Identification" />
      <TextInput
        label="SA ID Number"
        value={form.saIdNumber}
        onChangeText={onSaIdChange}
        error={errors.saIdNumber}
        helperText={saIdHelperText}
        keyboardType="number-pad"
        maxLength={13}
        testID="input-sa-id"
      />
      <OptionPicker
        label="Citizenship"
        options={CITIZENSHIP_OPTIONS}
        value={form.citizenship}
        onChange={(v) => updateField('citizenship', v)}
      />
    </Card>
  );
}

export function PersonalSection({ form, errors, updateField }: SectionProps) {
  const { theme } = useTheme();
  return (
    <Card style={{ marginBottom: theme.spacing.lg }}>
      <SectionHeader icon="person-outline" title="Personal Details" />
      <TextInput
        label="First Name"
        value={form.firstName}
        onChangeText={(t) => updateField('firstName', t)}
        error={errors.firstName}
        autoCapitalize="words"
        testID="input-first-name"
      />
      <TextInput
        label="Middle Name"
        value={form.middleName}
        onChangeText={(t) => updateField('middleName', t)}
        autoCapitalize="words"
        testID="input-middle-name"
      />
      <TextInput
        label="Last Name"
        value={form.lastName}
        onChangeText={(t) => updateField('lastName', t)}
        error={errors.lastName}
        autoCapitalize="words"
        testID="input-last-name"
      />
      <TextInput
        label="Maiden Name"
        value={form.maidenName}
        onChangeText={(t) => updateField('maidenName', t)}
        autoCapitalize="words"
        testID="input-maiden-name"
      />
      <TextInput
        label="Date of Birth"
        value={form.dateOfBirth}
        onChangeText={(t) => updateField('dateOfBirth', t)}
        placeholder="YYYY-MM-DD"
        keyboardType="number-pad"
        testID="input-dob"
      />
      <OptionPicker
        label="Gender"
        options={GENDER_OPTIONS}
        value={form.gender}
        onChange={(v) => updateField('gender', v)}
      />
      <TextInput
        label="Nationality"
        value={form.nationality}
        onChangeText={(t) => updateField('nationality', t)}
        autoCapitalize="words"
        testID="input-nationality"
      />
      <OptionPicker
        label="Marital Status"
        options={MARITAL_OPTIONS}
        value={form.maritalStatus}
        onChange={(v) => updateField('maritalStatus', v)}
      />
    </Card>
  );
}

export function ContactSection({ form, errors, updateField }: SectionProps) {
  const { theme } = useTheme();
  return (
    <Card style={{ marginBottom: theme.spacing.lg }}>
      <SectionHeader icon="call-outline" title="Contact Details" />
      <TextInput
        label="Email"
        value={form.email}
        onChangeText={(t) => updateField('email', t)}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        testID="input-email"
      />
      <TextInput
        label="Mobile Phone"
        value={form.phoneMobile}
        onChangeText={(t) => updateField('phoneMobile', t)}
        error={errors.phoneMobile}
        keyboardType="phone-pad"
        autoComplete="tel"
        placeholder="0821234567"
        testID="input-phone-mobile"
      />
      <TextInput
        label="Work Phone"
        value={form.phoneWork}
        onChangeText={(t) => updateField('phoneWork', t)}
        keyboardType="phone-pad"
        testID="input-phone-work"
      />
    </Card>
  );
}

export function EmploymentSection({ form, updateField }: Omit<SectionProps, 'errors'>) {
  const { theme } = useTheme();
  return (
    <Card style={{ marginBottom: theme.spacing.lg }}>
      <SectionHeader icon="briefcase-outline" title="Employment" />
      <TextInput
        label="Employer"
        value={form.employer}
        onChangeText={(t) => updateField('employer', t)}
        autoCapitalize="words"
        testID="input-employer"
      />
      <TextInput
        label="Job Title"
        value={form.jobTitle}
        onChangeText={(t) => updateField('jobTitle', t)}
        autoCapitalize="words"
        testID="input-job-title"
      />
      <TextInput
        label="Industry"
        value={form.industry}
        onChangeText={(t) => updateField('industry', t)}
        autoCapitalize="words"
        testID="input-industry"
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  optionChip: {},
});
