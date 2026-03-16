/**
 * Profile and address type definitions for the FillIt application.
 *
 * These interfaces define the user profile data model including
 * identity, contact, employment, education, and SA-specific fields.
 */

// ─── Enums / Union Types ────────────────────────────────────────────

export type Gender = 'male' | 'female' | 'other';

export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed' | 'other';

export type Citizenship = 'citizen' | 'permanent_resident';

export type ProfileRelationship = 'spouse' | 'child' | 'parent' | 'other';

// ─── Address ────────────────────────────────────────────────────────

export interface Address {
  id: string;
  label: string;
  street1: string;
  street2?: string;
  suburb?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

// ─── Emergency Contact ──────────────────────────────────────────────

export interface EmergencyContact {
  id: string;
  firstName: string;
  lastName: string;
  relationship: string;
  phoneMobile: string;
  phoneWork?: string;
  email?: string;
}

// ─── Professional Registration ──────────────────────────────────────

export interface ProfessionalRegistration {
  id: string;
  body: string;
  registrationNumber: string;
  expiryDate?: string;
}

// ─── Identity Document ──────────────────────────────────────────────

export type DocumentType =
  | 'sa_id_book'
  | 'sa_smart_id'
  | 'passport'
  | 'drivers_license'
  | 'prdp'
  | 'tax_number'
  | 'bank_account'
  | 'medical_aid'
  | 'hospital_plan'
  | 'vehicle_registration'
  | 'license_disc'
  | 'work_permit'
  | 'refugee_permit'
  | 'asylum_seeker_permit'
  | 'matric_certificate'
  | 'degree_diploma'
  | 'student_card'
  | 'hpcsa'
  | 'sacap'
  | 'ecsa'
  | 'saica'
  | 'law_society'
  | 'sace'
  | 'birth_certificate'
  | 'marriage_certificate'
  | 'coida'
  | 'uif_number'
  | 'custom';

export interface IdentityDocument {
  id: string;
  type: DocumentType;
  label: string;
  number: string;
  issueDate?: string;
  expiryDate?: string;
  issuingAuthority?: string;
  additionalFields: Record<string, string>;
}

// ─── Stored Signature ───────────────────────────────────────────────

export type SignatureType = 'drawn' | 'typed';

export interface StoredSignature {
  id: string;
  profileId: string;
  type: SignatureType;
  label: string;
  imageUri?: string;
  svgPath?: string;
  text?: string;
  fontFamily?: string;
  createdAt: string;
  isDefault: boolean;
}

// ─── User Profile ───────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  isPrimary: boolean;
  relationship?: ProfileRelationship;

  // Basic identity
  firstName: string;
  middleName?: string;
  lastName: string;
  maidenName?: string;
  dateOfBirth: string;
  gender?: Gender;
  nationality: string;
  maritalStatus?: MaritalStatus;

  // SA-specific
  saIdNumber?: string;
  citizenship?: Citizenship;

  // Contact
  email: string;
  phoneMobile: string;
  phoneWork?: string;
  addresses: Address[];

  // Employment
  employer?: string;
  jobTitle?: string;
  workPhone?: string;
  workAddress?: Address;
  employeeNumber?: string;
  industry?: string;

  // Education
  highestQualification?: string;
  institution?: string;
  yearCompleted?: number;
  studentNumber?: string;

  // Professional registrations
  professionalRegistrations: ProfessionalRegistration[];

  // Identity documents
  documents: IdentityDocument[];

  // Emergency contacts (max 2)
  emergencyContacts: EmergencyContact[];

  // Signatures
  signatures: StoredSignature[];

  // Metadata
  createdAt: string;
  updatedAt: string;
}
