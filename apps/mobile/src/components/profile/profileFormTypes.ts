/**
 * Types, constants, and utilities for the profile form.
 */

import {
  parseSAId,
  extractSAIdSmartFillData,
  type Gender,
  type MaritalStatus,
  type Citizenship,
  type UserProfile,
} from '@fillit/shared';

import type { CreateProfileInput } from '../../services/storage/profileCrud';

// ─── Types ──────────────────────────────────────────────────────────

export interface ProfileFormData {
  firstName: string;
  middleName: string;
  lastName: string;
  maidenName: string;
  dateOfBirth: string;
  gender: Gender | '';
  nationality: string;
  maritalStatus: MaritalStatus | '';
  saIdNumber: string;
  citizenship: Citizenship | '';
  email: string;
  phoneMobile: string;
  phoneWork: string;
  employer: string;
  jobTitle: string;
  industry: string;
}

export interface FormErrors {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  saIdNumber?: string;
  email?: string;
  phoneMobile?: string;
}

// ─── Constants ──────────────────────────────────────────────────────

export const GENDER_OPTIONS: { label: string; value: Gender }[] = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
];

export const MARITAL_OPTIONS: { label: string; value: MaritalStatus }[] = [
  { label: 'Single', value: 'single' },
  { label: 'Married', value: 'married' },
  { label: 'Divorced', value: 'divorced' },
  { label: 'Widowed', value: 'widowed' },
  { label: 'Other', value: 'other' },
];

export const CITIZENSHIP_OPTIONS: { label: string; value: Citizenship }[] = [
  { label: 'SA Citizen', value: 'citizen' },
  { label: 'Permanent Resident', value: 'permanent_resident' },
];

const EMPTY_FORM: ProfileFormData = {
  firstName: '',
  middleName: '',
  lastName: '',
  maidenName: '',
  dateOfBirth: '',
  gender: '',
  nationality: 'South African',
  maritalStatus: '',
  saIdNumber: '',
  citizenship: '',
  email: '',
  phoneMobile: '',
  phoneWork: '',
  employer: '',
  jobTitle: '',
  industry: '',
};

// ─── Helpers ────────────────────────────────────────────────────────

export function initFormData(profile?: UserProfile): ProfileFormData {
  if (!profile) return { ...EMPTY_FORM };
  return {
    firstName: profile.firstName,
    middleName: profile.middleName ?? '',
    lastName: profile.lastName,
    maidenName: profile.maidenName ?? '',
    dateOfBirth: profile.dateOfBirth,
    gender: profile.gender ?? '',
    nationality: profile.nationality,
    maritalStatus: profile.maritalStatus ?? '',
    saIdNumber: profile.saIdNumber ?? '',
    citizenship: profile.citizenship ?? '',
    email: profile.email,
    phoneMobile: profile.phoneMobile,
    phoneWork: profile.phoneWork ?? '',
    employer: profile.employer ?? '',
    jobTitle: profile.jobTitle ?? '',
    industry: profile.industry ?? '',
  };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SA_PHONE_REGEX = /^(\+27|0)\d{9}$/;

export function validateForm(data: ProfileFormData): FormErrors {
  const errors: FormErrors = {};

  if (!data.firstName.trim()) errors.firstName = 'First name is required';
  if (!data.lastName.trim()) errors.lastName = 'Last name is required';
  if (data.email.trim() && !EMAIL_REGEX.test(data.email.trim())) {
    errors.email = 'Enter a valid email address';
  }
  if (data.phoneMobile.trim() && !SA_PHONE_REGEX.test(data.phoneMobile.replace(/\s/g, ''))) {
    errors.phoneMobile = 'Enter a valid SA phone number (e.g. 0821234567)';
  }
  if (data.saIdNumber.trim()) {
    const result = parseSAId(data.saIdNumber.trim());
    if (!result.valid) {
      errors.saIdNumber = result.errors[0] ?? 'Invalid SA ID number';
    }
  }

  return errors;
}

/** Convert optional string fields to conditional spread objects. */
function optionalString<K extends string>(key: K, value: string): Record<K, string> | undefined {
  const trimmed = value.trim();
  return trimmed ? ({ [key]: trimmed } as Record<K, string>) : undefined;
}

export function buildProfileInput(
  form: ProfileFormData,
  initialData?: UserProfile,
): CreateProfileInput {
  return {
    id: initialData?.id ?? crypto.randomUUID(),
    isPrimary: initialData?.isPrimary ?? true,
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    dateOfBirth: form.dateOfBirth || '',
    email: form.email.trim(),
    phoneMobile: form.phoneMobile.trim(),
    nationality: form.nationality || 'South African',
    ...optionalString('middleName', form.middleName),
    ...optionalString('maidenName', form.maidenName),
    ...optionalString('saIdNumber', form.saIdNumber),
    ...optionalString('phoneWork', form.phoneWork),
    ...optionalString('employer', form.employer),
    ...optionalString('jobTitle', form.jobTitle),
    ...optionalString('industry', form.industry),
    ...(form.gender ? { gender: form.gender as Gender } : undefined),
    ...(form.maritalStatus ? { maritalStatus: form.maritalStatus as MaritalStatus } : undefined),
    ...(form.citizenship ? { citizenship: form.citizenship as Citizenship } : undefined),
  };
}

export { extractSAIdSmartFillData };
