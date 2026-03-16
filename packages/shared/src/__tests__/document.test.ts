import { describe, expect, it } from 'vitest';
import {
  DETECTED_FIELD_TYPES,
  DOCUMENT_SOURCE_TYPES,
  PROCESSING_STATUSES,
  isValidBoundingBox,
  isValidConfidence,
  isValidDetectedFieldType,
  isValidDocumentSourceType,
  isValidProcessingStatus,
} from '../index.js';

describe('Document type guards', () => {
  describe('isValidDetectedFieldType', () => {
    it.each(['text', 'date', 'checkbox', 'signature', 'initial', 'number'])(
      'returns true for valid type "%s"',
      (type) => {
        expect(isValidDetectedFieldType(type)).toBe(true);
      },
    );

    it.each(['email', 'phone', 'dropdown', '', 'TEXT'])(
      'returns false for invalid type "%s"',
      (type) => {
        expect(isValidDetectedFieldType(type)).toBe(false);
      },
    );
  });

  describe('isValidProcessingStatus', () => {
    it.each([
      'scanned',
      'ocr_complete',
      'fields_detected',
      'matched',
      'reviewed',
      'exported',
    ])('returns true for valid status "%s"', (status) => {
      expect(isValidProcessingStatus(status)).toBe(true);
    });

    it.each(['draft', 'pending', '', 'SCANNED'])(
      'returns false for invalid status "%s"',
      (status) => {
        expect(isValidProcessingStatus(status)).toBe(false);
      },
    );
  });

  describe('isValidDocumentSourceType', () => {
    it.each(['camera', 'import'])('returns true for valid source "%s"', (source) => {
      expect(isValidDocumentSourceType(source)).toBe(true);
    });

    it.each(['scan', 'upload', '', 'CAMERA'])(
      'returns false for invalid source "%s"',
      (source) => {
        expect(isValidDocumentSourceType(source)).toBe(false);
      },
    );
  });
});

describe('isValidConfidence', () => {
  it.each([0, 0.0, 0.5, 1, 1.0])(
    'returns true for valid confidence %s',
    (value) => {
      expect(isValidConfidence(value)).toBe(true);
    },
  );

  it.each([-0.1, 1.1, -1, 2, Infinity, -Infinity, NaN])(
    'returns false for invalid confidence %s',
    (value) => {
      expect(isValidConfidence(value)).toBe(false);
    },
  );
});

describe('isValidBoundingBox', () => {
  it('returns true for a valid bounding box', () => {
    expect(
      isValidBoundingBox({ x: 0, y: 0, width: 1, height: 1 }),
    ).toBe(true);
  });

  it('returns true for a box with fractional coordinates', () => {
    expect(
      isValidBoundingBox({ x: 0.1, y: 0.2, width: 0.5, height: 0.3 }),
    ).toBe(true);
  });

  it('returns true for a zero-size box', () => {
    expect(
      isValidBoundingBox({ x: 0.5, y: 0.5, width: 0, height: 0 }),
    ).toBe(true);
  });

  it('returns false when x is out of range', () => {
    expect(
      isValidBoundingBox({ x: -0.1, y: 0, width: 0.5, height: 0.5 }),
    ).toBe(false);
    expect(
      isValidBoundingBox({ x: 1.1, y: 0, width: 0.5, height: 0.5 }),
    ).toBe(false);
  });

  it('returns false when y is out of range', () => {
    expect(
      isValidBoundingBox({ x: 0, y: -0.1, width: 0.5, height: 0.5 }),
    ).toBe(false);
    expect(
      isValidBoundingBox({ x: 0, y: 1.1, width: 0.5, height: 0.5 }),
    ).toBe(false);
  });

  it('returns false when width is out of range', () => {
    expect(
      isValidBoundingBox({ x: 0, y: 0, width: -0.1, height: 0.5 }),
    ).toBe(false);
    expect(
      isValidBoundingBox({ x: 0, y: 0, width: 1.1, height: 0.5 }),
    ).toBe(false);
  });

  it('returns false when height is out of range', () => {
    expect(
      isValidBoundingBox({ x: 0, y: 0, width: 0.5, height: -0.1 }),
    ).toBe(false);
    expect(
      isValidBoundingBox({ x: 0, y: 0, width: 0.5, height: 1.1 }),
    ).toBe(false);
  });
});

describe('Document constants', () => {
  it('DETECTED_FIELD_TYPES contains expected values', () => {
    expect(DETECTED_FIELD_TYPES).toEqual([
      'text',
      'date',
      'checkbox',
      'signature',
      'initial',
      'number',
    ]);
  });

  it('PROCESSING_STATUSES contains expected values', () => {
    expect(PROCESSING_STATUSES).toEqual([
      'scanned',
      'ocr_complete',
      'fields_detected',
      'matched',
      'reviewed',
      'exported',
    ]);
  });

  it('DOCUMENT_SOURCE_TYPES contains expected values', () => {
    expect(DOCUMENT_SOURCE_TYPES).toEqual(['camera', 'import']);
  });
});
