/**
 * Province-specific validation and lookup utilities.
 */

import {
  SA_PROVINCES,
  type SAProvince,
  type SAProvinceAbbreviation,
  SA_PROVINCE_ABBREVIATION_MAP,
  SA_PROVINCE_NAME_MAP,
  SA_POSTAL_CODE_RANGES,
} from '../constants/index.js';

/**
 * Check whether `province` is a valid SA province name (case-sensitive).
 */
export function isValidSAProvince(
  province: string,
): province is SAProvince {
  return (SA_PROVINCES as readonly string[]).includes(province);
}

/**
 * Check whether `abbr` is a valid SA province abbreviation (case-sensitive).
 */
export function isValidSAProvinceAbbreviation(
  abbr: string,
): abbr is SAProvinceAbbreviation {
  return SA_PROVINCE_ABBREVIATION_MAP.has(abbr);
}

/**
 * Get the full province name from its abbreviation.
 * Returns `undefined` if the abbreviation is not recognised.
 */
export function getProvinceFromAbbreviation(
  abbr: string,
): SAProvince | undefined {
  return SA_PROVINCE_ABBREVIATION_MAP.get(abbr);
}

/**
 * Get the abbreviation for a province name.
 * Returns `undefined` if the province name is not recognised.
 */
export function getAbbreviationFromProvince(
  province: string,
): SAProvinceAbbreviation | undefined {
  const info = SA_PROVINCE_NAME_MAP.get(province);
  return info?.abbreviation as SAProvinceAbbreviation | undefined;
}

/**
 * Suggest which province a 4-digit postal code belongs to.
 * Returns `undefined` if the postal code is invalid or falls outside
 * the known ranges.
 */
export function suggestProvinceFromPostalCode(
  postalCode: string,
): SAProvince | undefined {
  const code = Number(postalCode);
  if (!Number.isInteger(code) || code < 1 || code > 9999) {
    return undefined;
  }

  for (const [province, ranges] of SA_POSTAL_CODE_RANGES) {
    for (const range of ranges) {
      if (code >= range.min && code <= range.max) {
        return province;
      }
    }
  }

  return undefined;
}
