import { describe, expect, it } from 'vitest';
import {
  APP_NAME,
  APP_VERSION,
  DEFAULT_COUNTRY,
  DEFAULT_LOCALE,
  API_VERSION,
  DOCUMENT_STATUSES,
  FORM_FIELD_TYPES,
  SA_PROVINCES,
} from '../constants/index.js';

describe('App constants', () => {
  it('should have correct app name', () => {
    expect(APP_NAME).toBe('FillIt');
  });

  it('should have a semver version', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('should default to South Africa', () => {
    expect(DEFAULT_COUNTRY).toBe('ZA');
    expect(DEFAULT_LOCALE).toBe('en-ZA');
  });

  it('should have an API version', () => {
    expect(API_VERSION).toBe('v1');
  });
});

describe('Document statuses', () => {
  it('should include all expected statuses', () => {
    expect(DOCUMENT_STATUSES).toContain('draft');
    expect(DOCUMENT_STATUSES).toContain('scanned');
    expect(DOCUMENT_STATUSES).toContain('detected');
    expect(DOCUMENT_STATUSES).toContain('filled');
    expect(DOCUMENT_STATUSES).toContain('signed');
    expect(DOCUMENT_STATUSES).toContain('exported');
  });

  it('should have exactly 6 statuses', () => {
    expect(DOCUMENT_STATUSES).toHaveLength(6);
  });
});

describe('Form field types', () => {
  it('should include all expected types', () => {
    expect(FORM_FIELD_TYPES).toContain('text');
    expect(FORM_FIELD_TYPES).toContain('date');
    expect(FORM_FIELD_TYPES).toContain('number');
    expect(FORM_FIELD_TYPES).toContain('email');
    expect(FORM_FIELD_TYPES).toContain('phone');
    expect(FORM_FIELD_TYPES).toContain('signature');
    expect(FORM_FIELD_TYPES).toContain('checkbox');
  });

  it('should have exactly 7 field types', () => {
    expect(FORM_FIELD_TYPES).toHaveLength(7);
  });
});

describe('SA provinces', () => {
  it('should have all 9 South African provinces', () => {
    expect(SA_PROVINCES).toHaveLength(9);
  });

  it('should include Gauteng', () => {
    expect(SA_PROVINCES).toContain('Gauteng');
  });

  it('should include Western Cape', () => {
    expect(SA_PROVINCES).toContain('Western Cape');
  });

  it('should include KwaZulu-Natal', () => {
    expect(SA_PROVINCES).toContain('KwaZulu-Natal');
  });
});
