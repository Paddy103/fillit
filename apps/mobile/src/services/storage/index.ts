export {
  initialize,
  isSecureStoreAvailable,
  isFallbackActive,
  onFallbackChange,
  generateKey,
  getOrCreateKey,
  getKey,
  deleteKey,
  rotateKey,
  hasKey,
  clearInMemoryStore,
  resetServiceState,
  SecureStoreError,
  KeyGenerationError,
  KeyStorageError,
  KeyRetrievalError,
  KeyDeletionError,
  SecureHardwareUnavailableError,
} from './secureStore';

export type { InitializeResult } from './secureStore';

// File Storage (S-21)
export {
  saveFile,
  readFile,
  fileExists,
  deleteFile,
  deleteDocumentFiles,
  getDocumentFileSize,
  listDocuments,
  cleanupOrphanedFiles,
  cleanupTempFiles,
  getDocumentsBaseDir,
  getDocumentDir,
  getSubdirectory,
  getPageImageFile,
  getExportedPdfFile,
  getTempDir,
} from './fileStorage';

export type { FileSubdirectory, DocumentFileInfo } from './fileStorage';

export {
  FileStorageError,
  FileWriteError,
  FileReadError,
  FileDeleteError,
  DirectoryError,
} from './fileStorageErrors';
