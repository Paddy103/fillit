# FillIt Mobile App

Expo React Native app for document scanning, AI-powered field detection, and PDF generation.

## Getting Started

```bash
pnpm install
pnpm --filter mobile start
```

## Architecture

### Services

Services live in `src/services/` and are re-exported through barrel files.

#### Secure Key Management (`src/services/storage/secureStore.ts`)

Manages encryption keys using platform-native secure storage (iOS Keychain / Android Keystore) via `expo-secure-store`.

**Key features:**

- AES-256 key generation via `expo-crypto` (256-bit, cryptographically secure)
- Automatic key creation on first launch (`getOrCreateKey`)
- Key rotation with old-key retrieval for re-encryption
- Per-alias promise mutex to prevent race conditions
- In-memory fallback for devices without secure hardware (keys do not persist across restarts)
- Custom error hierarchy (`SecureStoreError` and subclasses in `secureStoreErrors.ts`)

**Usage:**

```ts
import { initializeSecureStore, getOrCreateKey, rotateKey, isFallbackActive } from '../services';

// Call once at app startup
const { fallbackActivated } = await initializeSecureStore();
if (fallbackActivated) {
  console.warn('Secure hardware unavailable — keys stored in memory only');
}

// Get or create the primary encryption key
const key = await getOrCreateKey();

// Rotate when needed (returns old key for re-encryption)
const { oldKey, newKey } = await rotateKey();
```

**Security notes:**

- When `isFallbackActive()` returns `true`, keys are volatile and lost on app restart. The UI should warn the user.
- Keys are scoped under the `com.fillit.keymanagement` keychain service.
- Keychain accessibility is set to `AFTER_FIRST_UNLOCK` for background access after the device is unlocked.

#### Encryption (`src/utils/encryption.ts`)

AES-256-GCM encryption module that delegates key management to the secure store service. Encrypts data in the format `base64(iv):base64(ciphertext+tag)`.

### Stores

State management lives in `src/stores/` using Zustand with SQLite persistence.

- **Profile store** (`profile-store.ts`) — Manages profiles and child entities (addresses, dependants, etc.), synced to SQLite
- **Document store** (`document-store.ts`) — Manages documents, pages, and fields, synced to SQLite. Follows the same factory-function pattern as the profile store.
- **Settings store** — App-level settings and preferences

## Testing

```bash
pnpm --filter mobile test
```

Tests are in `src/__tests__/`. The secure store service has 88 tests covering initialization, key CRUD, rotation, fallback behavior, race conditions, and error paths.
