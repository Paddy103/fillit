# Stories Ready for Development

## Completed (79 stories)

**Phase 1 — Foundation (43 stories):** S-01 through S-38, S-46, S-55, S-96, S-97
All foundation complete: monorepo, types, validation, theme, UI components, navigation, stores, database, encryption, profiles, home dashboard, server deploy.

**Phase 2 — Scanning + OCR (7 stories):** S-39 through S-45
All scanning complete: ML Kit scanner, scan review, file import, OCR service, platform abstraction, OCR progress, image processing.

**Phase 3 — AI Detection + Backend (16 stories):** S-47 through S-53, S-59 through S-67
All AI/backend complete: OAuth, rate limiting, Claude API, analyze endpoint, template cache, fingerprinting, proxy client, image optimization, label dictionary, fuzzy matching, document viewer, field editor, field detection progress, network-aware routing, field matching/review.

**Phase 4 — Signatures (5 stories):** S-68, S-69, S-70, S-71, S-72
Drawn signature canvas, typed signature, signature preview, signature management screen, signature consent screen — all complete.

**Phase 4 — PDF + Export + History (6 stories):** S-73, S-74, S-75, S-76, S-77, S-78
PDF form-fill, scanned overlay, PDF preview, export preview, share/save/print, document history — all complete. **End-to-end export pipeline done!**

**Phase 3 — Mobile Auth (2 stories):** S-56, S-57
Google Sign-In and Apple Sign-In — complete. Unblocks S-58 (sign-in screen).

**Phase 5 — Security (1 story):** S-79
Biometric authentication (Face ID, fingerprint, device PIN fallback) — complete. Unblocks S-80, S-81.

## Unblocked Stories

These stories have all dependencies satisfied and are ready to build **now**.

### Newly Unblocked!

| Issue | Story                                 | Description                     | Unblocked by |
| ----- | ------------------------------------- | ------------------------------- | ------------ |
| #59   | **S-58**: Sign-in screen + auth guard | Sign-in UI + route protection   | S-56, S-57   |
| #81   | **S-80**: Auto-lock on background     | Lock app when backgrounded      | S-79         |
| #82   | **S-82**: Google Drive backup service | Backup/restore via Google Drive | S-56         |

### Phase 5 — Cloud Backup

| Issue | Story                           | Description                    | Unblocked by |
| ----- | ------------------------------- | ------------------------------ | ------------ |
| #85   | **S-84**: iCloud backup service | Backup/restore data via iCloud | S-15         |

### Phase 5 — Polish

| Issue | Story                                    | Description                         | Unblocked by |
| ----- | ---------------------------------------- | ----------------------------------- | ------------ |
| #54   | **S-54**: Usage stats endpoint           | Server-side usage statistics        | S-53         |
| #87   | **S-86**: First-time onboarding screens  | 3-4 slide walkthrough for new users | S-29, S-32   |
| #88   | **S-87**: Lazy loading + memory mgmt     | Performance optimization            | —            |
| #89   | **S-88**: Accessibility audit            | A11y remediation                    | —            |
| #90   | **S-89**: Monetization abstraction layer | Tier system + feature gates         | S-23         |

### Phase 6 — Web (future)

| Issue | Story                               | Description               | Unblocked by |
| ----- | ----------------------------------- | ------------------------- | ------------ |
| #93   | **S-92**: Tesseract.js web OCR      | Browser-based OCR         | —            |
| #95   | **S-94**: Web Crypto API encryption | Browser-based encryption  | S-13         |
| #96   | **S-95**: Adapt UI for web viewport | Responsive layout for web | S-29         |

## Blocked Stories (next wave)

| Issue | Story                                  | Blocked by         | Unlocks |
| ----- | -------------------------------------- | ------------------ | ------- |
| #81   | **S-81**: Security settings UI         | S-80               | —       |
| #83   | **S-83**: Google Drive backup settings | S-82               | —       |
| #85   | **S-85**: iCloud backup settings       | S-84               | —       |
| #91   | **S-90**: Mobile analytics integration | S-53               | —       |
| #92   | **S-91**: Complete settings screen     | S-79✅, S-82, S-84 | —       |
| #94   | **S-93**: Web camera capture           | S-92               | —       |

## Critical Path

```
CRITICAL PATH COMPLETE! End-to-end document export is done.
Scan → OCR → AI Detection → Field Matching → Signatures → PDF → Export → Share/Print
```

## Recommended Priority

1. **S-58** — sign-in screen + auth guard (just unblocked! needed for production)
2. **S-80** — auto-lock on background (just unblocked, continues security chain)
3. **S-82** — Google Drive backup (just unblocked by S-56)
4. **S-84** — iCloud backup (starts iOS backup chain)
5. **S-86** — onboarding screens (first-time user experience)
6. **Phase 5+ stories** — polish, monetization, web

## All Open Stories (21 remaining)

| #    | Story                        | Phase | Status                |
| ---- | ---------------------------- | ----- | --------------------- |
| S-54 | Usage stats endpoint         | 3     | Unblocked             |
| S-58 | Sign-in screen + auth guard  | 3     | **Newly unblocked!**  |
| S-80 | Auto-lock on background      | 5     | **Newly unblocked!**  |
| S-81 | Security settings UI         | 5     | Blocked by S-80       |
| S-82 | Google Drive backup          | 5     | **Newly unblocked!**  |
| S-83 | Google Drive backup settings | 5     | Blocked by S-82       |
| S-84 | iCloud backup service        | 5     | Unblocked             |
| S-85 | iCloud backup settings       | 5     | Blocked by S-84       |
| S-86 | First-time onboarding        | 5     | Unblocked             |
| S-87 | Lazy loading + memory mgmt   | 5     | Unblocked             |
| S-88 | Accessibility audit          | 5     | Unblocked             |
| S-89 | Monetization abstraction     | 5     | Unblocked             |
| S-90 | Mobile analytics integration | 5     | Blocked by S-53       |
| S-91 | Complete settings screen     | 5     | Blocked by S-82, S-84 |
| S-92 | Tesseract.js web OCR         | 6     | Unblocked             |
| S-93 | Web camera capture           | 6     | Blocked by S-92       |
| S-94 | Web Crypto API encryption    | 6     | Unblocked             |
| S-95 | Adapt UI for web viewport    | 6     | Unblocked             |
