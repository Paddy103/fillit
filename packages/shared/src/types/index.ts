/**
 * Core type definitions for the FillIt application.
 * Shared between mobile and server packages.
 */

// Profile & address types (S-08)
export {
  type Address,
  type Citizenship,
  type DocumentType,
  type EmergencyContact,
  type Gender,
  type IdentityDocument,
  type MaritalStatus,
  type ProfessionalRegistration,
  type ProfileRelationship,
  type SignatureType,
  type StoredSignature,
  type UserProfile,
} from './profile.js';

// SA ID parse result (S-10)
export { type SAIdParseResult } from '../validation/sa-id.js';

export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  userId: string;
  title: string;
  status: DocumentStatus;
  pageCount: number;
  createdAt: string;
  updatedAt: string;
}

export type DocumentStatus = 'draft' | 'scanned' | 'detected' | 'filled' | 'signed' | 'exported';

export interface FormField {
  id: string;
  documentId: string;
  label: string;
  type: FormFieldType;
  value: string;
  confidence: number;
  boundingBox: BoundingBox;
}

export type FormFieldType =
  | 'text'
  | 'date'
  | 'number'
  | 'email'
  | 'phone'
  | 'signature'
  | 'checkbox';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
}
