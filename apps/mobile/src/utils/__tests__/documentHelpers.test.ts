import { describe, it, expect } from 'vitest';
import type { DocumentType } from '@fillit/shared';
import {
  getDocumentTypeLabel,
  getDocumentTypeIcon,
  getDocumentTypeGroups,
  checkExpiryStatus,
  getExpiryLabel,
  maskDocumentNumber,
  DOCUMENT_TYPE_META,
} from '../documentHelpers';

// ---------------------------------------------------------------------------
// getDocumentTypeLabel
// ---------------------------------------------------------------------------

describe('getDocumentTypeLabel', () => {
  it('returns label for known document types', () => {
    expect(getDocumentTypeLabel('sa_id_book')).toBe('SA ID Book');
    expect(getDocumentTypeLabel('passport')).toBe('Passport');
    expect(getDocumentTypeLabel('drivers_license')).toBe("Driver's License");
    expect(getDocumentTypeLabel('tax_number')).toBe('Tax Number');
    expect(getDocumentTypeLabel('medical_aid')).toBe('Medical Aid');
    expect(getDocumentTypeLabel('custom')).toBe('Custom');
  });

  it('returns the type string for unknown types', () => {
    expect(getDocumentTypeLabel('unknown_type' as DocumentType)).toBe('unknown_type');
  });
});

// ---------------------------------------------------------------------------
// getDocumentTypeIcon
// ---------------------------------------------------------------------------

describe('getDocumentTypeIcon', () => {
  it('returns icon for known types', () => {
    expect(getDocumentTypeIcon('passport')).toBe('earth-outline');
    expect(getDocumentTypeIcon('sa_smart_id')).toBe('card-outline');
  });

  it('returns fallback icon for unknown types', () => {
    expect(getDocumentTypeIcon('unknown_type' as DocumentType)).toBe('document-outline');
  });
});

// ---------------------------------------------------------------------------
// getDocumentTypeGroups
// ---------------------------------------------------------------------------

describe('getDocumentTypeGroups', () => {
  it('returns groups in correct order', () => {
    const groups = getDocumentTypeGroups();
    const categories = groups.map((g) => g.category);
    expect(categories[0]).toBe('Core ID');
    expect(categories[1]).toBe('Driving');
    expect(categories[2]).toBe('Tax & Finance');
  });

  it('includes all document types across groups', () => {
    const groups = getDocumentTypeGroups();
    const allTypes = groups.flatMap((g) => g.types);
    const expectedTypes = Object.keys(DOCUMENT_TYPE_META);
    expect(allTypes).toHaveLength(expectedTypes.length);
    for (const type of expectedTypes) {
      expect(allTypes).toContain(type);
    }
  });

  it('groups Core ID types correctly', () => {
    const groups = getDocumentTypeGroups();
    const coreId = groups.find((g) => g.category === 'Core ID');
    expect(coreId).toBeDefined();
    expect(coreId!.types).toContain('sa_id_book');
    expect(coreId!.types).toContain('sa_smart_id');
    expect(coreId!.types).toContain('passport');
  });
});

// ---------------------------------------------------------------------------
// checkExpiryStatus
// ---------------------------------------------------------------------------

describe('checkExpiryStatus', () => {
  const today = new Date('2025-06-15T12:00:00');

  it('returns "none" when no expiry date', () => {
    expect(checkExpiryStatus(undefined, today)).toBe('none');
  });

  it('returns "none" for invalid date strings', () => {
    expect(checkExpiryStatus('not-a-date', today)).toBe('none');
  });

  it('returns "expired" for past dates', () => {
    expect(checkExpiryStatus('2025-06-14', today)).toBe('expired');
    expect(checkExpiryStatus('2024-01-01', today)).toBe('expired');
  });

  it('returns "expiring_soon" within 30 days', () => {
    expect(checkExpiryStatus('2025-06-15', today)).toBe('expiring_soon');
    expect(checkExpiryStatus('2025-07-14', today)).toBe('expiring_soon');
    expect(checkExpiryStatus('2025-07-15', today)).toBe('expiring_soon');
  });

  it('returns "valid" for dates beyond 30 days', () => {
    expect(checkExpiryStatus('2025-07-16', today)).toBe('valid');
    expect(checkExpiryStatus('2026-01-01', today)).toBe('valid');
  });

  it('respects custom warningDays', () => {
    expect(checkExpiryStatus('2025-07-14', today, 60)).toBe('expiring_soon');
    expect(checkExpiryStatus('2025-06-16', today, 0)).toBe('valid');
  });
});

// ---------------------------------------------------------------------------
// getExpiryLabel
// ---------------------------------------------------------------------------

describe('getExpiryLabel', () => {
  it('returns correct labels', () => {
    expect(getExpiryLabel('expired')).toBe('Expired');
    expect(getExpiryLabel('expiring_soon')).toBe('Expiring Soon');
    expect(getExpiryLabel('valid')).toBe('Valid');
    expect(getExpiryLabel('none')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// maskDocumentNumber
// ---------------------------------------------------------------------------

describe('maskDocumentNumber', () => {
  it('masks long numbers showing last 4 chars', () => {
    expect(maskDocumentNumber('1234567890')).toBe('\u2022\u2022\u2022\u2022\u2022\u20227890');
  });

  it('masks with custom visible chars', () => {
    expect(maskDocumentNumber('1234567890', 2)).toBe(
      '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u202290',
    );
  });

  it('returns full string if shorter than visibleChars', () => {
    expect(maskDocumentNumber('123', 4)).toBe('123');
    expect(maskDocumentNumber('1234', 4)).toBe('1234');
  });

  it('returns empty string for empty input', () => {
    expect(maskDocumentNumber('')).toBe('');
  });

  it('masks strings exactly at visibleChars + 1', () => {
    expect(maskDocumentNumber('12345', 4)).toBe('\u20222345');
  });
});
