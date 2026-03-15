# FillIt Tracker

A lightweight, self-contained project tracking board for the FillIt development effort. No servers, no build steps, no dependencies — just open `index.html` in your browser.

## Quick Start

1. Open `tracker/index.html` in any modern browser (Chrome, Firefox, Edge, Safari 15+)
2. The board loads pre-populated with the full FillIt work item breakdown (95 user stories, ~380 tasks across 16 epics)
3. Drag cards between columns to update status
4. Click any card to view details or edit

## Features

### Kanban Board

Five status columns reflecting a standard development workflow:

| Column | Meaning |
|---|---|
| **Backlog** | Not yet planned for a sprint |
| **To Do** | Planned and ready to start |
| **In Progress** | Actively being worked on |
| **Review** | Code complete, awaiting review or QA |
| **Done** | Shipped and verified |

Drag and drop cards between columns to update their status. Changes persist automatically.

### Work Item Hierarchy

All items follow a strict four-level hierarchy, mirroring Azure DevOps:

```
Epic
  └── Feature
        └── User Story
              └── Task
```

- **Epics** (16) — Major capability areas aligned with implementation phases
- **Features** (38) — Deliverable increments within each epic
- **User Stories** (95) — User-facing work items sized for 1–3 day delivery
- **Tasks** (~380) — Technical implementation steps within each story

Each item enforces its hierarchy — a Feature must belong to an Epic, a Story to a Feature, a Task to a Story.

### Sidebar Hierarchy Tree

The collapsible left sidebar displays the full Epic → Feature → Story → Task tree. Each parent shows a progress bar calculated recursively from its children's completion status.

- Click the **arrow** to expand/collapse a subtree
- Click an **item name** to filter the board to only that item's descendants
- Click again to clear the filter

### Filtering

The filter bar supports four simultaneous filters:

| Filter | Description |
|---|---|
| **Epic** | Show only items belonging to a specific epic |
| **Type** | Show only Epics, Features, User Stories, or Tasks |
| **Assignee** | Show only items assigned to a specific person |
| **Search** | Free-text search across titles and descriptions |

The stats indicator on the right shows `done/total` for the current filtered view.

### Card Design

Each card displays:

- **Color-coded left border** — Purple (Epic), Blue (Feature), Green (Story), Amber (Task)
- **Type badge** — Quick visual identifier
- **Priority dot** — Red (Critical), Amber (High), Blue (Medium), Gray (Low)
- **Short ID** — Extracted from the title (e.g., S-01, E1, F1.1)
- **Title** — The item name
- **Parent breadcrumb** — Shows ancestry path for context
- **Child count** — Badge showing number of children
- **Assignee initials** — Avatar circle with initials
- **Progress bar** — For parent items, shows % of children completed

### Item Detail Modal

Click any card to open the edit modal with:

- Title, description, type, status, priority
- Parent picker (filtered to valid parent types based on hierarchy rules)
- Assignee (free text)
- Tags (comma-separated)
- Created/updated timestamps
- Delete button (with confirmation, removes item and all descendants)

### New Items

Click **+ New Item** in the header to create a new work item. Select the type first — the parent dropdown will update to show only valid parents for that type.

## Data Persistence

### Automatic Saving

All changes are automatically saved to your browser's `localStorage` (key: `fillit-tracker-state`) with a 300ms debounce. Data persists across page refreshes and browser sessions.

### Export

Click **Export** in the header to download a JSON backup file named `fillit-tracker-YYYY-MM-DD.json`. This contains the complete state including all items and settings.

### Import

Click **Import** to load a previously exported JSON file. You'll see a confirmation dialog showing the item count before the import replaces your current data.

### First Load

On first visit (or if localStorage is empty/corrupted), the board auto-populates with the full FillIt work item breakdown derived from the [implementation plan](../implementation-plan/README.md).

### Resetting Data

To reset to the original seed data, clear the `fillit-tracker-state` key from your browser's localStorage:

