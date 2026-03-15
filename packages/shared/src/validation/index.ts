/**
 * Shared validation utilities for the FillIt application.
 */

const SA_ID_REGEX = /^\d{13}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SA_PHONE_REGEX = /^(\+27|0)\d{9}$/;
const SA_POSTAL_CODE_REGEX = /^\d{4}$/;

export function isValidSAIdNumber(idNumber: string): boolean {
  if (!SA_ID_REGEX.test(idNumber)) return false;

  // Luhn algorithm check for SA ID numbers
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    const digit = Number(idNumber[i]);
    if (i % 2 === 0) {
      sum += digit;
    } else {
      const doubled = digit * 2;
      sum += doubled > 9 ? doubled - 9 : doubled;
    }
  }

  return sum % 10 === 0;
}

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export function isValidSAPhoneNumber(phone: string): boolean {
  return SA_PHONE_REGEX.test(phone.replace(/\s/g, ''));
}

export function isValidSAPostalCode(postalCode: string): boolean {
  return SA_POSTAL_CODE_REGEX.test(postalCode);
}

export function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}
