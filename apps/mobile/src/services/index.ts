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

// Address CRUD (S-17)
export {
  createAddress,
  getAddressById,
  getAddressesByProfile,
  updateAddress,
  deleteAddress,
  countAddressesByProfile,
  getDefaultAddress,
  setDefaultAddress,
  deleteAddressesByProfile,
} from './storage';

export type { CreateAddressInput, UpdateAddressInput } from './storage';

// Identity Document CRUD (S-18)
export {
  createIdentityDocument,
  getIdentityDocumentById,
  getIdentityDocumentsByProfile,
  updateIdentityDocument,
  deleteIdentityDocument,
  deleteIdentityDocumentsByProfile,
  countIdentityDocuments,
  createIdentityDocumentsBatch,
  IdentityDocumentError,
  IdentityDocumentNotFoundError,
  IdentityDocumentValidationError,
} from './storage';

export type { CreateIdentityDocumentInput, UpdateIdentityDocumentInput } from './storage';

// Signature CRUD (S-20)
export {
  createSignature,
  getSignatureById,
  getSignaturesByProfile,
  getDefaultSignature,
  countSignaturesByProfile,
  updateSignature,
  setDefaultSignature,
  deleteSignature,
  deleteSignaturesByProfile,
  SignatureServiceError,
  SignatureNotFoundError,
  SignatureValidationError,
} from './storage';

export type { CreateSignatureInput, UpdateSignatureInput } from './storage';
