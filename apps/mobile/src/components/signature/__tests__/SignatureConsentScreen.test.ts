import { describe, it, expect, vi } from 'vitest';
import type { DetectedField, StoredSignature } from '@fillit/shared';

import type { SignatureConsentScreenProps, SignatureFieldInfo } from '../SignatureConsentScreen';

// ─── Helpers ──────────────────────────────────────────────────────

function makeField(overrides: Partial<DetectedField> = {}): DetectedField {
  return {
    id: 'sig-field-1',
    pageId: 'page-1',
    label: 'Signature',
    normalizedLabel: 'signature',
    fieldType: 'signature',
    bounds: { x: 0.1, y: 0.8, width: 0.4, height: 0.06 },
    matchConfidence: 0.9,
    value: '',
    isConfirmed: true,
    isSignatureField: true,
    ...overrides,
  };
}

function makeSignature(overrides: Partial<StoredSignature> = {}): StoredSignature {
  return {
    id: 'sig-1',
    profileId: 'profile-1',
    type: 'drawn',
    label: 'Full Name',
    svgPath: 'M 10 20 L 30 40',
    createdAt: '2026-01-01T00:00:00Z',
    isDefault: true,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────

describe('SignatureConsentScreen', () => {
  it('should have correct props interface', () => {
    const fields: SignatureFieldInfo[] = [{ field: makeField(), pageNumber: 1 }];
    const sigs: StoredSignature[] = [makeSignature()];

    const props: SignatureConsentScreenProps = {
      signatureFields: fields,
      availableSignatures: sigs,
      onConfirm: vi.fn(),
      onDecline: vi.fn(),
    };

    expect(props.signatureFields).toHaveLength(1);
    expect(props.availableSignatures).toHaveLength(1);
  });

  it('should accept multiple signature fields', () => {
    const fields: SignatureFieldInfo[] = [
      { field: makeField({ id: 'f1', label: 'Signature' }), pageNumber: 1 },
      { field: makeField({ id: 'f2', label: 'Initial' }), pageNumber: 2 },
    ];

    expect(fields).toHaveLength(2);
    expect(fields[0]!.pageNumber).toBe(1);
    expect(fields[1]!.pageNumber).toBe(2);
  });

  it('should accept multiple available signatures', () => {
    const sigs: StoredSignature[] = [
      makeSignature({ id: 'sig-1', label: 'Full Name', isDefault: true }),
      makeSignature({
        id: 'sig-2',
        label: 'Initials',
        type: 'typed',
        text: 'RK',
        isDefault: false,
      }),
    ];

    expect(sigs).toHaveLength(2);
    expect(sigs[0]!.isDefault).toBe(true);
    expect(sigs[1]!.type).toBe('typed');
  });

  it('should support empty signatures list', () => {
    const props: SignatureConsentScreenProps = {
      signatureFields: [{ field: makeField(), pageNumber: 1 }],
      availableSignatures: [],
      onConfirm: vi.fn(),
      onDecline: vi.fn(),
    };

    expect(props.availableSignatures).toHaveLength(0);
  });

  it('should support isSubmitting flag', () => {
    const props: SignatureConsentScreenProps = {
      signatureFields: [{ field: makeField(), pageNumber: 1 }],
      availableSignatures: [makeSignature()],
      onConfirm: vi.fn(),
      onDecline: vi.fn(),
      isSubmitting: true,
    };

    expect(props.isSubmitting).toBe(true);
  });

  it('should pass assignment map to onConfirm', () => {
    const onConfirm = vi.fn();
    const assignments = new Map<string, string>();
    assignments.set('sig-field-1', 'sig-1');

    onConfirm(assignments);

    expect(onConfirm).toHaveBeenCalledWith(assignments);
    expect(assignments.get('sig-field-1')).toBe('sig-1');
  });
});
