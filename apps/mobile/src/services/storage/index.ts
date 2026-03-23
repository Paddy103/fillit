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
