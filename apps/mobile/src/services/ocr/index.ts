// Public API
export {
  performOcr,
  performOcrBatch,
  extractPlainText,
  extractBlocks,
  getActiveProviderName,
} from './ocrService';

// Types (re-exported from types.ts for consumers)
export type {
  OcrElement,
  OcrLine,
  OcrBlock,
  OcrPageResult,
  OcrResult,
  OcrOptions,
  OcrProvider,
} from './types';
