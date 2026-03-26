/**
 * Profile CRUD operations for the FillIt SQLite database.
 *
 * Provides create, read, update, and delete operations for user profiles
 * and all associated child entities (addresses, identity documents,
 * professional registrations, emergency contacts).
 *
 * Sensitive fields (SA ID number, document numbers, registration numbers,
 * additional document fields) are encrypted at rest using AES-256-GCM
 * via the encryption module.
 */

import type {
  Address,
  Citizenship,
  EmergencyContact,
  Gender,
  IdentityDocument,
  MaritalStatus,
  ProfessionalRegistration,
  ProfileRelationship,
  UserProfile,
} from '@fillit/shared';

import { encrypt, decrypt } from '../../utils/encryption';
import { getAll, getFirst, runQuery, withTransaction } from './database';
import { QueryError } from './databaseErrors';

// ─── Internal DB Row Types ──────────────────────────────────────────

/** Raw profile row as stored in SQLite. */
interface ProfileRow {
  id: string;
  is_primary: number;
  relationship: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  maiden_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  nationality: string | null;
  marital_status: string | null;
  sa_id_number_encrypted: string | null;
  citizenship: string | null;
  email: string | null;
  phone_mobile: string | null;
  phone_work: string | null;
  employer: string | null;
  job_title: string | null;
  work_phone: string | null;
  employee_number: string | null;
  industry: string | null;
  highest_qualification: string | null;
  institution: string | null;
  year_completed: number | null;
  student_number: string | null;
  created_at: string;
  updated_at: string;
}

/** Raw address row as stored in SQLite. */
interface AddressRow {
  id: string;
  profile_id: string;
  label: string;
  street1: string;
  street2: string | null;
  suburb: string | null;
  city: string;
  province: string;
  postal_code: string;
  country: string | null;
  is_default: number;
}

/** Raw identity document row as stored in SQLite. */
interface IdentityDocumentRow {
  id: string;
  profile_id: string;
  type: string;
  label: string;
  encrypted_number: string;
  issue_date: string | null;
  expiry_date: string | null;
  issuing_authority: string | null;
  additional_fields_encrypted: string | null;
}

/** Raw professional registration row as stored in SQLite. */
interface ProfessionalRegistrationRow {
  id: string;
  profile_id: string;
  body: string;
  registration_number_encrypted: string;
  expiry_date: string | null;
}

/** Raw emergency contact row as stored in SQLite. */
interface EmergencyContactRow {
  id: string;
  profile_id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string | null;
  address_json: string | null;
}

// ─── Input types for create/update ──────────────────────────────────

/** Input for creating a new profile. Omit auto-generated fields. */
export type CreateProfileInput = Omit<
  UserProfile,
  | 'createdAt'
  | 'updatedAt'
  | 'addresses'
  | 'documents'
  | 'professionalRegistrations'
  | 'emergencyContacts'
  | 'signatures'
>;

/** Input for updating an existing profile. All fields optional except id. */
export type UpdateProfileInput = Partial<
  Omit<
    UserProfile,
    | 'id'
    | 'createdAt'
    | 'updatedAt'
    | 'addresses'
    | 'documents'
    | 'professionalRegistrations'
    | 'emergencyContacts'
    | 'signatures'
  >
>;

/** Input for creating a new address. */
export type CreateAddressInput = Omit<Address, 'id'> & { id?: string };

/** Input for updating an existing address. All fields optional except id. */
export type UpdateAddressInput = Partial<Omit<Address, 'id'>>;

/** Input for creating a new identity document. */
export type CreateIdentityDocumentInput = Omit<IdentityDocument, 'id'> & { id?: string };

/** Input for updating an existing identity document. */
export type UpdateIdentityDocumentInput = Partial<Omit<IdentityDocument, 'id'>>;

/** Input for creating a new professional registration. */
export type CreateProfessionalRegistrationInput = Omit<ProfessionalRegistration, 'id'> & {
  id?: string;
};

/** Input for updating an existing professional registration. */
export type UpdateProfessionalRegistrationInput = Partial<Omit<ProfessionalRegistration, 'id'>>;

/** Input for creating a new emergency contact. */
export type CreateEmergencyContactInput = Omit<EmergencyContact, 'id'> & { id?: string };

/** Input for updating an existing emergency contact. */
export type UpdateEmergencyContactInput = Partial<Omit<EmergencyContact, 'id'>>;

// ─── UUID Generation ────────────────────────────────────────────────

/** Generate a UUID v4. Uses crypto.randomUUID when available. */
function generateId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── Row Mappers ────────────────────────────────────────────────────

/** Convert nullable DB values to undefined for optional model fields */
function orUndefined<T>(value: T | null): T | undefined {
  return value ?? undefined;
}

