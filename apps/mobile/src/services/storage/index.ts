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
} from './database';

export {
  DatabaseError,
  DatabaseInitError,
  MigrationError,
  QueryError,
  TransactionError,
} from './databaseErrors';

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
} from './addressCrud';

export type { CreateAddressInput, UpdateAddressInput } from './addressCrud';

// Profile CRUD (S-16)
export {
  createProfile,
  getProfileById,
  listProfiles,
  getPrimaryProfile,
  updateProfile,
  deleteProfile,
  getProfileCount,
  createAddress as createProfileAddress,
  getAddressesByProfileId,
  updateAddress as updateProfileAddress,
  deleteAddress as deleteProfileAddress,
  createIdentityDocument as createProfileIdentityDocument,
  getIdentityDocumentsByProfileId,
  updateIdentityDocument as updateProfileIdentityDocument,
  deleteIdentityDocument as deleteProfileIdentityDocument,
  createProfessionalRegistration,
  getProfessionalRegistrationsByProfileId,
  updateProfessionalRegistration,
  deleteProfessionalRegistration,
  createEmergencyContact,
  getEmergencyContactsByProfileId,
  updateEmergencyContact,
  deleteEmergencyContact,
  createFullProfile,
} from './profileCrud';

export type {
  CreateProfileInput,
  UpdateProfileInput,
  CreateAddressInput as ProfileCreateAddressInput,
  UpdateAddressInput as ProfileUpdateAddressInput,
  CreateIdentityDocumentInput as ProfileCreateIdentityDocumentInput,
  UpdateIdentityDocumentInput as ProfileUpdateIdentityDocumentInput,
  CreateProfessionalRegistrationInput,
  UpdateProfessionalRegistrationInput,
  CreateEmergencyContactInput,
  UpdateEmergencyContactInput,
} from './profileCrud';

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
} from './identityDocumentService';

export type {
  CreateIdentityDocumentInput,
  UpdateIdentityDocumentInput,
} from './identityDocumentService';

// Document & Page CRUD (S-19)
export {
  createDocument,
  getDocumentById,
  getDocumentWithPages,
  listDocuments as listDocumentRecords,
  updateDocument,
  deleteDocument,
  countDocuments,
  createPage,
  getPageById,
  getPagesByDocumentId,
  updatePage,
  deletePage,
  deletePagesByDocumentId,
  countPages,
  createDocumentWithPages,
  deleteDocumentWithCleanup,
  isValidStatusTransition,
} from './documentCrud';

export type {
  CreateDocumentInput,
  UpdateDocumentInput,
  CreatePageInput,
  UpdatePageInput,
} from './documentCrud';
