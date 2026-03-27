import { describe, it, expect, vi, beforeAll } from 'vitest';

// Mock @fillit/shared with actual shared package logic
vi.mock('@fillit/shared', async () => {
  const saIdModule = await import('../../../../../../packages/shared/src/validation/sa-id');
  const profileTypes = await import('../../../../../../packages/shared/src/types/profile');
  return {
    ...profileTypes,
    parseSAId: saIdModule.parseSAId,
    extractSAIdSmartFillData: saIdModule.extractSAIdSmartFillData,
  };
});

import type { ProfileFormData, FormErrors } from '../profileFormTypes';
import type { CreateProfileInput } from '../../../services/storage/profileCrud';
import type { UserProfile } from '@fillit/shared';

// ─── Helpers ────────────────────────────────────────────────────────

function luhnChecksumDigit(prefix: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = Number(prefix[i]);
    if (i % 2 === 0) {
      sum += digit;
    } else {
      const doubled = digit * 2;
      sum += doubled > 9 ? doubled - 9 : doubled;
    }
  }
  return (10 - (sum % 10)) % 10;
}

function makeId(prefix: string): string {
  return prefix + String(luhnChecksumDigit(prefix));
}

// ─── Test data ──────────────────────────────────────────────────────

// 9202205009 0 8 Z → male, citizen, DOB 1992-02-20
const VALID_SA_ID = makeId('920220500908');

const MOCK_PROFILE: UserProfile = {
  id: 'test-id-123',
  isPrimary: true,
  firstName: 'John',
  middleName: 'William',
  lastName: 'Smith',
  maidenName: 'Jones',
  dateOfBirth: '1992-02-20',
  gender: 'male',
  nationality: 'South African',
  maritalStatus: 'single',
  saIdNumber: VALID_SA_ID,
  citizenship: 'citizen',
  email: 'john@example.com',
  phoneMobile: '0821234567',
  phoneWork: '0111234567',
  employer: 'Acme Corp',
  jobTitle: 'Engineer',
  industry: 'Technology',
  addresses: [],
  documents: [],
  professionalRegistrations: [],
  emergencyContacts: [],
  signatures: [],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('profileFormTypes', () => {
  let initFormData: (profile?: UserProfile) => ProfileFormData;
  let validateForm: (data: ProfileFormData) => FormErrors;
  let buildProfileInput: (form: ProfileFormData, initialData?: UserProfile) => CreateProfileInput;

  beforeAll(async () => {
    const m = await import('../profileFormTypes');
    initFormData = m.initFormData;
    validateForm = m.validateForm;
    buildProfileInput = m.buildProfileInput;
  });

  // ─── initFormData ───────────────────────────────────────────────

  describe('initFormData', () => {
    it('returns empty form when no profile provided', () => {
      const result = initFormData();
      expect(result.firstName).toBe('');
      expect(result.lastName).toBe('');
      expect(result.nationality).toBe('South African');
      expect(result.gender).toBe('');
    });

    it('populates from existing profile', () => {
      const result = initFormData(MOCK_PROFILE);
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Smith');
      expect(result.middleName).toBe('William');
      expect(result.email).toBe('john@example.com');
      expect(result.saIdNumber).toBe(VALID_SA_ID);
    });

    it('defaults optional fields to empty string', () => {
      const minProfile = {
        ...MOCK_PROFILE,
        middleName: undefined,
        maidenName: undefined,
        gender: undefined,
        employer: undefined,
      };
      const result = initFormData(minProfile);
      expect(result.middleName).toBe('');
      expect(result.maidenName).toBe('');
      expect(result.gender).toBe('');
      expect(result.employer).toBe('');
    });
  });

  // ─── validateForm ─────────────────────────────────────────────────

  describe('validateForm', () => {
    const baseForm: ProfileFormData = {
      firstName: 'John',
      middleName: '',
      lastName: 'Smith',
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

    it('passes with minimal valid data', () => {
      const errors = validateForm(baseForm);
      expect(Object.keys(errors)).toHaveLength(0);
    });

    it('requires first name', () => {
      const errors = validateForm({ ...baseForm, firstName: '' });
      expect(errors.firstName).toBeDefined();
    });

    it('requires last name', () => {
      const errors = validateForm({ ...baseForm, lastName: '  ' });
      expect(errors.lastName).toBeDefined();
    });

    it('validates email format when provided', () => {
      const errors = validateForm({ ...baseForm, email: 'not-an-email' });
      expect(errors.email).toBeDefined();
    });

    it('accepts valid email', () => {
      const errors = validateForm({ ...baseForm, email: 'john@example.com' });
      expect(errors.email).toBeUndefined();
    });

    it('validates SA phone format', () => {
      const errors = validateForm({ ...baseForm, phoneMobile: '123' });
      expect(errors.phoneMobile).toBeDefined();
    });

    it('accepts valid SA phone with 0 prefix', () => {
      const errors = validateForm({ ...baseForm, phoneMobile: '0821234567' });
      expect(errors.phoneMobile).toBeUndefined();
    });

    it('accepts valid SA phone with +27 prefix', () => {
      const errors = validateForm({ ...baseForm, phoneMobile: '+27821234567' });
      expect(errors.phoneMobile).toBeUndefined();
    });

    it('validates SA ID when provided', () => {
      const errors = validateForm({ ...baseForm, saIdNumber: '1234567890123' });
      expect(errors.saIdNumber).toBeDefined();
    });

    it('accepts valid SA ID', () => {
      const errors = validateForm({ ...baseForm, saIdNumber: VALID_SA_ID });
      expect(errors.saIdNumber).toBeUndefined();
    });

    it('skips validation for empty optional fields', () => {
      const errors = validateForm(baseForm);
      expect(errors.email).toBeUndefined();
      expect(errors.phoneMobile).toBeUndefined();
      expect(errors.saIdNumber).toBeUndefined();
    });
  });

  // ─── buildProfileInput ────────────────────────────────────────────

  describe('buildProfileInput', () => {
    const filledForm: ProfileFormData = {
      firstName: ' John ',
      middleName: ' William ',
      lastName: ' Smith ',
      maidenName: '',
      dateOfBirth: '1992-02-20',
      gender: 'male',
      nationality: 'South African',
      maritalStatus: 'single',
      saIdNumber: VALID_SA_ID,
      citizenship: 'citizen',
      email: ' john@example.com ',
      phoneMobile: ' 0821234567 ',
      phoneWork: '',
      employer: 'Acme Corp',
      jobTitle: 'Engineer',
      industry: 'Technology',
    };

    it('trims string fields', () => {
      const result = buildProfileInput(filledForm);
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Smith');
      expect(result.email).toBe('john@example.com');
    });

    it('includes optional fields when filled', () => {
      const result = buildProfileInput(filledForm);
      expect(result.middleName).toBe('William');
      expect(result.gender).toBe('male');
      expect(result.employer).toBe('Acme Corp');
    });

    it('excludes optional fields when empty', () => {
      const result = buildProfileInput(filledForm);
      expect(result.maidenName).toBeUndefined();
      expect(result.phoneWork).toBeUndefined();
    });

    it('sets isPrimary true for new profiles', () => {
      const result = buildProfileInput(filledForm);
      expect(result.isPrimary).toBe(true);
    });

    it('preserves existing profile ID when editing', () => {
      const result = buildProfileInput(filledForm, MOCK_PROFILE);
      expect(result.id).toBe('test-id-123');
    });

    it('defaults nationality to South African', () => {
      const result = buildProfileInput({ ...filledForm, nationality: '' });
      expect(result.nationality).toBe('South African');
    });
  });
});