/** Map personal details from a profile row */
function mapPersonalDetails(
  row: ProfileRow,
): Pick<
  UserProfile,
  | 'relationship'
  | 'middleName'
  | 'maidenName'
  | 'dateOfBirth'
  | 'gender'
  | 'nationality'
  | 'maritalStatus'
  | 'citizenship'
> {
  return {
    relationship: orUndefined(row.relationship) as ProfileRelationship | undefined,
    middleName: orUndefined(row.middle_name),
    maidenName: orUndefined(row.maiden_name),
    dateOfBirth: row.date_of_birth ?? '',
    gender: orUndefined(row.gender) as Gender | undefined,
    nationality: row.nationality ?? 'South African',
    maritalStatus: orUndefined(row.marital_status) as MaritalStatus | undefined,
    citizenship: orUndefined(row.citizenship) as Citizenship | undefined,
  };
}

/** Map contact and employment details from a profile row */
function mapContactAndEmployment(
  row: ProfileRow,
): Pick<
  UserProfile,
  | 'email'
  | 'phoneMobile'
  | 'phoneWork'
  | 'employer'
  | 'jobTitle'
  | 'workPhone'
  | 'employeeNumber'
  | 'industry'
  | 'highestQualification'
  | 'institution'
  | 'yearCompleted'
  | 'studentNumber'
> {
  return {
    email: row.email ?? '',
    phoneMobile: row.phone_mobile ?? '',
    phoneWork: orUndefined(row.phone_work),
    employer: orUndefined(row.employer),
    jobTitle: orUndefined(row.job_title),
    workPhone: orUndefined(row.work_phone),
    employeeNumber: orUndefined(row.employee_number),
    industry: orUndefined(row.industry),
    highestQualification: orUndefined(row.highest_qualification),
    institution: orUndefined(row.institution),
    yearCompleted: orUndefined(row.year_completed),
    studentNumber: orUndefined(row.student_number),
  };
}