```js
// In browser console
localStorage.removeItem('fillit-tracker-state');
location.reload();
```

## Work Item Breakdown Summary

The pre-populated data maps the FillIt implementation plan into the following epics:

| # | Epic | Phase | Stories | Priority |
|---|---|---|---|---|
| E1 | Project Infrastructure & Monorepo | 1 | 7 | Critical |
| E2 | Shared Types & Validation | 1 | 5 | Critical |
| E3 | Data Layer — SQLite & Encryption | 1 | 9 | Critical |
| E4 | State Management | 1 | 4 | High |
| E5 | Theme & UI Foundation | 1 | 5 | High |
| E6 | Profile Management UI | 1 | 8 | High |
| E7 | Document Scanning & OCR | 2 | 7 | High |
| E8 | Backend Proxy Server | 3 | 10 | High |
| E9 | Authentication | 3 | 3 | High |
| E10 | AI Field Detection & Matching | 3 | 9 | Critical |
| E11 | Signatures | 4 | 5 | High |
| E12 | PDF Generation & Export | 4 | 6 | High |
| E13 | Security Hardening | 5 | 3 | High |
| E14 | Cloud Backup | 5 | 4 | Medium |
| E15 | Onboarding & Polish | 5 | 6 | Medium |
| E16 | Web Platform (Future) | 6 | 4 | Low |

### Dependencies & Parallelization

Stories include dependency annotations in their descriptions (e.g., `[Depends: S-01]`). The breakdown is designed for up to 4 parallel workstreams:

- **Weeks 1–2**: Monorepo/Expo/CI, Shared types/validation, Server scaffold
- **Weeks 3–6**: Data layer, UI foundation + profile UI, Scanning/OCR, Server Claude integration
- **Weeks 7–10**: OAuth, AI client + heuristic matcher, Field detection UI
- **Weeks 11–13**: Signatures, PDF generation + export
- **Weeks 14–16**: Security, Cloud backup, Onboarding, Polish

Key bottlenecks to watch: S-15 (SQLite schema), S-22 (profile store), S-50 (analyze endpoint), S-67 (field matching screen).

## Technical Details

### Architecture

Three static files, zero external dependencies:

| File | Lines | Purpose |
|---|---|---|
| `index.html` | ~180 | Semantic HTML skeleton |
| `styles.css` | ~330 | Complete styling with CSS custom properties |
| `app.js` | ~1330 | State management, rendering, drag-and-drop, seed data |

### Browser Support

Requires a modern browser with support for:

- CSS Grid and Flexbox
- CSS Custom Properties
- HTML5 Drag and Drop API
- `localStorage`
- ES2020+ JavaScript (template literals, destructuring, optional chaining)

Tested in Chrome, Firefox, Edge, and Safari 15+.

### Touch Support

Mobile browsers get touch-based drag and drop via `touchstart`/`touchmove`/`touchend` event handlers, since HTML5 Drag and Drop API doesn't support touch.

### Storage Limits

`localStorage` is typically 5–10MB. Even with 500+ items including descriptions, the JSON state stays well under 1MB.

## Color Reference

### Work Item Types

| Type | Color | Hex |
|---|---|---|
| Epic | Purple | `#8B5CF6` |
| Feature | Blue | `#3B82F6` |
| User Story | Green | `#22C55E` |
| Task | Amber | `#F59E0B` |

### Priorities

| Priority | Color | Hex |
|---|---|---|
| Critical | Red | `#EF4444` |
| High | Amber | `#F59E0B` |
| Medium | Blue | `#3B82F6` |
| Low | Gray | `#6B7280` |

### Status Columns

| Status | Color | Hex |
|---|---|---|
| Backlog | Gray | `#6B7280` |
| To Do | Blue | `#3B82F6` |
| In Progress | Amber | `#F59E0B` |
| Review | Purple | `#8B5CF6` |
| Done | Green | `#22C55E` |
