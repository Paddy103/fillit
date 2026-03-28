/**
 * Web OCR Provider (stub for Phase 6)
 *
 * Placeholder implementation for browser-based OCR via tesseract.js.
 * Returns a descriptive error until the web platform is implemented.
 */

import type { OcrProvider, OcrResult } from './types';

export const webProvider: OcrProvider = {
  name: 'tesseract',

  async recognizePage(): Promise<OcrResult> {
    return {
      status: 'error',
      error: new Error(
        'Web OCR is not yet implemented. Tesseract.js support will be added in Phase 6.',
      ),
    };
  },
};