/** Convert a database row to a UserProfile (without child entities). */
async function profileRowToModel(row: ProfileRow): Promise<UserProfile> {
  const saIdNumber = row.sa_id_number_encrypted
    ? await decrypt(row.sa_id_number_encrypted)
    : undefined;

  return {
    id: row.id,
    isPrimary: row.is_primary === 1,
    firstName: row.first_name,
    lastName: row.last_name,
    saIdNumber,
    ...mapPersonalDetails(row),
    ...mapContactAndEmployment(row),
    addresses: [],
    documents: [],
    professionalRegistrations: [],
    emergencyContacts: [],
    signatures: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Convert a database row to an Address. */
function addressRowToModel(row: AddressRow): Address {
  return {
    id: row.id,
    label: row.label,
    street1: row.street1,
    street2: row.street2 ?? undefined,
    suburb: row.suburb ?? undefined,
    city: row.city,
    province: row.province,
    postalCode: row.postal_code,
    country: row.country ?? 'South Africa',
    isDefault: row.is_default === 1,
  };
}

/** Convert a database row to an IdentityDocument, decrypting sensitive fields. */
async function identityDocumentRowToModel(row: IdentityDocumentRow): Promise<IdentityDocument> {
  const number = await decrypt(row.encrypted_number);
  let additionalFields: Record<string, string> = {};
  if (row.additional_fields_encrypted) {
    const decryptedJson = await decrypt(row.additional_fields_encrypted);
    additionalFields = JSON.parse(decryptedJson) as Record<string, string>;
  }

  return {
    id: row.id,
    type: row.type as IdentityDocument['type'],
    label: row.label,
    number,
    issueDate: row.issue_date ?? undefined,
    expiryDate: row.expiry_date ?? undefined,
    issuingAuthority: row.issuing_authority ?? undefined,
    additionalFields,
  };
}

/** Convert a database row to a ProfessionalRegistration, decrypting number. */
async function professionalRegistrationRowToModel(
  row: ProfessionalRegistrationRow,
): Promise<ProfessionalRegistration> {
  const registrationNumber = await decrypt(row.registration_number_encrypted);

  return {
    id: row.id,
    body: row.body,
    registrationNumber,
    expiryDate: row.expiry_date ?? undefined,
  };
}

/** Convert a database row to an EmergencyContact. */
function emergencyContactRowToModel(row: EmergencyContactRow): EmergencyContact {
  return {
    id: row.id,
    firstName: row.name.split(' ')[0] ?? row.name,
    lastName: row.name.split(' ').slice(1).join(' ') || '',
    relationship: row.relationship,
    phoneMobile: row.phone,
    phoneWork: undefined,
    email: row.email ?? undefined,
  };
}

// ─── Profile CRUD ───────────────────────────────────────────────────

/**
 * Create a new user profile.
 *
 * Encrypts the SA ID number if provided. Does NOT create child entities
 * (addresses, documents, etc.) — use the dedicated functions for those.
 *
 * @param input - Profile data. The `id` field is used as-is; provide a UUID.
 * @returns The created profile with all child entity arrays empty.
 */
/** Convert undefined/empty to null for SQL parameter binding */
function toNull(value: string | number | undefined | null): string | number | null {
  if (value === undefined || value === '') return null;
  return value;
}

/**
 * Build the SQL parameter array for profile insertion.
 * Column order: id, is_primary, relationship, first_name, middle_name,
 * last_name, maiden_name, date_of_birth, gender, nationality, marital_status,
 * sa_id_number_encrypted, citizenship, email, phone_mobile, phone_work,
 * employer, job_title, work_phone, employee_number, industry,
 * highest_qualification, institution, year_completed, student_number,
 * created_at, updated_at
 */
function buildCreateProfileParams(
  id: string,
  input: CreateProfileInput,
  saIdEncrypted: string | null,
  now: string,
): (string | number | null)[] {
  const n = toNull;
  return [
    id,
    input.isPrimary ? 1 : 0,
    n(input.relationship),
    input.firstName,
    n(input.middleName),
    input.lastName,
    n(input.maidenName),
    n(input.dateOfBirth),
    n(input.gender),
    input.nationality ?? 'South African',
    n(input.maritalStatus),
    saIdEncrypted,
    n(input.citizenship),
    n(input.email),
    n(input.phoneMobile),
    n(input.phoneWork),
    n(input.employer),
    n(input.jobTitle),
    n(input.workPhone),
    n(input.employeeNumber),
    n(input.industry),
    n(input.highestQualification),
    n(input.institution),
    n(input.yearCompleted),
    n(input.studentNumber),
    now,
    now,
  ];
}

export async function createProfile(input: CreateProfileInput): Promise<UserProfile> {
  const now = new Date().toISOString();
  const id = input.id || generateId();
  const saIdEncrypted = input.saIdNumber ? await encrypt(input.saIdNumber) : null;

  await runQuery(
    `INSERT INTO profiles (
      id, is_primary, relationship,
      first_name, middle_name, last_name, maiden_name,
      date_of_birth, gender, nationality, marital_status,
      sa_id_number_encrypted, citizenship,
      email, phone_mobile, phone_work,
      employer, job_title, work_phone, employee_number, industry,
      highest_qualification, institution, year_completed, student_number,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    buildCreateProfileParams(id, input, saIdEncrypted, now),
  );

  return {
    ...input,
    id,
    addresses: [],
    documents: [],
    professionalRegistrations: [],
    emergencyContacts: [],
    signatures: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Get a profile by ID, including all child entities.
 *
 * @param id - The profile ID.
 * @returns The full profile with all child entities, or `null` if not found.
 */
export async function getProfileById(id: string): Promise<UserProfile | null> {
  const row = await getFirst<ProfileRow>('SELECT * FROM profiles WHERE id = ?', [id]);
  if (!row) {
    return null;
  }

  const profile = await profileRowToModel(row);

  // Fetch child entities in parallel
  const [addressRows, identityDocRows, profRegRows, emergencyContactRows] = await Promise.all([
    getAll<AddressRow>('SELECT * FROM addresses WHERE profile_id = ? ORDER BY is_default DESC', [
      id,
    ]),
    getAll<IdentityDocumentRow>('SELECT * FROM identity_documents WHERE profile_id = ?', [id]),
    getAll<ProfessionalRegistrationRow>(
      'SELECT * FROM professional_registrations WHERE profile_id = ?',
      [id],
    ),
    getAll<EmergencyContactRow>('SELECT * FROM emergency_contacts WHERE profile_id = ?', [id]),
  ]);

  profile.addresses = addressRows.map(addressRowToModel);

  // Decrypt identity documents and professional registrations in parallel
  const [identityDocs, profRegs] = await Promise.all([
    Promise.all(identityDocRows.map(identityDocumentRowToModel)),
    Promise.all(profRegRows.map(professionalRegistrationRowToModel)),
  ]);

  profile.documents = identityDocs;
  profile.professionalRegistrations = profRegs;
  profile.emergencyContacts = emergencyContactRows.map(emergencyContactRowToModel);

  return profile;
}

/**
 * List all profiles (without child entities for performance).
 *
 * Use `getProfileById` for a full profile with all child entities.
 *
 * @returns An array of profiles with empty child entity arrays.
 */
export async function listProfiles(): Promise<UserProfile[]> {
  const rows = await getAll<ProfileRow>(
    'SELECT * FROM profiles ORDER BY is_primary DESC, first_name ASC',
  );

  return Promise.all(rows.map(profileRowToModel));
}

/**
 * Get the primary user profile, if one exists.
 *
 * @returns The primary profile with all child entities, or `null` if no primary exists.
 */
export async function getPrimaryProfile(): Promise<UserProfile | null> {
  const row = await getFirst<ProfileRow>('SELECT * FROM profiles WHERE is_primary = 1');
  if (!row) {
    return null;
  }

  return getProfileById(row.id);
}

/**
 * Update a profile by ID.
 *
 * Only the provided fields are updated; unspecified fields remain unchanged.
 * Re-encrypts the SA ID number if it is being updated.
 *
 * @param id - The profile ID to update.
 * @param input - The fields to update.
 * @returns The updated profile with all child entities, or `null` if not found.
 */
export async function updateProfile(
  id: string,
  input: UpdateProfileInput,
): Promise<UserProfile | null> {
  // Verify profile exists
  const existing = await getFirst<ProfileRow>('SELECT id FROM profiles WHERE id = ?', [id]);
  if (!existing) {
    return null;
  }

  const setClauses: string[] = [];
  const params: (string | number | null)[] = [];

  // Build SET clause dynamically from provided fields
  const fieldMap: Record<string, { column: string; value: unknown }> = {
    isPrimary: {
      column: 'is_primary',
      value: input.isPrimary !== undefined ? (input.isPrimary ? 1 : 0) : undefined,
    },
    relationship: { column: 'relationship', value: input.relationship },
    firstName: { column: 'first_name', value: input.firstName },
    middleName: { column: 'middle_name', value: input.middleName },
    lastName: { column: 'last_name', value: input.lastName },
    maidenName: { column: 'maiden_name', value: input.maidenName },
    dateOfBirth: { column: 'date_of_birth', value: input.dateOfBirth },
    gender: { column: 'gender', value: input.gender },
    nationality: { column: 'nationality', value: input.nationality },
    maritalStatus: { column: 'marital_status', value: input.maritalStatus },
    citizenship: { column: 'citizenship', value: input.citizenship },
    email: { column: 'email', value: input.email },
    phoneMobile: { column: 'phone_mobile', value: input.phoneMobile },
    phoneWork: { column: 'phone_work', value: input.phoneWork },
    employer: { column: 'employer', value: input.employer },
    jobTitle: { column: 'job_title', value: input.jobTitle },
    workPhone: { column: 'work_phone', value: input.workPhone },
    employeeNumber: { column: 'employee_number', value: input.employeeNumber },
    industry: { column: 'industry', value: input.industry },
    highestQualification: { column: 'highest_qualification', value: input.highestQualification },
    institution: { column: 'institution', value: input.institution },
    yearCompleted: { column: 'year_completed', value: input.yearCompleted },
    studentNumber: { column: 'student_number', value: input.studentNumber },
  };

  for (const [key, mapping] of Object.entries(fieldMap)) {
    if (key in input && mapping.value !== undefined) {
      setClauses.push(`${mapping.column} = ?`);
      params.push(mapping.value as string | number | null);
    }
  }

  // Handle SA ID number encryption separately
  if ('saIdNumber' in input) {
    setClauses.push('sa_id_number_encrypted = ?');
    if (input.saIdNumber) {
      params.push(await encrypt(input.saIdNumber));
    } else {
      params.push(null);
    }
  }

  if (setClauses.length === 0) {
    // Nothing to update — return current profile
    return getProfileById(id);
  }

  // Always update the updated_at timestamp
  const now = new Date().toISOString();
  setClauses.push('updated_at = ?');
  params.push(now);

  params.push(id);
  await runQuery(`UPDATE profiles SET ${setClauses.join(', ')} WHERE id = ?`, params);

  return getProfileById(id);
}

/**
 * Delete a profile and all associated child entities.
 *
 * Uses CASCADE delete — addresses, identity documents, professional
 * registrations, emergency contacts, and signatures are all deleted
 * automatically by the database.
 *
 * @param id - The profile ID to delete.
 * @returns `true` if the profile was deleted, `false` if not found.
 */
export async function deleteProfile(id: string): Promise<boolean> {
  const result = await runQuery('DELETE FROM profiles WHERE id = ?', [id]);
  return result.changes > 0;
}

/**
 * Get the total count of profiles.
 */
export async function getProfileCount(): Promise<number> {
  const row = await getFirst<{ count: number }>('SELECT COUNT(*) as count FROM profiles');
  return row?.count ?? 0;
}

// ─── Address CRUD ───────────────────────────────────────────────────

/**
 * Add an address to a profile.
 *
 * If `isDefault` is `true` and other addresses exist for the profile,
 * their `isDefault` flag is cleared in a single transaction.
 *
 * @param profileId - The profile to add the address to.
 * @param input - Address data.
 * @returns The created address.
 */
export async function createAddress(
  profileId: string,
  input: CreateAddressInput,
): Promise<Address> {
  const id = input.id || generateId();
  const address: Address = { ...input, id };

  await withTransaction(async () => {
    // Clear existing default if this one is default
    if (input.isDefault) {
      await runQuery('UPDATE addresses SET is_default = 0 WHERE profile_id = ?', [profileId]);
    }

    await runQuery(
      `INSERT INTO addresses (
        id, profile_id, label, street1, street2, suburb, city, province, postal_code, country, is_default
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        profileId,
        input.label,
        input.street1,
        input.street2 ?? null,
        input.suburb ?? null,
        input.city,
        input.province,
        input.postalCode,
        input.country ?? 'South Africa',
        input.isDefault ? 1 : 0,
      ],
    );

    // Update profile's updated_at
    await runQuery('UPDATE profiles SET updated_at = ? WHERE id = ?', [
      new Date().toISOString(),
      profileId,
    ]);
  });

  return address;
}

