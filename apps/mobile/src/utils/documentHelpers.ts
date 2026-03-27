/**
 * Utility functions for identity document management.
 *
 * Provides document type metadata (labels, icons, categories),
 * expiry date checking, and document number masking.
 */

import type { DocumentType } from '@fillit/shared';

// ---------------------------------------------------------------------------
// Document type metadata
// ---------------------------------------------------------------------------

/** Ionicons icon name associated with a document type */
export type DocumentIconName = string;

/** Metadata for a single document type */
export interface DocumentTypeMeta {
  readonly label: string;
  readonly icon: DocumentIconName;
  readonly category: DocumentCategory;
}

/** Categories for grouping document types in the picker */
export type DocumentCategory =
  | 'Core ID'
  | 'Driving'
  | 'Tax & Finance'
  | 'Medical'
  | 'Vehicle'
  | 'Work'
  | 'Education'
  | 'Government'
  | 'Custom';

/** Full metadata map keyed by DocumentType */
export const DOCUMENT_TYPE_META: Record<DocumentType, DocumentTypeMeta> = {
  sa_id_book: {
    label: 'SA ID Book',
    icon: 'book-outline',
    category: 'Core ID',
  },
  sa_smart_id: {
    label: 'Smart ID Card',
    icon: 'card-outline',
    category: 'Core ID',
  },
  passport: {
    label: 'Passport',
    icon: 'earth-outline',
    category: 'Core ID',
  },
  drivers_license: {
    label: "Driver's License",
    icon: 'car-outline',
    category: 'Driving',
  },
  prdp: {
    label: 'PrDP',
    icon: 'bus-outline',
    category: 'Driving',
  },
  tax_number: {
    label: 'Tax Number',
    icon: 'receipt-outline',
    category: 'Tax & Finance',
  },
  bank_account: {
    label: 'Bank Account',
    icon: 'wallet-outline',
    category: 'Tax & Finance',
  },
  medical_aid: {
    label: 'Medical Aid',
    icon: 'medkit-outline',
    category: 'Medical',
  },
  hospital_plan: {
    label: 'Hospital Plan',
    icon: 'medical-outline',
    category: 'Medical',
  },
  vehicle_registration: {
    label: 'Vehicle Registration',
    icon: 'car-sport-outline',
    category: 'Vehicle',
  },
  license_disc: {
    label: 'License Disc',
    icon: 'disc-outline',
    category: 'Vehicle',
  },
  work_permit: {
    label: 'Work Permit',
    icon: 'briefcase-outline',
    category: 'Work',
  },
  refugee_permit: {
    label: 'Refugee Permit',
    icon: 'people-outline',
    category: 'Work',
  },
  asylum_seeker_permit: {
    label: 'Asylum Seeker Permit',
    icon: 'shield-outline',
    category: 'Work',
  },
  matric_certificate: {
    label: 'Matric Certificate',
    icon: 'school-outline',
    category: 'Education',
  },
  degree_diploma: {
    label: 'Degree / Diploma',
    icon: 'ribbon-outline',
    category: 'Education',
  },
  student_card: {
    label: 'Student Card',
    icon: 'id-card-outline',
    category: 'Education',
  },
  hpcsa: {
    label: 'HPCSA',
    icon: 'fitness-outline',
    category: 'Education',
  },
  sacap: {
    label: 'SACAP',
    icon: 'construct-outline',
    category: 'Education',
  },
  ecsa: {
    label: 'ECSA',
    icon: 'build-outline',
    category: 'Education',
  },
  saica: {
    label: 'SAICA',
    icon: 'calculator-outline',
    category: 'Education',
  },
  law_society: {
    label: 'Law Society',
    icon: 'scale-outline',
    category: 'Education',
  },
  sace: {
    label: 'SACE',
    icon: 'book-outline',
    category: 'Education',
  },
  birth_certificate: {
    label: 'Birth Certificate',
    icon: 'document-text-outline',
    category: 'Government',
  },
  marriage_certificate: {
    label: 'Marriage Certificate',
    icon: 'heart-outline',
    category: 'Government',
  },
  coida: {
    label: 'COIDA',
    icon: 'shield-checkmark-outline',
    category: 'Government',
  },
  uif_number: {
    label: 'UIF Number',
    icon: 'cash-outline',
    category: 'Government',
  },
  custom: {
    label: 'Custom',
    icon: 'create-outline',
    category: 'Custom',
  },
};

