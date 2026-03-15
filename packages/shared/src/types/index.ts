/**
 * Core type definitions for the FillIt application.
 * Shared between mobile and server packages.
 */

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

export type DocumentStatus =
  | 'draft'
  | 'scanned'
  | 'detected'
  | 'filled'
  | 'signed'
  | 'exported';

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

export interface UserProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  idNumber: string;
  address: Address;
}

export interface Address {
  street: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
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
