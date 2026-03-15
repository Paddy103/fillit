# FillIt — Implementation Plan

> **Last updated**: 2026-03-15
> **Status**: Planning complete, ready for development
> **Working name**: FillIt (pending trademark research)

## Table of Contents

1. [Overview](#1-overview)
2. [Key Decisions](#2-key-decisions)
3. [Tech Stack](#3-tech-stack)
4. [Repository & Project Structure](#4-repository--project-structure)
5. [Data Model](#5-data-model)
6. [UI/UX Design Direction](#6-uiux-design-direction)
7. [Document Processing Pipeline](#7-document-processing-pipeline)
8. [AI Prompt Strategy](#8-ai-prompt-strategy)
9. [Backend Proxy Server](#9-backend-proxy-server)
10. [Security](#10-security)
11. [Offline-First Architecture](#11-offline-first-architecture)
12. [Testing Strategy](#12-testing-strategy)
13. [CI/CD Pipeline](#13-cicd-pipeline)
14. [Phased Implementation](#14-phased-implementation)
15. [Risks & Mitigations](#15-risks--mitigations)
16. [Verification Plan](#16-verification-plan)

---

## 1. Overview

**FillIt** is a cross-platform mobile application (iOS/Android first, web later) that eliminates the tedium of filling out paper and digital forms.

### How It Works

1. **Scan or import** a document (camera with auto-edge-detection, or import PDF/image)
2. **AI analyzes** the document — detects fillable fields (name, address, ID number, dates, signatures, etc.)
3. **Auto-fills** fields from the user's stored profile data
4. **User reviews** and corrects any mismatched fields
5. **Signs** the document (drawn or typed signature, with explicit consent)
6. **Exports** as a completed PDF — share, print, or save

### Target Market

- **Launch country**: South Africa
- **Primary users**: Anyone who regularly fills out forms (parents, patients, job seekers, students, business owners)
- **Language**: English UI at launch (code structured for future Afrikaans, Zulu, etc.)

---

## 2. Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| App name | FillIt (working name) | Pending trademark/CIPC research |
| Platform priority | Mobile first (iOS/Android) | Web deferred to Phase 6 |
| API architecture | Backend proxy server | Protects Claude API key, enables caching and analytics |
| AI processing | Cloud AI (Claude) + offline heuristic | Best accuracy online, graceful degradation offline |
| Authentication | OAuth (Google + Apple Sign-In) | No password management, enables per-user quotas |
| Repo structure | Monorepo (pnpm workspaces) | Shared types, single CI config, easier to keep in sync |
| Hosting | Fly.io | Best free tier, Docker-based, cost-optimized |
| Package manager | pnpm | Fast, disk-efficient, great workspace support |
| Mobile distribution | EAS Build + TestFlight/Play Console | Proper beta testing pipeline |

---

## 3. Tech Stack

### Mobile App

| Category | Library | Purpose |
|---|---|---|
| Framework | React Native + Expo (SDK 55+) | Cross-platform mobile + web |
| Navigation | Expo Router (file-based) | Modern Expo standard |
| State management | Zustand | Lightweight, TypeScript-friendly |
| Database | expo-sqlite | Local SQLite, works on all platforms |
| Camera/Scanner | @infinitered/react-native-mlkit-document-scanner | Native document scanning with auto-edge-detection |
| OCR (native) | @infinitered/react-native-mlkit-text-recognition | On-device ML Kit text recognition |
| OCR (web) | tesseract.js | WASM-based fallback for web platform |
| File picker | expo-document-picker | Import PDFs/images from device |
| File system | expo-file-system | Read/write local files |
| PDF creation | pdf-lib | Fill form fields + draw text/images on PDFs |
| PDF viewing | react-native-pdf | Render PDFs for preview |
| Signature drawing | react-native-signature-canvas | Freehand signature capture |
| Image processing | expo-image-manipulator | Crop, rotate, resize scanned images |
| Sharing | expo-sharing + expo-print | Share/print filled documents |
| Network detection | @react-native-community/netinfo | Online/offline detection for AI fallback |
| Secure storage | expo-secure-store | Store encryption keys (Keychain/Keystore) |
| Crypto | expo-crypto | Hashing, random bytes for encryption |
| Biometric auth | expo-local-authentication | Face ID / fingerprint / PIN lock |
| Fonts | expo-font | Load signature-style fonts |

### Backend Proxy

| Category | Library | Purpose |
|---|---|---|
| Runtime | Node.js | Server runtime |
| Framework | Hono | Lightweight, fast HTTP framework |
| AI SDK | @anthropic-ai/sdk | Claude API client |
| Auth | google-auth-library, apple-signin-auth | OAuth token verification |
| Cache | Redis (Upstash) or in-memory | Template response caching |
| Containerization | Docker | Deployment packaging |

### Shared Package (@fillit/shared)

- TypeScript interfaces (profiles, documents, fields, signatures)
- SA ID validation (Luhn checksum, data extraction)
- Field type enums and document type constants
- Field normalization utilities

---

## 4. Repository & Project Structure

### Monorepo Layout

```
fillit/
├── apps/
│   └── mobile/                       # React Native + Expo app
│       ├── app/                      # Expo Router file-based routing
│       │   ├── _layout.tsx           # Root layout (providers, theme)
│       │   ├── index.tsx             # Entry redirect
│       │   ├── (tabs)/              # Bottom tab navigator
│       │   │   ├── _layout.tsx      # Tab bar config
│       │   │   ├── home.tsx         # Dashboard: recent docs, quick actions
│       │   │   ├── documents.tsx    # Document history list
│       │   │   ├── profiles.tsx     # User profiles & dependents
│       │   │   └── settings.tsx     # App settings
│       │   ├── scan/
│       │   │   ├── camera.tsx       # Camera scanning screen
│       │   │   └── review.tsx       # Review scanned pages
│       │   ├── import/
│       │   │   └── picker.tsx       # File picker for PDF/image import
│       │   ├── process/
│       │   │   ├── ocr-progress.tsx # OCR processing progress
│       │   │   ├── field-detection.tsx  # AI field detection results
│       │   │   ├── field-matching.tsx   # AI matching + user review
│       │   │   └── signature-prompt.tsx # Signature consent & placement
│       │   ├── export/
│       │   │   └── preview.tsx      # Final preview, export, share
│       │   ├── profile/
│       │   │   ├── edit.tsx         # Edit primary user profile
│       │   │   └── dependent.tsx    # Add/edit dependent
│       │   └── signature/
│       │       └── manage.tsx       # Manage saved signatures
│       ├── src/
│       │   ├── components/
│       │   │   ├── ui/              # Generic UI (Button, Card, Modal, etc.)
│       │   │   ├── document/        # DocumentViewer, FieldOverlay, FieldEditor
│       │   │   ├── signature/       # SignaturePad, TypedSignature, SignaturePreview
│       │   │   └── profile/         # ProfileForm, DependentCard
│       │   ├── services/
│       │   │   ├── ocr/
│       │   │   │   ├── mlkit.ts     # ML Kit OCR (native)
│       │   │   │   ├── tesseract.ts # Tesseract.js (web fallback)
│       │   │   │   └── index.ts     # Platform-aware entry point
│       │   │   ├── ai/
│       │   │   │   ├── proxy.ts     # Backend proxy API client
│       │   │   │   ├── heuristic.ts # Offline fallback matcher
│       │   │   │   └── index.ts     # Chooses cloud vs. offline
│       │   │   ├── pdf/
│       │   │   │   ├── generator.ts # pdf-lib: fill/create PDFs
│       │   │   │   └── renderer.ts  # PDF-to-image for preview
│       │   │   ├── storage/
│       │   │   │   ├── database.ts  # expo-sqlite schema, migrations, CRUD
│       │   │   │   ├── secureStore.ts # Encryption key management
│       │   │   │   └── fileStorage.ts # Image/PDF file management
│       │   │   ├── cloud/
│       │   │   │   ├── googleDrive.ts # Optional Google Drive backup
│       │   │   │   └── icloud.ts      # Optional iCloud backup
│       │   │   ├── auth/
│       │   │   │   └── oauth.ts     # Google/Apple Sign-In
│       │   │   └── sharing.ts       # expo-sharing / expo-print
│       │   ├── hooks/
│       │   │   ├── useProfile.ts
│       │   │   ├── useDocuments.ts
│       │   │   ├── useOCR.ts
│       │   │   ├── useFieldMatching.ts
│       │   │   ├── useSignature.ts
│       │   │   └── useTheme.ts
│       │   ├── store/
│       │   │   ├── profileStore.ts
│       │   │   ├── documentStore.ts
│       │   │   ├── processingStore.ts  # Pipeline state machine
│       │   │   └── settingsStore.ts
│       │   ├── theme/
│       │   │   ├── colors.ts        # Theme tokens (light + dark)
│       │   │   ├── typography.ts    # Font styles
│       │   │   └── index.ts
│       │   └── utils/
│       │       ├── encryption.ts
│       │       ├── imageProcessing.ts
│       │       ├── fieldNormalization.ts
│       │       └── constants.ts
│       ├── assets/
│       │   ├── fonts/               # Inter, JetBrains Mono, signature fonts
│       │   └── images/
│       ├── app.json
│       ├── eas.json
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── shared/                       # @fillit/shared
│       ├── src/
│       │   ├── types/
│       │   │   ├── profile.ts       # UserProfile, Address, IdentityDocument
│       │   │   ├── document.ts      # ProcessedDocument, DocumentPage
│       │   │   ├── field.ts         # DetectedField, AnalyzeRequest/Response
│       │   │   └── signature.ts     # StoredSignature
│       │   ├── validation/
│       │   │   ├── saId.ts          # SA ID parsing, Luhn, data extraction
│       │   │   └── fields.ts        # Field normalization utilities
│       │   └── constants/
│       │       ├── documentTypes.ts # Pre-built SA document type definitions
│       │       ├── fieldTypes.ts    # Field type enums
│       │       └── provinces.ts     # SA provinces list
│       ├── package.json
│       └── tsconfig.json
│
├── server/                           # Backend proxy
│   ├── src/
│   │   ├── index.ts                 # Hono entry point
│   │   ├── routes/
│   │   │   ├── auth.ts              # OAuth token verification
│   │   │   ├── analyze.ts           # POST /analyze — main AI endpoint
│   │   │   ├── health.ts            # Health check
│   │   │   └── usage.ts             # Usage stats
│   │   ├── middleware/
│   │   │   ├── auth.ts              # JWT/OAuth validation
│   │   │   └── rateLimit.ts         # Per-user rate limiting
│   │   ├── services/
│   │   │   ├── claude.ts            # Anthropic SDK, prompt construction
│   │   │   ├── cache.ts             # Template cache (Redis/in-memory)
│   │   │   └── analytics.ts         # Usage logging (no PII)
│   │   └── utils/
│   │       ├── fingerprint.ts       # Document fingerprint hashing
│   │       └── config.ts            # Environment config
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── .env.example
│
├── .github/
│   └── workflows/
│       ├── ci.yml                    # PR: lint + type-check + test
│       ├── deploy-server.yml         # Main push: deploy to Fly.io
│       └── build-mobile.yml          # Release: EAS Build → TestFlight/Play
│
├── package.json                      # Root workspace config
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .eslintrc.js
├── .prettierrc
└── .gitignore
```

---

## 5. Data Model

### 5.1 User Profile

```typescript
interface UserProfile {
  id: string;                          // UUID
  isPrimary: boolean;
  relationship?: 'spouse' | 'child' | 'parent' | 'other';

  // Basic identity
  firstName: string;
  middleName?: string;
  lastName: string;
  maidenName?: string;
  dateOfBirth: string;                 // ISO 8601
  gender?: 'male' | 'female' | 'other';
  nationality: string;                 // Default: "South African"
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed' | 'other';

  // SA-specific
  saIdNumber?: string;                 // 13-digit, validated with Luhn
  citizenship?: 'citizen' | 'permanent_resident';

  // Contact
  email: string;
  phoneMobile: string;
  phoneWork?: string;
  addresses: Address[];

  // Employment
  employer?: string;
  jobTitle?: string;
  workPhone?: string;
  workAddress?: Address;
  employeeNumber?: string;
  industry?: string;

  // Education
  highestQualification?: string;
  institution?: string;
  yearCompleted?: number;
  studentNumber?: string;

  // Professional registrations
  professionalRegistrations: ProfessionalRegistration[];

  // Identity documents
  documents: IdentityDocument[];

  // Emergency contacts
  emergencyContacts: EmergencyContact[];  // Max 2

  // Signatures
  signatures: StoredSignature[];

  // Metadata
  createdAt: string;
  updatedAt: string;
}
```

### 5.2 Address

```typescript
interface Address {
  id: string;
  label: string;              // "Home", "Work", "Mailing", "Postal", custom
  street1: string;
  street2?: string;
  suburb?: string;            // SA-specific
  city: string;
  province: string;           // SA provinces
  postalCode: string;
  country: string;            // Default: "South Africa"
  isDefault: boolean;
}
```

### 5.3 Identity Documents (SA-focused)

| Category | Document Types |
|---|---|
| **Core ID** | SA ID Book (green book), SA Smart ID Card, Passport |
| **Driving** | Driver's license (card), PrDP (Professional Driving Permit) |
| **Tax & Finance** | SARS Tax number, bank account details |
| **Medical** | Medical aid (scheme + member number + plan), hospital plan |
| **Vehicle** | Vehicle registration (eNatis), license disc |
| **Work** | Work permit, refugee permit, asylum seeker permit |
| **Education** | Matric certificate, degree/diploma, student card |
| **Professional** | HPCSA, SACAP, ECSA, SAICA, Law Society, SACE registrations |
| **Government** | Birth certificate, marriage certificate, COIDA, UIF number |
| **Custom** | User-defined type with custom label and fields |

```typescript
interface IdentityDocument {
  id: string;
  type: DocumentType;           // Enum of all types above + 'custom'
  label: string;                // User-friendly label
  number: string;               // Encrypted at rest
  issueDate?: string;
  expiryDate?: string;
  issuingAuthority?: string;
  additionalFields: Record<string, string>;  // Type-specific data (encrypted)
}
```

### 5.4 SA ID Number Smart Fill

```typescript
// SA ID format: YYMMDD SSSS C A Z
// YYMMDD = date of birth
// SSSS   = gender (0000-4999 = female, 5000-9999 = male)
// C      = citizenship (0 = SA citizen, 1 = permanent resident)
// A      = unused (was race, now always 8)
// Z      = Luhn checksum digit

function parseRSAId(idNumber: string): {
  valid: boolean;
  dateOfBirth?: string;          // ISO 8601
  gender?: 'male' | 'female';
  citizenship?: 'citizen' | 'permanent_resident';
}
```

When a user enters their SA ID number, the app:
1. Validates format (13 digits) and Luhn checksum
2. Auto-populates date of birth, gender, and citizenship on the profile
3. Shows validation feedback in real-time as they type

### 5.5 Processed Document

```typescript
interface ProcessedDocument {
  id: string;
  title: string;
  pages: DocumentPage[];
  fields: DetectedField[];
  status: 'scanned' | 'ocr_complete' | 'fields_detected' | 'matched' | 'reviewed' | 'exported';
  sourceType: 'camera' | 'import';
  documentType?: string;         // AI-detected: "medical form", "tax return", etc.
  createdAt: string;
  updatedAt: string;
  exportedPdfUri?: string;
}

interface DocumentPage {
  id: string;
  pageNumber: number;
  originalImageUri: string;
  processedImageUri?: string;
  ocrText: string;
  width: number;
  height: number;
}

interface DetectedField {
  id: string;
  pageId: string;
  label: string;
  normalizedLabel: string;
  fieldType: 'text' | 'date' | 'checkbox' | 'signature' | 'initial' | 'number';
  bounds: { x: number; y: number; width: number; height: number };  // Relative 0-1
  matchedProfileField?: string;   // e.g., "primary.firstName"
  matchedProfileId?: string;
  matchConfidence: number;        // 0.0-1.0
  value: string;
  originalValue?: string;
  isConfirmed: boolean;
  isSignatureField: boolean;
  signatureId?: string;
}
```

### 5.6 Signatures

```typescript
interface StoredSignature {
  id: string;
  profileId: string;
  type: 'drawn' | 'typed';
  label: string;                  // "Full signature", "Initials"
  imageUri?: string;              // PNG (for drawn)
  svgPath?: string;               // Vector (for drawn)
  text?: string;                  // (for typed)
  fontFamily?: string;            // (for typed)
  createdAt: string;
  isDefault: boolean;
}
```

### 5.7 SQLite Schema

```sql
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  is_primary INTEGER NOT NULL DEFAULT 0,
  relationship TEXT,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  maiden_name TEXT,
  date_of_birth TEXT,
  gender TEXT,
  nationality TEXT DEFAULT 'South African',
  marital_status TEXT,
  sa_id_number_encrypted TEXT,
  citizenship TEXT,
  email TEXT,
  phone_mobile TEXT,
  phone_work TEXT,
  employer TEXT,
  job_title TEXT,
  work_phone TEXT,
  employee_number TEXT,
  industry TEXT,
  highest_qualification TEXT,
  institution TEXT,
  year_completed INTEGER,
  student_number TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE addresses (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  street1 TEXT NOT NULL,
  street2 TEXT,
  suburb TEXT,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT DEFAULT 'South Africa',
  is_default INTEGER DEFAULT 0
);

CREATE TABLE identity_documents (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  label TEXT NOT NULL,
  encrypted_number TEXT NOT NULL,
  issue_date TEXT,
  expiry_date TEXT,
  issuing_authority TEXT,
  additional_fields_encrypted TEXT
);

CREATE TABLE professional_registrations (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  registration_number_encrypted TEXT NOT NULL,
  expiry_date TEXT
);

CREATE TABLE emergency_contacts (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phone TEXT NOT NULL,
  address_json TEXT
);

CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  title TEXT,
  status TEXT NOT NULL,
  source_type TEXT NOT NULL,
  document_type TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  exported_pdf_uri TEXT
);

CREATE TABLE document_pages (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  original_image_uri TEXT NOT NULL,
  processed_image_uri TEXT,
  ocr_text TEXT,
  width REAL,
  height REAL
);

CREATE TABLE detected_fields (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_id TEXT NOT NULL REFERENCES document_pages(id),
  label TEXT,
  normalized_label TEXT,
  field_type TEXT NOT NULL,
  bounds_json TEXT NOT NULL,
  matched_profile_field TEXT,
  matched_profile_id TEXT,
  match_confidence REAL DEFAULT 0,
  value TEXT,
  original_value TEXT,
  is_confirmed INTEGER DEFAULT 0,
  is_signature_field INTEGER DEFAULT 0,
  signature_id TEXT
);

CREATE TABLE signatures (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  label TEXT,
  image_uri TEXT,
  svg_path TEXT,
  text TEXT,
  font_family TEXT,
  created_at TEXT NOT NULL,
  is_default INTEGER DEFAULT 0
);
```

---

## 6. UI/UX Design Direction

### 6.1 Visual Style: Modern & Bold

- Strong typography with clear hierarchy (large headings, tight spacing)
- High contrast, confident use of color
- Sharp geometric elements, minimal ornamentation
- **Inspiration**: Linear, Vercel, Raycast

### 6.2 Color Palette: Purple-based

| Token | Dark Mode | Light Mode | Usage |
|---|---|---|---|
| Primary | #7C3AED (violet-600) | #7C3AED | Buttons, active states, brand |
| Primary variant | #A78BFA (violet-400) | #A78BFA | Highlights, secondary actions |
| Background | #0F0D15 | #FAFAF9 | App background |
| Surface | #1C1A27 | #FFFFFF | Cards, inputs, sheets |
| Text primary | #FFFFFF | #1A1A1A | Headings, body text |
| Text secondary | #9CA3AF (gray-400) | #6B7280 (gray-500) | Labels, hints |
| Success | #22C55E | #22C55E | Confirmed fields, high confidence |
| Warning | #F59E0B | #F59E0B | Medium confidence, needs review |
| Error | #EF4444 | #EF4444 | Low confidence, missing data |
| Accent | #06B6D4 (cyan) | #06B6D4 | Interactive highlights |

### 6.3 Dark Mode

- System-adaptive by default with manual toggle in Settings
- Both themes are first-class — not an afterthought
- Implementation: `useColorScheme()` from React Native + Zustand for manual override
- All colors defined as theme tokens in `src/theme/colors.ts`, never hardcoded

### 6.4 Processing UX: Smart Defaults

The document processing pipeline **auto-advances** through steps, only pausing when user input is required:

| Step | Auto/Pause | What Happens |
|---|---|---|
| Scan/Import | User action | User takes photo or picks file |
| OCR | Auto | Progress bar, auto-advances when done |
| Field Detection | Auto | Sends to AI, shows progress |
| Field Matching | **Pause** | User reviews detected fields, confirms/edits |
| Signature Consent | **Pause** | User approves signature placement |
| Export Preview | **Pause** | User reviews final PDF, chooses export action |

**Confidence-based UI**: High-confidence matches are pre-filled and collapsed. Low-confidence fields (<0.7) are expanded and highlighted for review.

**Quick actions**: Swipe right = confirm field, swipe left = skip field.

**Haptic feedback**: Subtle haptics on scan capture, field confirmation, and signature apply.

### 6.5 Key Screens

**Home Dashboard**:
- Large "Scan" FAB (floating action button) — the primary CTA
- Secondary "Import" button
- Recent documents as cards with status chips (matched, exported, etc.)
- Profile completeness indicator (encourages filling in more data for better matching)

**Field Review Screen** (core interaction):
- Document image fills the screen with semi-transparent field overlays
- Tap a field → bottom sheet with: matched value, confidence %, profile source, edit option
- Pinch to zoom on document
- "Confirm All" button for high-confidence batches
- Unmatched/low-confidence fields in a collapsible panel at bottom

**Signature Consent Screen**:
- Document preview with signature locations highlighted in purple
- Clear count: "3 signatures needed"
- Options: "Sign All" (blanket) or "Review Each"
- Signature preview shown before applying

**Export Preview**:
- Full filled PDF preview
- Bottom action bar: Share, Print, Save
- "Looks wrong?" link → back to field review

### 6.6 Typography

| Usage | Font | Weight |
|---|---|---|
| Headings | Inter | Bold / Semibold |
| Body text | Inter | Regular / Medium |
| Monospace (ID numbers, codes) | JetBrains Mono | Regular |
| Signature (drawn) | N/A | Freehand |
| Signature (typed) | Dancing Script, Great Vibes, Alex Brush, Pacifico | Regular |

### 6.7 Animations

Purposeful, not decorative:
- **Page transitions**: Shared element transitions for document images
- **Field detection**: Fields fade + scale in from their detected location
- **Signature apply**: Brief "stamp" animation
- **Loading states**: Skeleton screens (never spinners)

---

## 7. Document Processing Pipeline

### Stage 1: Document Input

**Camera scanning (iOS/Android)**:
- `@infinitered/react-native-mlkit-document-scanner` with `launchDocumentScannerAsync()`
- Auto edge detection, perspective correction, multi-page support
- Config: `pageLimit` up to 20, `galleryImportAllowed: true`
- Returns cropped, corrected images saved to `expo-file-system` documentDirectory

**Digital import**:
- `expo-document-picker` with `type: ['application/pdf', 'image/*']`
- For PDFs: render each page to image for OCR, keep original for form-field-aware filling
- Copy imported file to app's document directory

### Stage 2: OCR

**Native (iOS/Android)**:
- `@infinitered/react-native-mlkit-text-recognition`
- Returns structured results: text blocks → lines → elements, each with bounding boxes + confidence
- Stored per page in SQLite

**Platform abstraction**: `src/services/ocr/index.ts` exports `performOCR(imageUri): Promise<OCRResult>` that dispatches to ML Kit based on platform.

### Stage 3: Field Detection + Matching

Combined in a **single AI call** for efficiency.

**Online path**: App → Backend Proxy → Claude API (vision)
**Offline path**: On-device heuristic matcher

See [Section 8: AI Prompt Strategy](#8-ai-prompt-strategy) for full details.

### Stage 4: User Review

- Document image with bounding box overlays
- Color-coded confidence (green = high, amber = medium, red = low)
- Tap to edit value, change profile/dependent source, skip, or manually add missed fields
- Fields below 0.7 confidence auto-highlighted

### Stage 5: Signature Consent

- Dedicated consent screen when signature fields are detected
- **Per-field mode**: User sees each signature location and approves individually
- **Blanket mode**: User reviews all locations, approves all at once
- Summary: "This document has 3 signature fields on pages 1 and 3"
- Consent choice + timestamp stored for audit

### Stage 6: Fill & Export

**PDFs with AcroForm fields**: `pdf-lib` fills form fields directly (`form.getTextField(name).setText(value)`)

**Scanned documents / images**: `pdf-lib` draws text at bounding box coordinates over page image background (`page.drawText()` + `page.drawImage()` for signatures)

**Output**: Save to device, share via `expo-sharing`, print via `expo-print`

---

## 8. AI Prompt Strategy

### 8.1 Privacy Model

- **Only field names and types are sent to Claude** — never actual user data
- App sends: page images + OCR data + available profile field schema
- Claude returns: detected fields with bounding boxes + suggested profile field mappings
- Actual values are filled **on-device** after the mapping is returned

### 8.2 System Prompt

```
You are a document field detection and matching assistant. You analyze scanned
documents to identify fillable form fields and map them to a user's profile
data structure.

Your task:
1. Examine each page image and the OCR text with bounding boxes
2. Identify all fillable fields (text inputs, date fields, checkboxes,
   signature lines, initial lines)
3. For each field, determine what information it expects
4. Map each field to the most appropriate profile field path from the
   provided schema

Rules:
- A "fillable field" is any blank space, line, box, or area where a person
  would write/enter information
- Use the OCR text and visual layout together — labels are usually adjacent
  to their fields
- Distinguish between pre-printed text (not fillable) and blank areas (fillable)
- For checkboxes, identify what each option represents
- For signature/initial fields, mark them as type "signature" or "initial"
- Return confidence scores (0.0-1.0) for each mapping
- If a field doesn't match any profile field, set matchedField to null
- Be aware of South African document conventions (SA ID numbers, provinces, etc.)
```

### 8.3 Request Schema (app → proxy → Claude)

```typescript
interface AnalyzeRequest {
  pages: Array<{
    pageNumber: number;
    imageBase64: string;                // Compressed JPEG, max 1500px
    ocrBlocks: Array<{
      text: string;
      bounds: { x: number; y: number; width: number; height: number };
      confidence: number;
    }>;
  }>;
  availableFields: ProfileFieldSchema;  // Field names + types only, no values
}
```

### 8.4 Response Schema (Claude → proxy → app)

```typescript
interface AnalyzeResponse {
  fields: Array<{
    id: string;
    pageNumber: number;
    label: string;                      // "Full Name", "ID Nommer", etc.
    fieldType: 'text' | 'date' | 'checkbox' | 'signature' | 'initial' | 'number';
    bounds: { x: number; y: number; width: number; height: number };
    matchedField: string | null;        // "primary.firstName", "dependent.0.lastName"
    matchConfidence: number;            // 0.0-1.0
    notes?: string;                     // AI reasoning
  }>;
  documentType?: string;                // "medical form", "tax return", etc.
  documentLanguage?: string;            // "English", "Afrikaans", "bilingual"
}
```

### 8.5 Structured Output (Tool Use)

The proxy uses Claude's `tool_use` feature to enforce the response schema:

```json
{
  "name": "report_detected_fields",
  "description": "Report all detected fillable fields and their profile mappings",
  "input_schema": {
    "type": "object",
    "properties": {
      "fields": { "type": "array", "items": { ... } },
      "documentType": { "type": "string" },
      "documentLanguage": { "type": "string" }
    },
    "required": ["fields"]
  }
}
```

### 8.6 Offline Heuristic Fallback

When offline, the app uses a local matcher:

1. **Label dictionary** (~300 entries):
   - English: "First Name" → `firstName`, "Date of Birth" → `dateOfBirth`
   - Afrikaans: "Naam" → `firstName`, "Van" → `lastName`, "Geboortedatum" → `dateOfBirth`
   - SA-specific: "ID Nommer" → `saIdNumber`, "Mediese Fonds" → `documents.medicalAid`

2. **Fuzzy matching**: Levenshtein distance + token overlap for unlisted labels

3. **Field type inference**:
   - Dates: "date", "datum", "DD/MM/YYYY" patterns
   - Checkboxes: small square bounding boxes near text
   - Signatures: "signature", "sign", "handtekening", large empty boxes

4. **Confidence**: Exact dictionary match = 0.9, fuzzy = 0.5-0.8, no match = 0.0

### 8.7 Image Optimization

- Resize to max 1500px on longest edge
- JPEG compression at 80% quality
- ~2-3MB total payload for a 5-page document

### 8.8 Cost Estimation

- Typical 2-4 page form: ~2000-4000 input tokens + ~500 output tokens
- **~$0.03-0.08 USD per document** (Claude Sonnet pricing)
- Template caching eliminates repeat costs for common forms
- Consider Haiku for simple single-page forms

### 8.9 Error Handling

| Error | Response |
|---|---|
| Timeout (30s) | Fall back to heuristic |
| Rate limit (429) | Show "busy" state, queue retry |
| Malformed JSON | Retry once, then fall back to heuristic |
| Partial response | Use parsed fields + heuristic for remainder |

---

## 9. Backend Proxy Server

### 9.1 Purpose

- Hold Anthropic API key securely (never in the mobile app)
- Forward analysis requests to Claude API
- Cache responses for common form templates
- Log usage analytics (no PII)
- Rate limit per user

### 9.2 Authentication: OAuth (Google + Apple Sign-In)

- Users sign in via Google or Apple ID in the mobile app
- App sends OAuth ID token with each request to the proxy
- Proxy verifies token, extracts user ID for rate limiting and analytics
- Libraries: `google-auth-library`, `apple-signin-auth`

### 9.3 Template Caching

- Hash document "fingerprint" (form layout + label positions, **not** user data)
- Cache Claude's field detection response keyed by hash
- Cache hit → instant response, no Claude API call
- Storage: in-memory for MVP, Redis (Upstash) when scaling
- TTL: 30 days
- Dramatically reduces cost for common SA forms (SARS, medical aid, school enrollment)

### 9.4 Analytics (No PII)

| Scope | Metrics |
|---|---|
| Per-user | Documents processed count, last active timestamp |
| Per-request | Latency, token count, cache hit/miss, field count, confidence distribution |
| Global | DAU, popular document types, error rates |

Storage: Simple PostgreSQL table or structured logging. Dashboard: log queries initially, Grafana later.

### 9.5 API Endpoints

```
POST /auth/verify     # Verify OAuth token, return session
POST /analyze         # Main: images + OCR → Claude → detected fields
GET  /health          # Health check
GET  /usage           # User's own usage stats
```

### 9.6 Hosting: Fly.io

- Generous free tier (3 shared VMs, 3GB storage)
- Docker-based deployment
- Redis add-on available (or Upstash for free tier)
- Easy to scale if needed
- Latency acceptable — Claude API itself adds latency, so proxy overhead is minimal

---

## 10. Security

### 10.1 Encryption at Rest

- **AES-256-GCM** for all sensitive fields (document numbers, SA ID, medical info)
- 256-bit key generated on first launch via `expo-crypto.getRandomBytes(32)`
- Key stored in `expo-secure-store` (iOS Keychain / Android Keystore)
- Encrypted fields stored as `iv:ciphertext:tag` (base64) in SQLite
- Utility module: `src/utils/encryption.ts` — `encrypt(plaintext, key)` / `decrypt(ciphertext, key)`

### 10.2 App-Level Security

- **Biometric/PIN lock**: `expo-local-authentication` gates app access
- **Auto-lock**: Configurable timeout (default 5 min), requires re-authentication
- **Background clearing**: Sensitive data cleared from Zustand store when app backgrounds
- **No cloud by default**: All data on-device unless user explicitly enables backup
- **Secure clipboard**: Warn before copying sensitive fields, auto-clear after 60s

### 10.3 Network Security

- All proxy communication over HTTPS
- OAuth tokens verified server-side on every request
- Rate limiting prevents abuse
- No PII in analytics or logs

---

## 11. Offline-First Architecture

| Principle | Implementation |
|---|---|
| Local-first data | SQLite is source of truth; all reads/writes go to local DB |
| Network is optional | Only Claude API requires network; everything else works offline |
| Graceful degradation | Heuristic matcher auto-selected when offline; banner informs user |
| Queued operations | Cloud backup syncs queued when offline, executed on reconnect |
| Cached AI results | Template cache prevents redundant API calls for similar forms |

Network detection: `@react-native-community/netinfo` with `addEventListener`. Status stored in `settingsStore`.

---

## 12. Testing Strategy

### Target: 80%+ coverage (95%+ for critical modules)

### 12.1 Test Framework

| Tool | Purpose |
|---|---|
| Jest | Unit + integration tests across monorepo |
| React Native Testing Library | Component tests |
| Supertest | HTTP endpoint tests for server |
| Maestro (or Detox) | E2E mobile tests |

### 12.2 Unit Tests

| Module | What to Test |
|---|---|
| `shared/validation/saId.ts` | SA ID parsing, Luhn checksum, DOB/gender extraction, edge cases |
| `shared/types/` | Type guard functions, validation helpers |
| `mobile/services/ocr/` | OCR result normalization, bounding box calculations |
| `mobile/services/ai/heuristic.ts` | Offline label matching, fuzzy match accuracy |
| `mobile/services/pdf/generator.ts` | PDF field filling, coordinate mapping, signature embedding |
| `mobile/utils/encryption.ts` | Encrypt/decrypt roundtrip, key generation |
| `mobile/store/` | Zustand store actions and state transitions |
| `server/services/claude.ts` | Prompt construction, response parsing, error handling |
| `server/services/cache.ts` | Cache hit/miss, fingerprint hashing, TTL expiry |
| `server/middleware/auth.ts` | OAuth token verification, invalid token rejection |

### 12.3 Integration Tests

| Area | What to Test |
|---|---|
| SQLite database | Schema migrations, CRUD ops, encrypted field roundtrip |
| Backend API | Full flow: auth → analyze → Claude mock → response |
| OCR → AI pipeline | OCR output → heuristic matcher → verify field mappings |
| PDF generation | Fields + signature → valid PDF output |

### 12.4 E2E Tests (Maestro or Detox)

| Flow | Scenario |
|---|---|
| Onboarding | Create profile, add SA ID (verify auto-fill DOB/gender), add address |
| Import + fill | Import test PDF, verify fields detected, confirm all, export PDF |
| Signature flow | Create drawn signature, apply to document, verify in export |
| Offline mode | Disable network, import doc, verify heuristic matching works |
| Profile switching | Add dependent, scan form, switch fields between primary and dependent |

### 12.5 Server Tests

- Health check returns 200
- Auth rejects invalid/expired tokens
- Analyze returns correct schema on Claude mock
- Rate limiter blocks excess requests
- Cache returns cached response for same fingerprint
- Analytics logs non-PII metrics

### 12.6 Test Utilities

- **Mock Claude responses**: Fixture files with realistic responses for different SA form types
- **Test documents**: Sample SA forms (SARS IT12, medical aid application, school enrollment)
- **Test profiles**: Pre-built profile data for field matching tests

### 12.7 Coverage Enforcement

- `jest --coverage` with 80% threshold in CI
- Coverage reports uploaded as PR comments via GitHub Actions
- **Critical modules require 95%+**: encryption, SA ID validation, auth middleware

---

## 13. CI/CD Pipeline

### GitHub Actions

#### On Every PR: `ci.yml`

1. Install dependencies (pnpm)
2. Lint (ESLint + Prettier check)
3. Type check (`tsc --noEmit`) — all packages
4. Unit tests (Jest) — all packages
5. Integration tests — server with mocked Claude
6. Coverage report → PR comment
7. Block merge if coverage < 80% or any test fails

#### On Push to Main: `deploy-server.yml`

1. Run full test suite
2. Build server Docker image
3. Deploy to Fly.io (production)
4. Smoke test deployed endpoint (health + auth + analyze with mock)
5. Notify on failure (GitHub notification)

#### Release Builds: `build-mobile.yml` (manual trigger or tag-based)

1. Run full test suite
2. Trigger EAS Build for iOS + Android
3. Submit iOS build to TestFlight
4. Submit Android build to Google Play internal track
5. Create GitHub release with changelog

### Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Production-ready, auto-deploys server |
| `develop` | Integration branch (optional) |
| `feature/*` | Feature branches, PR to main |
| `release/*` | Release prep for mobile versions |

---

## 14. Phased Implementation

### Phase 1: Foundation (Weeks 1-3)

- [ ] Initialize Expo project with Router, TypeScript, ESLint, Prettier
- [ ] Set up pnpm monorepo (apps/mobile, packages/shared, server)
- [ ] Implement SQLite schema + migrations in `expo-sqlite`
- [ ] Build encryption utilities (`encrypt`, `decrypt`, key management)
- [ ] Implement SA ID validation with Luhn checksum + smart fill
- [ ] Build profile CRUD (primary user, dependents, addresses, documents)
- [ ] Set up Zustand stores (profile, settings)
- [ ] Build tab navigation + core UI components with theme tokens
- [ ] Implement dark/light mode with system detection + manual toggle

**Deliverable**: User can create profile, add dependents, store identity documents securely.

### Phase 2: Scanning + OCR (Weeks 4-6)

- [ ] Integrate ML Kit document scanner (iOS/Android)
- [ ] Implement `expo-document-picker` for file import
- [ ] Integrate ML Kit text recognition
- [ ] Build platform-aware OCR service abstraction
- [ ] Build OCR progress screen with per-page status
- [ ] Store OCR results in SQLite
- [ ] Implement image processing (crop, enhance) via `expo-image-manipulator`

**Deliverable**: User can scan or import a document and see extracted text.

### Phase 3: AI Field Detection + Matching (Weeks 7-10)

- [ ] Build backend proxy server (Hono + TypeScript)
- [ ] Implement Claude API integration with prompt engineering
- [ ] Implement template caching (in-memory → Redis)
- [ ] Implement OAuth token verification (Google + Apple)
- [ ] Deploy proxy to Fly.io with Docker
- [ ] Build mobile OAuth sign-in flow
- [ ] Build offline heuristic matcher with label dictionary
- [ ] Implement network-aware AI routing (cloud vs. offline)
- [ ] Build field detection overlay UI
- [ ] Build field matching/review screen (bottom sheet, confidence, editing)
- [ ] Implement processing state machine with resume capability

**Deliverable**: User scans a document, sees AI-detected fields matched to their profile, can review and correct.

### Phase 4: Signatures + PDF Export (Weeks 11-13)

- [ ] Integrate `react-native-signature-canvas` for drawn signatures
- [ ] Implement typed signatures with custom font rendering
- [ ] Build signature management screen
- [ ] Build signature consent flow (per-field + blanket modes)
- [ ] Implement PDF generation with `pdf-lib` (form fill + coordinate overlay)
- [ ] Implement export: save, share (`expo-sharing`), print (`expo-print`)
- [ ] Build export preview screen
- [ ] Build document history list

**Deliverable**: Full end-to-end flow. Scan → auto-fill → sign → export completed PDF.

### Phase 5: Polish + Cloud Backup (Weeks 14-16)

- [ ] Implement biometric/PIN lock (`expo-local-authentication`)
- [ ] Implement auto-lock + background data clearing
- [ ] Build Google Drive backup integration
- [ ] Build iCloud backup integration
- [ ] Build first-time onboarding flow
- [ ] Performance optimization (lazy loading, image caching, memory management)
- [ ] Accessibility audit (screen reader, contrast, tap targets)
- [ ] Add monetization hooks (abstract usage tier, currently unlimited)
- [ ] Set up analytics dashboard

**Deliverable**: Production-ready app with security hardening and cloud backup.

### Phase 6 (Future): Web Platform

- [ ] Tesseract.js for web OCR
- [ ] expo-camera for basic document capture
- [ ] Web Crypto API for encryption
- [ ] Web-specific UI adaptations

---

## 15. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Poor OCR on bad scans | Incorrect field detection | Pre-OCR image enhancement, retake/recrop, show confidence |
| AI field detection errors | Wrong fields filled | Always require user review, confidence thresholds, bounding box validation |
| PDF coordinate misalignment | Text at wrong positions | Relative coords (0-1) throughout, convert at export, preview step |
| Claude API latency/cost | Slow UX, high costs | Combined call, image compression, template caching, Haiku for simple forms |
| ML Kit scanner iOS support | Scanner may behave differently | Test early in Phase 2, have expo-camera fallback ready |
| Memory pressure on large docs | App crashes | Sequential page processing, thumbnails in UI, full-res only at export |
| PII data breach | Legal/trust impact | Encryption at rest, biometric lock, no PII in analytics, no data leaves device without consent |
| App name trademark conflict | Forced rebrand | Name defined in one place (app.json + constants), easy to change |

---

## 16. Verification Plan

| # | Test | How to Verify |
|---|---|---|
| 1 | Profiles | Create primary + dependent, restart app, verify data persists. Inspect SQLite — document numbers must be encrypted. |
| 2 | SA ID Smart Fill | Enter valid SA ID, verify DOB/gender/citizenship auto-populate. Enter invalid ID, verify error shown. |
| 3 | Scanning | Scan a multi-page paper form, verify pages captured with edge detection and perspective correction. |
| 4 | Import | Import a PDF, verify pages extracted as images for OCR. |
| 5 | OCR | Verify extracted text matches document content. Check bounding boxes overlay correctly. |
| 6 | Field Detection | Verify Claude returns structured field list. Bounding boxes must overlay correctly on document image. |
| 7 | Field Matching | Verify fields auto-populate with correct profile data. Test switching between primary and dependent. |
| 8 | Signatures | Draw and type signatures. Verify they render correctly in exported PDF at the right size and position. |
| 9 | Export | Verify filled PDF has text at correct positions, signatures embedded, and is shareable via system share sheet. |
| 10 | Offline | Disable network. Import doc. Verify heuristic matcher works, banner shows "offline mode". |
| 11 | Security | Verify biometric lock blocks access. Inspect SQLite DB — encrypted fields must not be readable as plaintext. |
| 12 | Template Cache | Scan same form type twice. Second scan should return instantly (cache hit logged on server). |