/**
 * Get all addresses for a profile.
 */
export async function getAddressesByProfileId(profileId: string): Promise<Address[]> {
  const rows = await getAll<AddressRow>(
    'SELECT * FROM addresses WHERE profile_id = ? ORDER BY is_default DESC, label ASC',
    [profileId],
  );
  return rows.map(addressRowToModel);
}

/**
 * Update an address by ID.
 *
 * @param id - The address ID.
 * @param profileId - The owning profile ID (for default-flag management).
 * @param input - Fields to update.
 * @returns The updated address, or `null` if not found.
 */
export async function updateAddress(
  id: string,
  profileId: string,
  input: UpdateAddressInput,
): Promise<Address | null> {
  const existing = await getFirst<AddressRow>('SELECT * FROM addresses WHERE id = ?', [id]);
  if (!existing) {
    return null;
  }

  const setClauses: string[] = [];
  const params: (string | number | null)[] = [];

  const fieldMap: Record<string, { column: string; value: unknown }> = {
    label: { column: 'label', value: input.label },
    street1: { column: 'street1', value: input.street1 },
    street2: { column: 'street2', value: input.street2 },
    suburb: { column: 'suburb', value: input.suburb },
    city: { column: 'city', value: input.city },
    province: { column: 'province', value: input.province },
    postalCode: { column: 'postal_code', value: input.postalCode },
    country: { column: 'country', value: input.country },
    isDefault: {
      column: 'is_default',
      value: input.isDefault !== undefined ? (input.isDefault ? 1 : 0) : undefined,
    },
  };

  for (const [key, mapping] of Object.entries(fieldMap)) {
    if (key in input && mapping.value !== undefined) {
      setClauses.push(`${mapping.column} = ?`);
      params.push(mapping.value as string | number | null);
    }
  }

  if (setClauses.length === 0) {
    return addressRowToModel(existing);
  }

  await withTransaction(async () => {
    // Clear other defaults if setting this as default
    if (input.isDefault) {
      await runQuery('UPDATE addresses SET is_default = 0 WHERE profile_id = ? AND id != ?', [
        profileId,
        id,
      ]);
    }

    params.push(id);
    await runQuery(`UPDATE addresses SET ${setClauses.join(', ')} WHERE id = ?`, params);

    await runQuery('UPDATE profiles SET updated_at = ? WHERE id = ?', [
      new Date().toISOString(),
      profileId,
    ]);
  });

  const updated = await getFirst<AddressRow>('SELECT * FROM addresses WHERE id = ?', [id]);
  return updated ? addressRowToModel(updated) : null;
}

