import { describe, expect, it } from 'vitest';
import * as shared from '../index.js';

describe('Barrel exports', () => {
  it('should export validation functions', () => {
    expect(typeof shared.isValidSAIdNumber).toBe('function');
    expect(typeof shared.isValidEmail).toBe('function');
    expect(typeof shared.isValidSAPhoneNumber).toBe('function');
    expect(typeof shared.isValidSAPostalCode).toBe('function');
    expect(typeof shared.isNonEmpty).toBe('function');
  });

  it('should export constants', () => {
    expect(shared.APP_NAME).toBeDefined();
    expect(shared.APP_VERSION).toBeDefined();
    expect(shared.DEFAULT_COUNTRY).toBeDefined();
    expect(shared.DOCUMENT_STATUSES).toBeDefined();
    expect(shared.FORM_FIELD_TYPES).toBeDefined();
    expect(shared.SA_PROVINCES).toBeDefined();
  });
});
