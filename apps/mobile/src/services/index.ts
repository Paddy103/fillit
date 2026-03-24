export {
  initialize as initializeSecureStore,
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
} from './storage';

export type { InitializeResult } from './storage';

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
  FileStorageError,
  FileWriteError,
  FileReadError,
  FileDeleteError,
  DirectoryError,
} from './storage';

export type { FileSubdirectory, DocumentFileInfo } from './storage';

// Database (S-15)
export {
  initializeDatabase,
  getDatabase,
  getSchemaVersion,
  runQuery,
  getFirst,
  getAll,
  withTransaction,
  closeDatabase,
  deleteDatabase,
  DatabaseError,
  DatabaseInitError,
  MigrationError,
  QueryError,
  TransactionError,
} from './storage';