/**
 * Delete an address by ID.
 *
 * @returns `true` if deleted, `false` if not found.
 */
export async function deleteAddress(id: string, profileId: string): Promise<boolean> {
  const result = await runQuery('DELETE FROM addresses WHERE id = ?', [id]);
  if (result.changes > 0) {
    await runQuery('UPDATE profiles SET updated_at = ? WHERE id = ?', [
      new Date().toISOString(),
      profileId,
    ]);
    return true;
  }
  return false;
}

// ─── Identity Document CRUD ─────────────────────────────────────────

/**
 * Add an identity document to a profile.
 *
 * The document number and additional fields are encrypted at rest.
 *
 * @param profileId - The profile to add the document to.
 * @param input - Identity document data.
 * @returns The created identity document.
 */
export async function createIdentityDocument(
  profileId: string,
  input: CreateIdentityDocumentInput,
): Promise<IdentityDocument> {
  const id = input.id || generateId();
  const encryptedNumber = await encrypt(input.number);
  let additionalFieldsEncrypted: string | null = null;
  if (input.additionalFields && Object.keys(input.additionalFields).length > 0) {
    additionalFieldsEncrypted = await encrypt(JSON.stringify(input.additionalFields));
  }

  await withTransaction(async () => {
    await runQuery(
      `INSERT INTO identity_documents (
        id, profile_id, type, label, encrypted_number, issue_date, expiry_date,
        issuing_authority, additional_fields_encrypted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        profileId,
        input.type,
        input.label,
        encryptedNumber,
        input.issueDate ?? null,
        input.expiryDate ?? null,
        input.issuingAuthority ?? null,
        additionalFieldsEncrypted,
      ],
    );

    await runQuery('UPDATE profiles SET updated_at = ? WHERE id = ?', [
      new Date().toISOString(),
      profileId,
    ]);
  });

  return { ...input, id };
}

/**
 * Get all identity documents for a profile.
 */
export async function getIdentityDocumentsByProfileId(
  profileId: string,
): Promise<IdentityDocument[]> {
  const rows = await getAll<IdentityDocumentRow>(
    'SELECT * FROM identity_documents WHERE profile_id = ?',
    [profileId],
  );
  return Promise.all(rows.map(identityDocumentRowToModel));
}

/**
 * Update an identity document by ID.
 *
 * Re-encrypts number and additional fields if they are being updated.
 *
 * @returns The updated document, or `null` if not found.
 */
/** Build SET clauses for identity document update in profile context */
async function buildIdentityDocUpdateClauses(
  input: UpdateIdentityDocumentInput,
): Promise<{ setClauses: string[]; params: (string | number | null)[] }> {
  const setClauses: string[] = [];
  const params: (string | number | null)[] = [];

  // Direct string fields
  const directFields: Array<{ key: keyof UpdateIdentityDocumentInput; column: string }> = [
    { key: 'type', column: 'type' },
    { key: 'label', column: 'label' },
  ];
  for (const { key, column } of directFields) {
    if (key in input && input[key] !== undefined) {
      setClauses.push(`${column} = ?`);
      params.push(input[key] as string);
    }
  }

  if ('number' in input && input.number !== undefined) {
    setClauses.push('encrypted_number = ?');
    params.push(await encrypt(input.number));
  }

  // Nullable string fields
  const nullableFields: Array<{ key: keyof UpdateIdentityDocumentInput; column: string }> = [
    { key: 'issueDate', column: 'issue_date' },
    { key: 'expiryDate', column: 'expiry_date' },
    { key: 'issuingAuthority', column: 'issuing_authority' },
  ];
  for (const { key, column } of nullableFields) {
    if (key in input) {
      setClauses.push(`${column} = ?`);
      params.push((input[key] as string | undefined) ?? null);
    }
  }

  if ('additionalFields' in input) {
    setClauses.push('additional_fields_encrypted = ?');
    const fields = input.additionalFields;
    params.push(
      fields && Object.keys(fields).length > 0 ? await encrypt(JSON.stringify(fields)) : null,
    );
  }

  return { setClauses, params };
}

export async function updateIdentityDocument(
  id: string,
  profileId: string,
  input: UpdateIdentityDocumentInput,
): Promise<IdentityDocument | null> {
  const existing = await getFirst<IdentityDocumentRow>(
    'SELECT * FROM identity_documents WHERE id = ?',
    [id],
  );
  if (!existing) return null;

  const { setClauses, params } = await buildIdentityDocUpdateClauses(input);
  if (setClauses.length === 0) return identityDocumentRowToModel(existing);

  await withTransaction(async () => {
    params.push(id);
    await runQuery(`UPDATE identity_documents SET ${setClauses.join(', ')} WHERE id = ?`, params);
    await runQuery('UPDATE profiles SET updated_at = ? WHERE id = ?', [
      new Date().toISOString(),
      profileId,
    ]);
  });

  const updated = await getFirst<IdentityDocumentRow>(
    'SELECT * FROM identity_documents WHERE id = ?',
    [id],
  );
  return updated ? identityDocumentRowToModel(updated) : null;
}

/**
 * Delete an identity document by ID.
 *
 * @returns `true` if deleted, `false` if not found.
 */
export async function deleteIdentityDocument(id: string, profileId: string): Promise<boolean> {
  const result = await runQuery('DELETE FROM identity_documents WHERE id = ?', [id]);
  if (result.changes > 0) {
    await runQuery('UPDATE profiles SET updated_at = ? WHERE id = ?', [
      new Date().toISOString(),
      profileId,
    ]);
    return true;
  }
  return false;
}

// ─── Professional Registration CRUD ─────────────────────────────────

/**
 * Add a professional registration to a profile.
 *
 * The registration number is encrypted at rest.
 */
export async function createProfessionalRegistration(
  profileId: string,
  input: CreateProfessionalRegistrationInput,
): Promise<ProfessionalRegistration> {
  const id = input.id || generateId();
  const encryptedNumber = await encrypt(input.registrationNumber);

  await withTransaction(async () => {
    await runQuery(
      `INSERT INTO professional_registrations (
        id, profile_id, body, registration_number_encrypted, expiry_date
      ) VALUES (?, ?, ?, ?, ?)`,
      [id, profileId, input.body, encryptedNumber, input.expiryDate ?? null],
    );

    await runQuery('UPDATE profiles SET updated_at = ? WHERE id = ?', [
      new Date().toISOString(),
      profileId,
    ]);
  });

  return { ...input, id };
}

/**
 * Get all professional registrations for a profile.
 */
export async function getProfessionalRegistrationsByProfileId(
  profileId: string,
): Promise<ProfessionalRegistration[]> {
  const rows = await getAll<ProfessionalRegistrationRow>(
    'SELECT * FROM professional_registrations WHERE profile_id = ?',
    [profileId],
  );
  return Promise.all(rows.map(professionalRegistrationRowToModel));
}

/**
 * Update a professional registration by ID.
 *
 * Re-encrypts the registration number if it is being updated.
 *
 * @returns The updated registration, or `null` if not found.
 */
export async function updateProfessionalRegistration(
  id: string,
  profileId: string,
  input: UpdateProfessionalRegistrationInput,
): Promise<ProfessionalRegistration | null> {
  const existing = await getFirst<ProfessionalRegistrationRow>(
    'SELECT * FROM professional_registrations WHERE id = ?',
    [id],
  );
  if (!existing) {
    return null;
  }

  const setClauses: string[] = [];
  const params: (string | number | null)[] = [];

  if ('body' in input && input.body !== undefined) {
    setClauses.push('body = ?');
    params.push(input.body);
  }
  if ('registrationNumber' in input && input.registrationNumber !== undefined) {
    setClauses.push('registration_number_encrypted = ?');
    params.push(await encrypt(input.registrationNumber));
  }
  if ('expiryDate' in input) {
    setClauses.push('expiry_date = ?');
    params.push(input.expiryDate ?? null);
  }

  if (setClauses.length === 0) {
    return professionalRegistrationRowToModel(existing);
  }

  await withTransaction(async () => {
    params.push(id);
    await runQuery(
      `UPDATE professional_registrations SET ${setClauses.join(', ')} WHERE id = ?`,
      params,
    );

    await runQuery('UPDATE profiles SET updated_at = ? WHERE id = ?', [
      new Date().toISOString(),
      profileId,
    ]);
  });

  const updated = await getFirst<ProfessionalRegistrationRow>(
    'SELECT * FROM professional_registrations WHERE id = ?',
    [id],
  );
  return updated ? professionalRegistrationRowToModel(updated) : null;
}

/**
 * Delete a professional registration by ID.
 *
 * @returns `true` if deleted, `false` if not found.
 */
export async function deleteProfessionalRegistration(
  id: string,
  profileId: string,
): Promise<boolean> {
  const result = await runQuery('DELETE FROM professional_registrations WHERE id = ?', [id]);
  if (result.changes > 0) {
    await runQuery('UPDATE profiles SET updated_at = ? WHERE id = ?', [
      new Date().toISOString(),
      profileId,
    ]);
    return true;
  }
  return false;
}

// ─── Emergency Contact CRUD ─────────────────────────────────────────

/**
 * Add an emergency contact to a profile.
 *
 * The database schema stores a single `name` column; this function
 * concatenates `firstName` and `lastName` from the shared type.
 * Maximum of 2 emergency contacts per profile is enforced.
 *
 * @throws {QueryError} If the profile already has 2 emergency contacts.
 */
export async function createEmergencyContact(
  profileId: string,
  input: CreateEmergencyContactInput,
): Promise<EmergencyContact> {
  // Enforce max 2 emergency contacts
  const countRow = await getFirst<{ count: number }>(
    'SELECT COUNT(*) as count FROM emergency_contacts WHERE profile_id = ?',
    [profileId],
  );
  if (countRow && countRow.count >= 2) {
    throw new QueryError('Maximum of 2 emergency contacts per profile');
  }

  const id = input.id || generateId();
  const fullName = [input.firstName, input.lastName].filter(Boolean).join(' ');

  await withTransaction(async () => {
    await runQuery(
      `INSERT INTO emergency_contacts (
        id, profile_id, name, relationship, phone, email, address_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        profileId,
        fullName,
        input.relationship,
        input.phoneMobile,
        input.email ?? null,
        null, // address_json not used in current schema
      ],
    );

    await runQuery('UPDATE profiles SET updated_at = ? WHERE id = ?', [
      new Date().toISOString(),
      profileId,
    ]);
  });

  return { ...input, id };
}