// ---------------------------------------------------------------------------
// Grouped document types for the picker
// ---------------------------------------------------------------------------

/** A group of document types under a category heading */
export interface DocumentTypeGroup {
  readonly category: DocumentCategory;
  readonly types: DocumentType[];
}

/** Order of categories in the picker */
const CATEGORY_ORDER: readonly DocumentCategory[] = [
  'Core ID',
  'Driving',
  'Tax & Finance',
  'Medical',
  'Vehicle',
  'Work',
  'Education',
  'Government',
  'Custom',
];

/** Returns document types grouped by category, in display order */
export function getDocumentTypeGroups(): DocumentTypeGroup[] {
  const groups = new Map<DocumentCategory, DocumentType[]>();

  for (const [docType, meta] of Object.entries(DOCUMENT_TYPE_META)) {
    const existing = groups.get(meta.category) ?? [];
    existing.push(docType as DocumentType);
    groups.set(meta.category, existing);
  }

  return CATEGORY_ORDER.filter((cat) => groups.has(cat)).map((cat) => ({
    category: cat,
    types: groups.get(cat)!,
  }));
}

// ---------------------------------------------------------------------------
// Label helper
// ---------------------------------------------------------------------------

/** Get the human-readable label for a document type */
export function getDocumentTypeLabel(type: DocumentType): string {
  return DOCUMENT_TYPE_META[type]?.label ?? type;
}

/** Get the icon name for a document type */
export function getDocumentTypeIcon(type: DocumentType): string {
  return DOCUMENT_TYPE_META[type]?.icon ?? 'document-outline';
}

// ---------------------------------------------------------------------------
// Expiry checking
// ---------------------------------------------------------------------------

/** Result of checking a document's expiry status */
export type ExpiryStatus = 'valid' | 'expiring_soon' | 'expired' | 'none';

/**
 * Check the expiry status of a document.
 *
 * @param expiryDate - ISO date string (YYYY-MM-DD) or undefined
 * @param now - Current date (defaults to new Date())
 * @param warningDays - Days before expiry to flag as "expiring soon" (default 30)
 * @returns ExpiryStatus
 */
export function checkExpiryStatus(
  expiryDate: string | undefined,
  now: Date = new Date(),
  warningDays: number = 30,
): ExpiryStatus {
  if (!expiryDate) return 'none';

  const expiry = new Date(expiryDate + 'T00:00:00');
  if (isNaN(expiry.getTime())) return 'none';

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const expiryDay = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());

  if (expiryDay < today) return 'expired';

  const diffMs = expiryDay.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= warningDays) return 'expiring_soon';

  return 'valid';
}

/**
 * Get a human-readable label for an expiry status.
 */
export function getExpiryLabel(status: ExpiryStatus): string {
  switch (status) {
    case 'expired':
      return 'Expired';
    case 'expiring_soon':
      return 'Expiring Soon';
    case 'valid':
      return 'Valid';
    case 'none':
      return '';
  }
}

// ---------------------------------------------------------------------------
// Document number masking
// ---------------------------------------------------------------------------

/**
 * Mask a document number, showing only the last N characters.
 *
 * @param number - The document number to mask
 * @param visibleChars - Number of trailing characters to show (default 4)
 * @returns Masked string, e.g. "••••••5678"
 */
export function maskDocumentNumber(number: string, visibleChars: number = 4): string {
  if (!number) return '';
  if (number.length <= visibleChars) return number;

  const masked = '\u2022'.repeat(number.length - visibleChars);
  const visible = number.slice(-visibleChars);
  return masked + visible;
}
