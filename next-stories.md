# Stories Ready for Development

All foundation stories (S-01 through S-05) and S-08 are merged. **14 stories** are unblocked.

## Shared Package (`packages/shared`)

| Issue | Story                                   | Description                                           |
| ----- | --------------------------------------- | ----------------------------------------------------- |
| #10   | **S-09**: Document & field interfaces   | Document, Page, Field types with enums and confidence |
| #11   | **S-10**: SA ID validation & smart fill | Luhn check, extract DOB/gender/citizenship from ID    |
| #13   | **S-12**: SA provinces & constants      | Province data, validation constants                   |

## Mobile (`apps/mobile`)

| Issue | Story                                   | Description                                           |
| ----- | --------------------------------------- | ----------------------------------------------------- |
| #14   | **S-13**: AES-256-GCM encryption module | Encrypt/decrypt sensitive data at rest                |
| #22   | **S-21**: Local file storage service    | File read/write/delete for images, PDFs, signatures   |
| #24   | **S-23**: Settings Zustand store        | Theme, security, network state with persistence       |
| #27   | **S-26**: Theme token system            | Design tokens, dark/light mode, color palette         |
| #28   | **S-27**: Load custom fonts             | Inter, JetBrains Mono, splash screen during load      |
| #43   | **S-42**: ML Kit OCR service            | Text recognition with bounding boxes and confidence   |
| #46   | **S-45**: Image processing utilities    | Resize, compress, rotate, contrast/brightness for OCR |

## Server (`apps/server`)

| Issue | Story                                       | Description                                          |
| ----- | ------------------------------------------- | ---------------------------------------------------- |
| #47   | **S-46**: Hono server with middleware stack | CORS, logging, error handling, request ID middleware |

## CI/CD

| Issue | Story                                | Description                                             |
| ----- | ------------------------------------ | ------------------------------------------------------- |
| #7    | **S-06**: Server deployment workflow | Auto-deploy to Fly.io on merge, health checks, rollback |
| #8    | **S-07**: Mobile build workflow      | EAS Build for iOS/Android release builds                |

## Recommended Priority

**Critical path** (unblocks the most downstream work):

1. **S-09, S-10** — together with S-08 (done), these gate the database schema (S-15), CRUD ops, and the entire data layer
2. **S-46** — gates the full backend API chain (OAuth, Claude API, rate limiting, analytics)
3. **S-13** — gates key management (S-14) which gates all encrypted storage
4. **S-26, S-27** — gate the UI component library (S-28) and navigation shell (S-29)