/**
 * Get all emergency contacts for a profile.
 */
export async function getEmergencyContactsByProfileId(
  profileId: string,
): Promise<EmergencyContact[]> {
  const rows = await getAll<EmergencyContactRow>(
    'SELECT * FROM emergency_contacts WHERE profile_id = ?',
    [profileId],
  );
  return rows.map(emergencyContactRowToModel);
}

/**
 * Update an emergency contact by ID.
 *
 * @returns The updated contact, or `null` if not found.
 */
/** Build SET clauses for emergency contact update */
function buildEmergencyContactUpdateClauses(
  input: UpdateEmergencyContactInput,
  existingName: string,
): { setClauses: string[]; params: (string | number | null)[] } {
  const setClauses: string[] = [];
  const params: (string | number | null)[] = [];

  if ('firstName' in input || 'lastName' in input) {
    const currentFirstName = existingName.split(' ')[0] ?? '';
    const currentLastName = existingName.split(' ').slice(1).join(' ') || '';
    const fullName = [input.firstName ?? currentFirstName, input.lastName ?? currentLastName]
      .filter(Boolean)
      .join(' ');
    setClauses.push('name = ?');
    params.push(fullName);
  }

  if ('relationship' in input && input.relationship !== undefined) {
    setClauses.push('relationship = ?');
    params.push(input.relationship);
  }
  if ('phoneMobile' in input && input.phoneMobile !== undefined) {
    setClauses.push('phone = ?');
    params.push(input.phoneMobile);
  }
  if ('email' in input) {
    setClauses.push('email = ?');
    params.push(input.email ?? null);
  }

  return { setClauses, params };
}

