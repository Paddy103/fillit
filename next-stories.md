# Stories Ready for Development

## Completed (63 stories)

**Phase 1 — Foundation (43 stories):** S-01 through S-38, S-46, S-55, S-96, S-97
All foundation complete: monorepo, types, validation, theme, UI components, navigation, stores, database, encryption, profiles, home dashboard, server deploy.

**Phase 2 — Scanning + OCR (7 stories):** S-39 through S-45
All scanning complete: ML Kit scanner, scan review, file import, OCR service, platform abstraction, OCR progress, image processing.

**Phase 3 — AI Detection + Backend (12 stories):** S-47, S-48, S-49, S-50, S-51, S-52, S-60, S-61, S-62, S-65, S-66
OAuth middleware (PR #202), rate limiting (PR #205), Claude API service (PR #204), analyze endpoint + template cache (PR #212), document fingerprinting (PR #209), image optimization (PR #199), label dictionary (PR #121), fuzzy matching (PR #121), document viewer (PR #199), field editor bottom sheet (PR #200).

**Phase 4 — Signatures (2 stories):** S-68, S-69
Drawn signature canvas + typed signature component (PR #201).

## Unblocked Stories

These stories have all dependencies satisfied and are ready to build **now**.

### Phase 3 — Backend + Mobile (critical path)

| Issue | Story | Description | Unblocked by |
|-------|-------|-------------|-------------|
| #60 | **S-59**: Backend proxy API client | Mobile service to call POST /api/analyze | S-50 |
| #54 | **S-53**: Analytics logging service | Server-side analytics and event logging | S-46 |

### Phase 3 — Mobile Auth

| Issue | Story | Description | Unblocked by |
|-------|-------|-------------|-------------|
| #57 | **S-56**: Google Sign-In on mobile | Google OAuth sign-in flow | S-47 |
| #58 | **S-57**: Apple Sign-In on mobile | Apple Sign-In flow | S-47 |

### Phase 4 — Signatures

| Issue | Story | Description | Unblocked by |
|-------|-------|-------------|-------------|
| #71 | **S-70**: Signature preview component | Render drawn/typed signatures consistently | S-68, S-69 |

### Phase 4 — PDF

| Issue | Story | Description | Unblocked by |
|-------|-------|-------------|-------------|
| #74 | **S-73**: PDF generation for form-fill | Fill AcroForm fields using pdf-lib | S-09 |
| #76 | **S-75**: PDF rendering for preview | Render PDF pages for on-screen preview | S-02 |
| #79 | **S-78**: Document history list screen | Document list with thumbnails, status, search | S-24, S-29 |

### Phase 5 — Security

| Issue | Story | Description | Unblocked by |
|-------|-------|-------------|-------------|
| #80 | **S-79**: Biometric authentication | Face ID / fingerprint unlock | S-23 |

### Phase 5 — Cloud Backup

| Issue | Story | Description | Unblocked by |
|-------|-------|-------------|-------------|
| #85 | **S-84**: iCloud backup service | Backup/restore data via iCloud | S-15 |

### Phase 5 — Polish

| Issue | Story | Description | Unblocked by |
|-------|-------|-------------|-------------|
| #87 | **S-86**: First-time onboarding screens | 3-4 slide walkthrough for new users | S-29, S-32 |
| #90 | **S-89**: Monetization abstraction layer | Tier system + feature gates | S-23 |

### Phase 6 — Web (future)

| Issue | Story | Description | Unblocked by |
|-------|-------|-------------|-------------|
| #95 | **S-94**: Web Crypto API encryption | Browser-based encryption | S-13 |
| #96 | **S-95**: Adapt UI for web viewport | Responsive layout for web | S-29 |

## Blocked Stories (next wave)

These become unblocked once their dependencies ship.

| Issue | Story | Blocked by | Unlocks |
|-------|-------|-----------|---------|
| #55 | **S-54**: Usage stats endpoint | **S-53** | — |
| #59 | **S-58**: Sign-in screen + auth guard | **S-56**, **S-57** | — |
| #64 | **S-63**: Network-aware AI routing | **S-59** | S-64 (progress screen) |
| #65 | **S-64**: Field detection progress screen | S-63 | S-67 (matching/review) |
| #68 | **S-67**: Field matching/review screen | S-64 | — |
| #72 | **S-71**: Signature management screen | **S-70** | S-72 (consent) |
| #73 | **S-72**: Signature consent screen | S-70, S-67 | S-76 (export preview) |

## Critical Path

The shortest path to end-to-end AI field detection:

```
S-59 (proxy client) → S-63 (AI routing) → S-64 (progress screen) → S-67 (matching/review)
```

**S-59 is the current blocker.** It's now unblocked and ready to build.

## Recommended Priority

1. **S-59** — mobile proxy client, next on critical path (unblocked!)
2. **S-53** — analytics logging, unblocks usage stats
3. **S-56 + S-57** — mobile sign-in, unblocks auth guard (S-58)
4. **S-56 + S-57** — mobile sign-in, unblocks auth guard (S-58)
5. **S-70** — continues signature chain (S-71, S-72)
6. **S-73 + S-75** — PDF generation, independent track
7. **Phase 5 stories** — polish, lower priority
