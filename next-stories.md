# Stories Ready for Development

## Completed

S-01 through S-07 (foundation + server deployment + mobile build), S-08 (profile types), S-09 (document types), S-10 (SA ID validation), S-11 (field normalization), S-12 (provinces), S-13 (encryption), S-46 (server middleware) are all merged.

## Newly Unblocked Stories

These stories have all dependencies satisfied and are ready to build **now**.

### Mobile (`apps/mobile`)

| Issue | Story                                   | Description                                           | Unblocked by     |
| ----- | --------------------------------------- | ----------------------------------------------------- | ---------------- |
| #15   | **S-14**: Secure key management service | Key generation, rotation, biometric gating            | S-13             |
| #16   | **S-15**: SQLite schema and migrations  | Database tables for profiles, documents, fields       | S-03, S-08, S-09 |
| #22   | **S-21**: Local file storage service    | File read/write/delete for images, PDFs, signatures   | S-03             |
| #24   | **S-23**: Settings Zustand store        | Theme, security, network state with persistence       | S-03             |
| #27   | **S-26**: Theme token system            | Design tokens, dark/light mode, color palette         | S-03             |
| #28   | **S-27**: Load custom fonts             | Inter, JetBrains Mono, splash screen during load      | S-03             |
| #43   | **S-42**: ML Kit OCR service            | Text recognition with bounding boxes and confidence   | S-03             |
| #46   | **S-45**: Image processing utilities    | Resize, compress, rotate, contrast/brightness for OCR | S-03             |

### Server (`apps/server`)

| Issue | Story                                         | Description                                    | Unblocked by |
| ----- | --------------------------------------------- | ---------------------------------------------- | ------------ |
| #48   | **S-47**: OAuth token verification middleware | Verify Google/Apple OAuth tokens on API routes | S-46         |

## Recommended Parallel Groups

These stories are independent and can be built simultaneously.

### Group A — Data Layer (critical path)

| Story                    | Why                                                                     |
| ------------------------ | ----------------------------------------------------------------------- |
| **S-15**: SQLite schema  | Gates ALL CRUD operations (S-16 through S-20) and the entire data layer |
| **S-14**: Key management | Gates encrypted CRUD (S-18), biometric auth (S-79)                      |

### Group B — UI Foundation

| Story                    | Why                                      |
| ------------------------ | ---------------------------------------- |
| **S-26**: Theme tokens   | Gates UI component library (S-28)        |
| **S-27**: Custom fonts   | Gates UI component library (S-28)        |
| **S-23**: Settings store | Gates theme switching, security settings |

### Group C — Backend API Chain

| Story                      | Why                                                                          |
| -------------------------- | ---------------------------------------------------------------------------- |
| **S-47**: OAuth middleware | Gates rate limiting (S-48), Claude API endpoint (S-50), all protected routes |

### Group D — Mobile Services

| Story                      | Why                                                    |
| -------------------------- | ------------------------------------------------------ |
| **S-21**: File storage     | Gates document scanning, PDF export, signature storage |
| **S-42**: ML Kit OCR       | Gates OCR pipeline, document processing                |
| **S-45**: Image processing | Gates image optimization for API submission            |

## Maximum Parallelism

All 4 groups (A-D) are fully independent — **up to 12 stories** can be built in parallel. For practical parallelism, prioritize Groups A + B + C (8 stories) as they unblock the most downstream work.