export async function updateEmergencyContact(
  id: string,
  profileId: string,
  input: UpdateEmergencyContactInput,
): Promise<EmergencyContact | null> {
  const existing = await getFirst<EmergencyContactRow>(
    'SELECT * FROM emergency_contacts WHERE id = ?',
    [id],
  );
  if (!existing) return null;

  const { setClauses, params } = buildEmergencyContactUpdateClauses(input, existing.name);
  if (setClauses.length === 0) return emergencyContactRowToModel(existing);

  await withTransaction(async () => {
    params.push(id);
    await runQuery(`UPDATE emergency_contacts SET ${setClauses.join(', ')} WHERE id = ?`, params);
    await runQuery('UPDATE profiles SET updated_at = ? WHERE id = ?', [
      new Date().toISOString(),
      profileId,
    ]);
  });

  const updated = await getFirst<EmergencyContactRow>(
    'SELECT * FROM emergency_contacts WHERE id = ?',
    [id],
  );
  return updated ? emergencyContactRowToModel(updated) : null;
}

/**
 * Delete an emergency contact by ID.
 *
 * @returns `true` if deleted, `false` if not found.
 */
export async function deleteEmergencyContact(id: string, profileId: string): Promise<boolean> {
  const result = await runQuery('DELETE FROM emergency_contacts WHERE id = ?', [id]);
  if (result.changes > 0) {
    await runQuery('UPDATE profiles SET updated_at = ? WHERE id = ?', [
      new Date().toISOString(),
      profileId,
    ]);
    return true;
  }
  return false;
}

