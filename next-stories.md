# Stories Ready for Development

## Completed (73 stories)

**Phase 1 — Foundation (43 stories):** S-01 through S-38, S-46, S-55, S-96, S-97
All foundation complete: monorepo, types, validation, theme, UI components, navigation, stores, database, encryption, profiles, home dashboard, server deploy.

**Phase 2 — Scanning + OCR (7 stories):** S-39 through S-45
All scanning complete: ML Kit scanner, scan review, file import, OCR service, platform abstraction, OCR progress, image processing.

**Phase 3 — AI Detection + Backend (16 stories):** S-47 through S-53, S-59 through S-67
All AI/backend complete: OAuth, rate limiting, Claude API, analyze endpoint, template cache, fingerprinting, proxy client, image optimization, label dictionary, fuzzy matching, document viewer, field editor, field detection progress, network-aware routing, field matching/review.

**Phase 4 — Signatures (5 stories):** S-68, S-69, S-70, S-71, S-72
Drawn signature canvas, typed signature, signature preview, signature management screen, signature consent screen — all complete.

**Phase 4 — PDF (3 stories):** S-73, S-74, S-75
PDF form-fill generation, scanned document overlay, and PDF rendering for preview — all complete.

## Unblocked Stories

These stories have all dependencies satisfied and are ready to build **now**.

### Phase 4 — Export (just unblocked!)

| Issue | Story                                  | Description                            | Unblocked by |
| ----- | -------------------------------------- | -------------------------------------- | ------------ |
| #77   | **S-76**: Export preview screen        | Preview filled PDF before exporting    | S-72, S-75   |
| #79   | **S-78**: Document history list screen | Document list with thumbnails + search | S-24, S-29   |

### Phase 3 — Mobile Auth

| Issue | Story                              | Description               | Unblocked by |
| ----- | ---------------------------------- | ------------------------- | ------------ |
| #57   | **S-56**: Google Sign-In on mobile | Google OAuth sign-in flow | S-47         |
| #58   | **S-57**: Apple Sign-In on mobile  | Apple Sign-In flow        | S-47         |

### Phase 5 — Security

| Issue | Story                              | Description                  | Unblocked by |
| ----- | ---------------------------------- | ---------------------------- | ------------ |
| #80   | **S-79**: Biometric authentication | Face ID / fingerprint unlock | S-23         |

### Phase 5 — Cloud Backup

| Issue | Story                           | Description                    | Unblocked by |
| ----- | ------------------------------- | ------------------------------ | ------------ |
| #85   | **S-84**: iCloud backup service | Backup/restore data via iCloud | S-15         |

### Phase 5 — Polish

| Issue | Story                                    | Description                         | Unblocked by |
| ----- | ---------------------------------------- | ----------------------------------- | ------------ |
| #87   | **S-86**: First-time onboarding screens  | 3-4 slide walkthrough for new users | S-29, S-32   |
| #90   | **S-89**: Monetization abstraction layer | Tier system + feature gates         | S-23         |

### Phase 6 — Web (future)

| Issue | Story                               | Description               | Unblocked by |
| ----- | ----------------------------------- | ------------------------- | ------------ |
| #95   | **S-94**: Web Crypto API encryption | Browser-based encryption  | S-13         |
| #96   | **S-95**: Adapt UI for web viewport | Responsive layout for web | S-29         |

## Blocked Stories (next wave)

These become unblocked once their dependencies ship.

| Issue | Story                                    | Blocked by         | Unlocks |
| ----- | ---------------------------------------- | ------------------ | ------- |
| #55   | **S-54**: Usage stats endpoint           | **S-53** (done)    | —       |
| #59   | **S-58**: Sign-in screen + auth guard    | **S-56**, **S-57** | —       |
| #78   | **S-77**: Share, save, and print actions | **S-76**           | —       |

## Critical Path

The shortest path to end-to-end document completion:

```
S-76 (export preview) → S-77 (share/save/print) → DONE!
```

**S-76 is now unblocked — only 2 stories left on the critical path!**

## Recommended Priority

1. **S-76** — export preview screen (critical path, unblocks share/print — the finish line!)
2. **S-78** — document history list (independent, needed for usable app)
3. **S-56 + S-57** — mobile sign-in (unblocks auth guard S-58)
4. **Phase 5+ stories** — security, backup, polish, lower priority

## All Open Stories (27 remaining)

| #    | Story                        | Phase | Status                         |
| ---- | ---------------------------- | ----- | ------------------------------ |
| S-54 | Usage stats endpoint         | 3     | Unblocked (S-53 done)          |
| S-56 | Google Sign-In               | 3     | Unblocked                      |
| S-57 | Apple Sign-In                | 3     | Unblocked                      |
| S-58 | Sign-in screen + auth guard  | 3     | Blocked by S-56, S-57          |
| S-76 | Export preview screen        | 4     | **Unblocked — critical path!** |
| S-77 | Share, save, print           | 4     | Blocked by S-76                |
| S-78 | Document history list        | 4     | Unblocked                      |
| S-79 | Biometric authentication     | 5     | Unblocked                      |
| S-80 | Auto-lock on background      | 5     | Blocked by S-79                |
| S-81 | Security settings UI         | 5     | Blocked by S-79, S-80          |
| S-82 | Google Drive backup          | 5     | Blocked by S-56                |
| S-83 | Google Drive backup settings | 5     | Blocked by S-82                |
| S-84 | iCloud backup service        | 5     | Unblocked                      |
| S-85 | iCloud backup settings       | 5     | Blocked by S-84                |
| S-86 | First-time onboarding        | 5     | Unblocked                      |
| S-87 | Lazy loading + memory mgmt   | 5     | Unblocked                      |
| S-88 | Accessibility audit          | 5     | Unblocked                      |
| S-89 | Monetization abstraction     | 5     | Unblocked                      |
| S-90 | Mobile analytics integration | 5     | Blocked by S-53                |
| S-91 | Complete settings screen     | 5     | Blocked by S-79, S-82, S-84    |
| S-92 | Tesseract.js web OCR         | 6     | Unblocked                      |
| S-93 | Web camera capture           | 6     | Blocked by S-92                |
| S-94 | Web Crypto API encryption    | 6     | Unblocked                      |
| S-95 | Adapt UI for web viewport    | 6     | Unblocked                      |
