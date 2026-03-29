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

- **Profile store** (`profile-store.ts`) — Manages profiles and child entities (addresses, dependants, signatures, etc.), synced to SQLite
- **Document store** (`document-store.ts`) — Manages documents, pages, and fields, synced to SQLite. Follows the same factory-function pattern as the profile store.
- **Processing store** (`processing-store.ts`) — Ephemeral state machine for the document processing pipeline (idle->scanning->reviewing->ocr->detecting->matching->signing->exporting->done). Not persisted to SQLite.
- **Settings store** — App-level settings and preferences

### Components

Reusable UI components live in `src/components/`, organized by domain.

#### Document Components (`src/components/document/`)

- **DocumentViewer** — Zoomable document image viewer with pinch/pan gestures and detected field overlays (color-coded by confidence)
- **FieldOverlay** — Positioned field rectangle on document image, color-coded green/yellow/red by match confidence
- **FieldEditorSheet** — Slide-up bottom sheet for editing a detected field's value, selecting source (profile/manual/skip), viewing confidence, and saving

#### Signature Components (`src/components/signature/`)

- **SignaturePad** — Freehand drawing canvas using `react-native-svg` + `react-native-gesture-handler`. Pen color/width pickers, clear/undo, SVG path export
- **TypedSignature** — Type-your-name signature with font selector (Dancing Script, Great Vibes, Print). Live preview with auto-sizing text
- **SignaturePreview** — Renders drawn (SVG) or typed (text+font) signatures in thumbnail or full-size mode with tap-to-expand
- **SignatureList** — Signature management list with default badge, set-default/delete actions, empty state

#### PDF Services (`src/services/pdf/`)

- **formFill** — Fills AcroForm fields in existing PDFs using pdf-lib (text, checkbox, radio, dropdown). SA date formatting (DD/MM/YYYY). Optional form flattening.
- **scannedOverlay** — Generates PDFs from scanned page images with text/signature overlays at bounding box positions. Auto-sizes fonts, supports drawn (PNG) and typed signatures. Multi-page support.

### Screens

- **Signature Management** (`app/profile/signature/`) — List, add (drawn or typed), delete, and set default signatures for the active profile

## Testing

```bash
pnpm --filter mobile test
```

Tests are in `src/__tests__/` and co-located `__tests__/` directories within component folders.