// ─── Full Profile with all child entities ───────────────────────────

/**
 * Create a full profile with all child entities in a single transaction.
 *
 * This is a convenience method that creates the profile and all its
 * associated addresses, identity documents, professional registrations,
 * and emergency contacts.
 *
 * @param profile - The full profile data including all child entities.
 * @returns The created profile with all child entities.
 */
export async function createFullProfile(
  profile: Omit<UserProfile, 'createdAt' | 'updatedAt' | 'signatures'>,
): Promise<UserProfile> {
  const createdProfile = await createProfile({
    id: profile.id,
    isPrimary: profile.isPrimary,
    relationship: profile.relationship,
    firstName: profile.firstName,
    middleName: profile.middleName,
    lastName: profile.lastName,
    maidenName: profile.maidenName,
    dateOfBirth: profile.dateOfBirth,
    gender: profile.gender,
    nationality: profile.nationality,
    maritalStatus: profile.maritalStatus,
    saIdNumber: profile.saIdNumber,
    citizenship: profile.citizenship,
    email: profile.email,
    phoneMobile: profile.phoneMobile,
    phoneWork: profile.phoneWork,
    employer: profile.employer,
    jobTitle: profile.jobTitle,
    workPhone: profile.workPhone,
    workAddress: profile.workAddress,
    employeeNumber: profile.employeeNumber,
    industry: profile.industry,
    highestQualification: profile.highestQualification,
    institution: profile.institution,
    yearCompleted: profile.yearCompleted,
    studentNumber: profile.studentNumber,
  });

  // Create child entities
  const addresses = await Promise.all(
    profile.addresses.map((addr: CreateAddressInput) => createAddress(createdProfile.id, addr)),
  );

  const documents = await Promise.all(
    profile.documents.map((doc: CreateIdentityDocumentInput) =>
      createIdentityDocument(createdProfile.id, doc),
    ),
  );

  const professionalRegistrations = await Promise.all(
    profile.professionalRegistrations.map((reg: CreateProfessionalRegistrationInput) =>
      createProfessionalRegistration(createdProfile.id, reg),
    ),
  );

  // Emergency contacts have a max of 2, enforce by slicing
  const emergencyContacts = await Promise.all(
    profile.emergencyContacts
      .slice(0, 2)
      .map((ec: CreateEmergencyContactInput) => createEmergencyContact(createdProfile.id, ec)),
  );

  return {
    ...createdProfile,
    addresses,
    documents,
    professionalRegistrations,
    emergencyContacts,
  };
}
