# Stories Ready for Development

## Completed

S-01 through S-07 (foundation + server deployment + mobile build), S-08 (profile types), S-09 (document types), S-10 (SA ID validation), S-11 (field normalization), S-12 (provinces), S-13 (encryption), S-14 (secure key management), S-15 (SQLite schema), S-16 through S-20 (all CRUD operations), S-21 (file storage), S-22 (profile Zustand store), S-23 (settings store), S-24 (document Zustand store), S-25 (processing state machine store), S-26 (theme tokens), S-27 (custom fonts), S-28 (UI components), S-29 (navigation shell), S-30 (skeleton loading), S-46 (server middleware), S-55 (server deploy), S-96 (Maestro E2E infra) are all merged.

## Unblocked Stories

These stories have all dependencies satisfied and are ready to build **now**.

### Phase 1 — Profile UI (newly unblocked by S-22)

| Issue | Story                            | Description                                      | Unblocked by     |
| ----- | -------------------------------- | ------------------------------------------------ | ---------------- |
| #32   | **S-31**: Profile form component | Form fields with SA ID smart fill and validation | S-22, S-28, S-10 |

### Phase 1 — Brand

| Issue | Story                               | Description                                  | Unblocked by |
| ----- | ----------------------------------- | -------------------------------------------- | ------------ |
| #148  | **S-97**: App logo & brand identity | Design logo, brand identity, apply to assets | None         |

### Phase 2 — Scanning

| Issue | Story                                | Description                                           | Unblocked by |
| ----- | ------------------------------------ | ----------------------------------------------------- | ------------ |
| #40   | **S-39**: ML Kit document scanner    | Camera scanning with edge detection, multi-page       | S-21, S-19   |
| #43   | **S-42**: ML Kit OCR service         | Text recognition with bounding boxes and confidence   | S-02         |
| #46   | **S-45**: Image processing utilities | Resize, compress, rotate, contrast/brightness for OCR | S-02         |

### Phase 3 — Backend

| Issue | Story                               | Description                                    | Unblocked by |
| ----- | ----------------------------------- | ---------------------------------------------- | ------------ |
| #48   | **S-47**: OAuth token verification  | Verify Google/Apple OAuth tokens on API routes | S-46         |
| #50   | **S-49**: Claude API service        | Claude integration with prompt engineering     | S-46, S-09   |
| #52   | **S-51**: Document fingerprinting   | Fingerprint documents for template matching    | S-46         |
| #54   | **S-53**: Analytics logging service | Server-side analytics and logging              | S-46         |

### Phase 3 — AI Detection

| Issue | Story                                         | Description                                     | Unblocked by |
| ----- | --------------------------------------------- | ----------------------------------------------- | ------------ |
| #62   | **S-61**: Label dictionary for SA forms       | Lookup dictionary for South African form labels | S-11         |
| #66   | **S-65**: Document viewer with field overlays | View document with detected field overlay UI    | S-28         |

### Phase 4 — Signatures

| Issue | Story                               | Description                          | Unblocked by     |
| ----- | ----------------------------------- | ------------------------------------ | ---------------- |
| #69   | **S-68**: Drawn signature canvas    | Freehand signature drawing component | S-20, S-28       |
| #70   | **S-69**: Typed signature component | Type-to-sign with font selection     | S-27, S-20, S-28 |

### Phase 4 — PDF

| Issue | Story                                  | Description                            | Unblocked by |
| ----- | -------------------------------------- | -------------------------------------- | ------------ |
| #74   | **S-73**: PDF generation for form-fill | Generate filled PDFs using pdf-lib     | S-09         |
| #76   | **S-75**: PDF rendering for preview    | Render PDF pages for on-screen preview | S-02         |

### Phase 5 — Security

| Issue | Story                              | Description                  | Unblocked by |
| ----- | ---------------------------------- | ---------------------------- | ------------ |
| #80   | **S-79**: Biometric authentication | Face ID / fingerprint unlock | S-23         |

### Phase 5 — Cloud Backup

| Issue | Story                           | Description                    | Unblocked by |
| ----- | ------------------------------- | ------------------------------ | ------------ |
| #85   | **S-84**: iCloud backup service | Backup/restore data via iCloud | S-15         |

### Phase 5 — Polish

| Issue | Story                                    | Description                      | Unblocked by |
| ----- | ---------------------------------------- | -------------------------------- | ------------ |
| #90   | **S-89**: Monetization abstraction layer | Payment/subscription abstraction | S-23         |

### Phase 6 — Web (future)

| Issue | Story                               | Description                               | Unblocked by |
| ----- | ----------------------------------- | ----------------------------------------- | ------------ |
| #95   | **S-94**: Web Crypto API encryption | Browser-based encryption for web platform | S-13         |
| #96   | **S-95**: Adapt UI for web viewport | Responsive layout for web browsers        | S-29         |

## Recommended Parallel Groups

These stories are independent and can be built simultaneously. Prioritize by what unblocks the most downstream work.

### Group A — Profile UI (critical path)

| Story                            | Why                                                                     |
| -------------------------------- | ----------------------------------------------------------------------- |
| **S-31**: Profile form component | Gates S-32 (profile edit) → entire profile UI chain (S-33 through S-37) |

### Group B — Scanning Pipeline

| Story                             | Why                                                |
| --------------------------------- | -------------------------------------------------- |
| **S-39**: ML Kit document scanner | Gates S-40 (scan review) → S-44 (OCR progress)     |
| **S-42**: ML Kit OCR service      | Gates S-43 (OCR abstraction) → entire OCR pipeline |
| **S-45**: Image processing        | Gates S-60 (image optimization for API)            |

### Group C — Backend API (critical path, unblocks auth + AI)

| Story                             | Why                                                                     |
| --------------------------------- | ----------------------------------------------------------------------- |
| **S-47**: OAuth middleware        | Gates S-48 (rate limiting), S-56 (Google Sign-In), all protected routes |
| **S-49**: Claude API service      | Gates S-50 (analyze endpoint) → AI detection pipeline                   |
| **S-51**: Document fingerprinting | Gates S-52 (template cache)                                             |
| **S-53**: Analytics logging       | Gates S-54 (usage stats)                                                |

### Group D — AI Detection (independent)

| Story                      | Why                                                 |
| -------------------------- | --------------------------------------------------- |
| **S-61**: Label dictionary | Gates S-62 (fuzzy matching) → field detection chain |
| **S-65**: Document viewer  | Gates S-66 (field editor) → S-67 (matching/review)  |

### Group E — Signatures + PDF (independent)

| Story                     | Why                                                  |
| ------------------------- | ---------------------------------------------------- |
| **S-68**: Drawn signature | Gates S-70 (preview) → management screens            |
| **S-69**: Typed signature | Gates S-70 (preview) → management screens            |
| **S-73**: PDF form-fill   | Gates S-74 (scanned overlay) → S-76 (export preview) |
| **S-75**: PDF preview     | Gates S-76 (export preview)                          |

## Maximum Parallelism

All 5 groups (A–E) are fully independent — **up to 20 stories** can be built in parallel. For practical prioritization:

1. **Groups A + C** (5 stories) — critical path, unblocks the most downstream work
2. **Group B** (3 stories) — unblocks the scanning/OCR pipeline
3. **Groups D + E** (6 stories) — can run alongside once bandwidth allows
4. **Phase 5/6 stories** (6 stories) — lower priority, no downstream blockers
