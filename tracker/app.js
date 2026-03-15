// ============================================================
// FillIt Tracker — app.js
// Static Kanban board with localStorage persistence
// ============================================================

const STORAGE_KEY = 'fillit-tracker-state';
const SCHEMA_VERSION = 2;
const STATUSES = ['Backlog', 'ToDo', 'InProgress', 'Review', 'Done'];
const TYPES = ['Epic', 'Feature', 'UserStory', 'Task'];
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const TYPE_LABELS = { Epic: 'Epic', Feature: 'Feature', UserStory: 'Story', Task: 'Task' };
const STATUS_LABELS = {
  Backlog: 'Backlog',
  ToDo: 'To Do',
  InProgress: 'In Progress',
  Review: 'Review',
  Done: 'Done',
};

// Pipeline stages for agent-driven development workflow
const PIPELINE_STAGES = [
  'none',
  'building',
  'testing',
  'reviewing',
  'qa',
  'awaiting-approval',
  'merging',
  'deployed',
];
const PIPELINE_LABELS = {
  none: '',
  building: 'Building',
  testing: 'Testing',
  reviewing: 'Code Review',
  qa: 'QA',
  'awaiting-approval': 'Awaiting Approval',
  merging: 'Merging',
  deployed: 'Deployed',
};
const PIPELINE_COLORS = {
  none: '',
  building: '#f59e0b',
  testing: '#3b82f6',
  reviewing: '#8b5cf6',
  qa: '#ec4899',
  'awaiting-approval': '#f97316',
  merging: '#22c55e',
  deployed: '#10b981',
};

// ============================================================
// Seed Data — Full FillIt work item hierarchy
// ============================================================
function generateId() {
  return 'id-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function buildSeedData() {
  const now = new Date().toISOString();
  const items = [];
  let order = 0;

  function add(type, title, description, parentId, priority, tags) {
    const id = generateId();
    items.push({
      id,
      title,
      description: description || '',
      type,
      status: 'Backlog',
      priority: priority || 'Medium',
      parentId: parentId || null,
      assignee: '',
      tags: tags || [],
      pipelineStage: 'none',
      createdAt: now,
      updatedAt: now,
      order: order++,
    });
    return id;
  }

  // ── EPIC 1: Project Infrastructure & Monorepo ──
  const e1 = add(
    'Epic',
    'E1: Project Infrastructure & Monorepo',
    'Phase 1 foundation — monorepo setup, CI/CD pipeline, project scaffolding. Unblocks every other epic.',
    null,
    'Critical',
    ['infrastructure'],
  );

  const f11 = add(
    'Feature',
    'F1.1: Monorepo Scaffolding',
    'Initialize pnpm workspace, Expo app, shared package, and server project.',
    e1,
    'Critical',
    ['infrastructure'],
  );
  const s01 = add(
    'UserStory',
    'S-01: Initialize pnpm monorepo with workspace configuration',
    'As a developer, I want a properly configured monorepo so all packages share a single install and build pipeline.',
    f11,
    'Critical',
    ['infrastructure'],
  );
  add('Task', 'Create root package.json with pnpm workspace settings', '', s01, 'High', [
    'infrastructure',
  ]);
  add(
    'Task',
    'Create pnpm-workspace.yaml with apps/mobile, packages/shared, server',
    '',
    s01,
    'High',
    ['infrastructure'],
  );
  add('Task', 'Create tsconfig.base.json with shared compiler options', '', s01, 'High', [
    'infrastructure',
  ]);
  add('Task', 'Configure ESLint with TypeScript rules and Prettier', '', s01, 'Medium', [
    'infrastructure',
  ]);
  add('Task', 'Add .gitignore, .prettierrc, .eslintrc.js', '', s01, 'Medium', ['infrastructure']);
  add('Task', 'Verify pnpm install resolves across all workspaces', '', s01, 'High', [
    'infrastructure',
  ]);

  const s02 = add(
    'UserStory',
    'S-02: Initialize Expo project with Router and TypeScript',
    'As a developer, I want the Expo app bootstrapped with Router so we can start building screens. [Depends: S-01]',
    f11,
    'Critical',
    ['mobile'],
  );
  add('Task', 'Run create-expo-app inside apps/mobile with TypeScript template', '', s02, 'High', [
    'mobile',
  ]);
  add('Task', 'Configure Expo Router file-based routing in app/ directory', '', s02, 'High', [
    'mobile',
  ]);
  add('Task', 'Set up app.json and eas.json with FillIt branding placeholders', '', s02, 'Medium', [
    'mobile',
  ]);
  add('Task', 'Verify app runs on iOS simulator and Android emulator', '', s02, 'High', ['mobile']);
  add('Task', 'Add apps/mobile/tsconfig.json extending base config', '', s02, 'Medium', ['mobile']);

  const s03 = add(
    'UserStory',
    'S-03: Initialize shared package (@fillit/shared)',
    'As a developer, I want a shared types package so mobile and server share interfaces. [Depends: S-01]',
    f11,
    'High',
    ['infrastructure'],
  );
  add('Task', 'Create packages/shared/package.json with name @fillit/shared', '', s03, 'High', [
    'infrastructure',
  ]);
  add('Task', 'Set up TypeScript build config with declaration output', '', s03, 'Medium', [
    'infrastructure',
  ]);
  add('Task', 'Create barrel exports in src/index.ts', '', s03, 'Medium', ['infrastructure']);
  add('Task', 'Verify mobile app can import from @fillit/shared', '', s03, 'High', [
    'infrastructure',
  ]);

  const s04 = add(
    'UserStory',
    'S-04: Initialize backend proxy project',
    'As a developer, I want the Hono server scaffolded so we can build API routes. [Depends: S-01]',
    f11,
    'High',
    ['backend'],
  );
  add('Task', 'Create server/package.json with Hono and TypeScript deps', '', s04, 'High', [
    'backend',
  ]);
  add(
    'Task',
    'Create server/src/index.ts with basic Hono server and health endpoint',
    '',
    s04,
    'High',
    ['backend'],
  );
  add('Task', 'Create server/Dockerfile for containerized deployment', '', s04, 'Medium', [
    'backend',
  ]);
  add('Task', 'Create server/.env.example with required env variables', '', s04, 'Low', [
    'backend',
  ]);
  add('Task', 'Add server/tsconfig.json extending base config', '', s04, 'Medium', ['backend']);
  add('Task', 'Verify server starts locally and responds to health check', '', s04, 'High', [
    'backend',
  ]);

  const f12 = add(
    'Feature',
    'F1.2: CI/CD Pipeline',
    'GitHub Actions workflows for CI, server deploy, and mobile builds.',
    e1,
    'High',
    ['infrastructure', 'ci'],
  );
  const s05 = add(
    'UserStory',
    'S-05: Set up GitHub Actions CI workflow',
    'As a developer, I want PRs to auto-run lint, type-check, and tests. [Depends: S-01]',
    f12,
    'High',
    ['ci'],
  );
  add('Task', 'Create .github/workflows/ci.yml triggered on PRs', '', s05, 'High', ['ci']);
  add('Task', 'Add steps: pnpm install, lint, type-check, test (all packages)', '', s05, 'High', [
    'ci',
  ]);
  add('Task', 'Configure coverage threshold enforcement (80%)', '', s05, 'Medium', ['ci']);
  add('Task', 'Add coverage report as PR comment', '', s05, 'Low', ['ci']);

  const s06 = add(
    'UserStory',
    'S-06: Set up server deployment workflow',
    'As a developer, I want main branch pushes to auto-deploy the server. [Depends: S-04]',
    f12,
    'High',
    ['ci', 'backend'],
  );
  add(
    'Task',
    'Create .github/workflows/deploy-server.yml triggered on push to main',
    '',
    s06,
    'High',
    ['ci'],
  );
  add('Task', 'Add Fly.io deployment step with Docker build', '', s06, 'High', ['ci', 'backend']);
  add('Task', 'Add post-deploy smoke test (health endpoint)', '', s06, 'Medium', ['ci']);
  add('Task', 'Configure secrets for Fly.io auth token', '', s06, 'Medium', ['ci']);

  const s07 = add(
    'UserStory',
    'S-07: Set up mobile build workflow',
    'As a developer, I want release builds to go through EAS Build pipeline. [Depends: S-02]',
    f12,
    'Medium',
    ['ci', 'mobile'],
  );
  add('Task', 'Create .github/workflows/build-mobile.yml with manual trigger', '', s07, 'Medium', [
    'ci',
  ]);
  add('Task', 'Add EAS Build steps for iOS and Android', '', s07, 'Medium', ['ci', 'mobile']);
  add('Task', 'Add TestFlight and Play Console submission steps', '', s07, 'Medium', ['ci']);
  add('Task', 'Configure EAS credentials as GitHub secrets', '', s07, 'Medium', ['ci']);

  // ── EPIC 2: Shared Types & Validation ──
  const e2 = add(
    'Epic',
    'E2: Shared Types & Validation',
    'Phase 1 — TypeScript interfaces, SA ID validation, field normalization. Unblocks Epics 3, 4, 6, 7, 8.',
    null,
    'Critical',
    ['shared'],
  );

  const f21 = add(
    'Feature',
    'F2.1: Core Type Definitions',
    'Define all TypeScript interfaces for profiles, documents, fields, signatures.',
    e2,
    'Critical',
    ['shared'],
  );
  const s08 = add(
    'UserStory',
    'S-08: Define profile and address TypeScript interfaces',
    'As a developer, I want shared type definitions for user data. [Depends: S-03]',
    f21,
    'Critical',
    ['shared'],
  );
  add(
    'Task',
    'Create types/profile.ts with UserProfile, Address, EmergencyContact, ProfessionalRegistration',
    '',
    s08,
    'High',
    ['shared'],
  );
  add('Task', 'Create types/signature.ts with StoredSignature', '', s08, 'High', ['shared']);
  add('Task', 'Add field type enums in constants/fieldTypes.ts', '', s08, 'Medium', ['shared']);
  add('Task', 'Write unit tests for type guard functions', '', s08, 'Medium', [
    'shared',
    'testing',
  ]);

  const s09 = add(
    'UserStory',
    'S-09: Define document and field TypeScript interfaces',
    'As a developer, I want shared types for document processing. [Depends: S-03]',
    f21,
    'Critical',
    ['shared'],
  );
  add('Task', 'Create types/document.ts with ProcessedDocument, DocumentPage', '', s09, 'High', [
    'shared',
  ]);
  add(
    'Task',
    'Create types/field.ts with DetectedField, AnalyzeRequest/Response',
    '',
    s09,
    'High',
    ['shared'],
  );
  add(
    'Task',
    'Create constants/documentTypes.ts with SA document type definitions',
    '',
    s09,
    'Medium',
    ['shared'],
  );
  add('Task', 'Write unit tests for type guards', '', s09, 'Medium', ['shared', 'testing']);

  const f22 = add(
    'Feature',
    'F2.2: SA-Specific Validation',
    'SA ID number validation with Luhn checksum, field normalization, province constants.',
    e2,
    'Critical',
    ['shared', 'validation'],
  );
  const s10 = add(
    'UserStory',
    'S-10: Implement SA ID number validation and smart fill',
    'As a user, I want my SA ID validated with auto-populated DOB/gender/citizenship. [Depends: S-03]',
    f22,
    'Critical',
    ['shared', 'validation'],
  );
  add('Task', 'Create validation/saId.ts with parseRSAId() function', '', s10, 'Critical', [
    'shared',
    'validation',
  ]);
  add('Task', 'Implement Luhn checksum validation', '', s10, 'Critical', ['shared', 'validation']);
  add('Task', 'Implement DOB extraction (handling century ambiguity)', '', s10, 'High', [
    'shared',
    'validation',
  ]);
  add('Task', 'Implement gender extraction (0000-4999 female, 5000-9999 male)', '', s10, 'High', [
    'shared',
    'validation',
  ]);
  add('Task', 'Implement citizenship extraction', '', s10, 'High', ['shared', 'validation']);
  add('Task', 'Write comprehensive unit tests (95%+ coverage target)', '', s10, 'High', [
    'shared',
    'testing',
  ]);

  const s11 = add(
    'UserStory',
    'S-11: Implement field normalization utilities',
    'As a developer, I want field label normalization for consistent matching. [Depends: S-08, S-09]',
    f22,
    'High',
    ['shared', 'validation'],
  );
  add('Task', 'Create validation/fields.ts with label normalization', '', s11, 'High', ['shared']);
  add('Task', 'Build profile field path resolver', '', s11, 'High', ['shared']);
  add('Task', 'Write unit tests', '', s11, 'Medium', ['shared', 'testing']);

  const s12 = add(
    'UserStory',
    'S-12: Define SA provinces and constants',
    'As a developer, I want SA province and document type constants. [Depends: S-03]',
    f22,
    'Medium',
    ['shared'],
  );
  add('Task', 'Create constants/provinces.ts with all 9 SA provinces', '', s12, 'Medium', [
    'shared',
  ]);
  add('Task', 'Add common SA document type constants', '', s12, 'Medium', ['shared']);
  add('Task', 'Export from barrel', '', s12, 'Low', ['shared']);

  // ── EPIC 3: Data Layer — SQLite & Encryption ──
  const e3 = add(
    'Epic',
    'E3: Data Layer — SQLite & Encryption',
    'Phase 1 — Encryption utilities, SQLite schema, CRUD operations, file storage. Unblocks profile UI and all document operations.',
    null,
    'Critical',
    ['data', 'security'],
  );

  const f31 = add(
    'Feature',
    'F3.1: Encryption Utilities',
    'AES-256-GCM encryption module and secure key management.',
    e3,
    'Critical',
    ['security'],
  );
  const s13 = add(
    'UserStory',
    'S-13: Build AES-256-GCM encryption module',
    'As a developer, I want encrypt/decrypt utilities for sensitive data at rest. [Depends: S-02]',
    f31,
    'Critical',
    ['security'],
  );
  add('Task', 'Create utils/encryption.ts with generateEncryptionKey()', '', s13, 'Critical', [
    'security',
  ]);
  add(
    'Task',
    'Implement encrypt(plaintext, key) returning iv:ciphertext:tag',
    '',
    s13,
    'Critical',
    ['security'],
  );
  add('Task', 'Implement decrypt(ciphertext, key) with tag verification', '', s13, 'Critical', [
    'security',
  ]);
  add('Task', 'Write roundtrip unit tests (95%+ coverage target)', '', s13, 'High', [
    'security',
    'testing',
  ]);

  const s14 = add(
    'UserStory',
    'S-14: Build secure key management service',
    'As a developer, I want encryption keys stored securely in OS keychain. [Depends: S-13]',
    f31,
    'Critical',
    ['security'],
  );
  add('Task', 'Create services/storage/secureStore.ts', '', s14, 'High', ['security']);
  add('Task', 'Implement getOrCreateEncryptionKey() using expo-secure-store', '', s14, 'Critical', [
    'security',
  ]);
  add('Task', 'Handle iOS Keychain and Android Keystore', '', s14, 'High', ['security']);
  add('Task', 'Write unit tests with mocked secure store', '', s14, 'Medium', [
    'security',
    'testing',
  ]);

  const f32 = add(
    'Feature',
    'F3.2: SQLite Database',
    'Schema creation, migrations, and CRUD operations for all entities.',
    e3,
    'Critical',
    ['data'],
  );
  const s15 = add(
    'UserStory',
    'S-15: Implement SQLite schema and migrations',
    'As a developer, I want the database schema created on app launch. [Depends: S-02, S-08, S-09]',
    f32,
    'Critical',
    ['data'],
  );
  add('Task', 'Create services/storage/database.ts', '', s15, 'Critical', ['data']);
  add('Task', 'Implement schema creation for all tables', '', s15, 'Critical', ['data']);
  add('Task', 'Implement migration system with version tracking', '', s15, 'High', ['data']);
  add('Task', 'Add indexes on foreign keys', '', s15, 'Medium', ['data']);
  add('Task', 'Write integration tests verifying schema creation', '', s15, 'High', [
    'data',
    'testing',
  ]);

  const s16 = add(
    'UserStory',
    'S-16: Implement profile CRUD database operations',
    'As a developer, I want profile CRUD with encryption of sensitive fields. [Depends: S-15, S-14]',
    f32,
    'Critical',
    ['data', 'security'],
  );
  add('Task', 'Build createProfile() with encryption', '', s16, 'Critical', ['data']);
  add('Task', 'Build getProfile(id) with decryption', '', s16, 'Critical', ['data']);
  add('Task', 'Build updateProfile() with re-encryption', '', s16, 'High', ['data']);
  add('Task', 'Build deleteProfile() with cascade', '', s16, 'High', ['data']);
  add('Task', 'Build listProfiles() returning decrypted summaries', '', s16, 'High', ['data']);
  add('Task', 'Write integration tests with real SQLite', '', s16, 'High', ['data', 'testing']);

  const s17 = add(
    'UserStory',
    'S-17: Implement address CRUD',
    'As a developer, I want address CRUD for profiles. [Depends: S-15]',
    f32,
    'High',
    ['data'],
  );
  add('Task', 'Build address create/read/update/delete for a profile', '', s17, 'High', ['data']);
  add('Task', 'Implement default address toggle logic', '', s17, 'Medium', ['data']);
  add('Task', 'Write integration tests', '', s17, 'Medium', ['data', 'testing']);

  const s18 = add(
    'UserStory',
    'S-18: Implement identity document CRUD with encryption',
    'As a developer, I want encrypted identity document storage. [Depends: S-15, S-14]',
    f32,
    'High',
    ['data', 'security'],
  );
  add('Task', 'Build identity document CRUD', '', s18, 'High', ['data']);
  add('Task', 'Encrypt number and additional_fields before storage', '', s18, 'High', [
    'data',
    'security',
  ]);
  add('Task', 'Write integration tests verifying encrypted fields', '', s18, 'High', [
    'data',
    'testing',
  ]);

  const s19 = add(
    'UserStory',
    'S-19: Implement document and page CRUD',
    'As a developer, I want document/page/field CRUD for the processing pipeline. [Depends: S-15]',
    f32,
    'High',
    ['data'],
  );
  add('Task', 'Build document create/read/update/delete/list', '', s19, 'High', ['data']);
  add('Task', 'Build document_pages CRUD', '', s19, 'High', ['data']);
  add('Task', 'Build detected_fields CRUD', '', s19, 'High', ['data']);
  add('Task', 'Implement status transitions', '', s19, 'Medium', ['data']);
  add('Task', 'Write integration tests', '', s19, 'Medium', ['data', 'testing']);

  const s20 = add(
    'UserStory',
    'S-20: Implement signature CRUD',
    'As a developer, I want signature storage for profiles. [Depends: S-15]',
    f32,
    'Medium',
    ['data'],
  );
  add('Task', 'Build signature create/read/update/delete', '', s20, 'Medium', ['data']);
  add('Task', 'Implement default signature toggle', '', s20, 'Medium', ['data']);
  add('Task', 'Write integration tests', '', s20, 'Medium', ['data', 'testing']);

  const f33 = add(
    'Feature',
    'F3.3: File Storage Service',
    'Local file management for images and PDFs.',
    e3,
    'High',
    ['data'],
  );
  const s21 = add(
    'UserStory',
    'S-21: Build local file storage service',
    'As a developer, I want file management utilities for scanned images/PDFs. [Depends: S-02]',
    f33,
    'High',
    ['data'],
  );
  add('Task', 'Create services/storage/fileStorage.ts', '', s21, 'High', ['data']);
  add('Task', 'Implement saveImage(uri) with UUID naming', '', s21, 'High', ['data']);
  add('Task', 'Implement saveDocument(uri) for PDFs', '', s21, 'Medium', ['data']);
  add('Task', 'Implement deleteFile(uri) cleanup', '', s21, 'Medium', ['data']);
  add('Task', 'Write unit tests', '', s21, 'Medium', ['data', 'testing']);

  // ── EPIC 4: State Management ──
  const e4 = add(
    'Epic',
    'E4: State Management',
    'Phase 1 — Zustand stores for profiles, settings, documents, and processing state machine.',
    null,
    'High',
    ['state'],
  );

  const f41 = add(
    'Feature',
    'F4.1: Zustand Stores',
    'Reactive state management wired to SQLite.',
    e4,
    'High',
    ['state'],
  );
  const s22 = add(
    'UserStory',
    'S-22: Build profile Zustand store',
    'As a developer, I want a reactive profile store wired to SQLite. [Depends: S-16, S-17, S-18]',
    f41,
    'Critical',
    ['state', 'mobile'],
  );
  add('Task', 'Create store/profileStore.ts', '', s22, 'High', ['state']);
  add('Task', 'Implement CRUD actions wired to SQLite', '', s22, 'High', ['state']);
  add('Task', 'Implement SA ID smart-fill side effect', '', s22, 'High', ['state', 'validation']);
  add('Task', 'Write unit tests with mocked database', '', s22, 'Medium', ['state', 'testing']);

  const s23 = add(
    'UserStory',
    'S-23: Build settings Zustand store',
    'As a developer, I want a settings store for theme, security, and network status. [Depends: S-02]',
    f41,
    'High',
    ['state', 'mobile'],
  );
  add('Task', 'Create store/settingsStore.ts', '', s23, 'High', ['state']);
  add('Task', 'Implement theme, biometric, auto-lock, network settings', '', s23, 'Medium', [
    'state',
  ]);
  add('Task', 'Persist to AsyncStorage/SQLite', '', s23, 'Medium', ['state']);
  add('Task', 'Write unit tests', '', s23, 'Medium', ['state', 'testing']);

  const s24 = add(
    'UserStory',
    'S-24: Build document Zustand store',
    'As a developer, I want a document store for the processing pipeline. [Depends: S-19]',
    f41,
    'High',
    ['state', 'mobile'],
  );
  add('Task', 'Create store/documentStore.ts', '', s24, 'High', ['state']);
  add('Task', 'Implement CRUD actions wired to SQLite', '', s24, 'High', ['state']);
  add('Task', 'Implement list filtering and sorting', '', s24, 'Medium', ['state']);
  add('Task', 'Write unit tests', '', s24, 'Medium', ['state', 'testing']);

  const s25 = add(
    'UserStory',
    'S-25: Build processing state machine store',
    'As a developer, I want a state machine managing the document processing pipeline. [Depends: S-24]',
    f41,
    'High',
    ['state', 'mobile'],
  );
  add('Task', 'Create store/processingStore.ts', '', s25, 'High', ['state']);
  add(
    'Task',
    'Define states: idle, scanning, ocr_processing, detecting_fields, matching, reviewing, signing, exporting, complete, error',
    '',
    s25,
    'High',
    ['state'],
  );
  add('Task', 'Implement state transitions with guards', '', s25, 'High', ['state']);
  add('Task', 'Implement resume capability', '', s25, 'Medium', ['state']);
  add('Task', 'Write unit tests for all transitions', '', s25, 'Medium', ['state', 'testing']);

  // ── EPIC 5: Theme & UI Foundation ──
  const e5 = add(
    'Epic',
    'E5: Theme & UI Foundation',
    'Phase 1 — Theme tokens, typography, core UI components, navigation shell, skeleton loaders.',
    null,
    'High',
    ['ui'],
  );

  const f51 = add(
    'Feature',
    'F5.1: Theme System',
    'Color tokens, typography, custom fonts, dark/light mode.',
    e5,
    'High',
    ['ui'],
  );
  const s26 = add(
    'UserStory',
    'S-26: Build theme token system with dark/light mode',
    'As a developer, I want a complete theme system with tokens. [Depends: S-02]',
    f51,
    'High',
    ['ui'],
  );
  add('Task', 'Create theme/colors.ts with all tokens for both modes', '', s26, 'High', ['ui']);
  add('Task', 'Create theme/typography.ts with font styles', '', s26, 'High', ['ui']);
  add('Task', 'Create useTheme hook with system detection + Zustand override', '', s26, 'High', [
    'ui',
  ]);
  add('Task', 'Write unit tests', '', s26, 'Medium', ['ui', 'testing']);

  const s27 = add(
    'UserStory',
    'S-27: Load custom fonts',
    'As a user, I want the app to use Inter, JetBrains Mono, and signature fonts. [Depends: S-02]',
    f51,
    'Medium',
    ['ui'],
  );
  add('Task', 'Add fonts to assets/fonts/', '', s27, 'Medium', ['ui']);
  add('Task', 'Configure expo-font loading in root layout', '', s27, 'Medium', ['ui']);
  add('Task', 'Add font loading splash screen handling', '', s27, 'Medium', ['ui']);

  const f52 = add(
    'Feature',
    'F5.2: Core UI Components',
    'Reusable Button, Card, Input, navigation, skeleton components.',
    e5,
    'High',
    ['ui'],
  );
  const s28 = add(
    'UserStory',
    'S-28: Build foundational UI components',
    'As a developer, I want reusable themed UI primitives. [Depends: S-26]',
    f52,
    'High',
    ['ui'],
  );
  add('Task', 'Build Button component (primary, secondary, outline, ghost)', '', s28, 'High', [
    'ui',
  ]);
  add('Task', 'Build Card component with surface styling', '', s28, 'High', ['ui']);
  add('Task', 'Build TextInput component with label and error state', '', s28, 'High', ['ui']);
  add('Task', 'Build Modal / BottomSheet component', '', s28, 'High', ['ui']);
  add('Task', 'Build Chip / status badge component', '', s28, 'Medium', ['ui']);
  add('Task', 'Write snapshot tests', '', s28, 'Medium', ['ui', 'testing']);

  const s29 = add(
    'UserStory',
    'S-29: Build navigation shell with tab bar',
    'As a user, I want bottom tab navigation between Home, Documents, Profiles, Settings. [Depends: S-26, S-27]',
    f52,
    'High',
    ['ui', 'mobile'],
  );
  add('Task', 'Create app/_layout.tsx root layout with providers', '', s29, 'High', ['ui']);
  add('Task', 'Create app/(tabs)/_layout.tsx with bottom tab navigator', '', s29, 'High', ['ui']);
  add(
    'Task',
    'Create placeholder screens: home, documents, profiles, settings',
    '',
    s29,
    'Medium',
    ['ui'],
  );
  add('Task', 'Style tab bar with theme tokens', '', s29, 'Medium', ['ui']);
  add('Task', 'Write basic navigation tests', '', s29, 'Medium', ['ui', 'testing']);

  const s30 = add(
    'UserStory',
    'S-30: Build skeleton loading components',
    'As a user, I want skeleton placeholders instead of spinners during loading. [Depends: S-28]',
    f52,
    'Medium',
    ['ui'],
  );
  add(
    'Task',
    'Build SkeletonLoader component for list items, cards, full screens',
    '',
    s30,
    'Medium',
    ['ui'],
  );
  add('Task', 'Add shimmer animation', '', s30, 'Medium', ['ui']);

  // ── EPIC 6: Profile Management UI ──
  const e6 = add(
    'Epic',
    'E6: Profile Management UI',
    'Phase 1 — Profile forms, address/doc management, dependents, profiles tab, home dashboard.',
    null,
    'High',
    ['mobile', 'ui'],
  );

  const f61 = add(
    'Feature',
    'F6.1: Primary Profile',
    'Profile form, edit screen, addresses, identity documents, emergency contacts.',
    e6,
    'High',
    ['mobile', 'ui'],
  );
  const s31 = add(
    'UserStory',
    'S-31: Build profile form component',
    'As a user, I want to fill in my profile with SA ID smart fill. [Depends: S-22, S-28, S-10]',
    f61,
    'High',
    ['mobile', 'ui'],
  );
  add('Task', 'Create components/profile/ProfileForm.tsx', '', s31, 'High', ['ui']);
  add('Task', 'Implement SA ID input with real-time Luhn validation', '', s31, 'High', [
    'ui',
    'validation',
  ]);
  add('Task', 'Show auto-populated DOB/gender/citizenship', '', s31, 'High', ['ui']);
  add('Task', 'Wire to profile store', '', s31, 'High', ['ui', 'state']);
  add('Task', 'Write component tests', '', s31, 'Medium', ['ui', 'testing']);

  const s32 = add(
    'UserStory',
    'S-32: Build profile edit screen',
    'As a user, I want a screen to edit my profile. [Depends: S-31, S-29]',
    f61,
    'High',
    ['mobile', 'ui'],
  );
  add('Task', 'Create app/profile/edit.tsx screen', '', s32, 'High', ['ui']);
  add('Task', 'Integrate ProfileForm with save/cancel', '', s32, 'High', ['ui']);
  add('Task', 'Handle navigation back with unsaved changes warning', '', s32, 'Medium', ['ui']);
  add('Task', 'Write screen-level tests', '', s32, 'Medium', ['ui', 'testing']);

  const s33 = add(
    'UserStory',
    'S-33: Build address management',
    'As a user, I want to manage multiple addresses with SA province selector. [Depends: S-31, S-17]',
    f61,
    'High',
    ['mobile', 'ui'],
  );
  add('Task', 'Build AddressForm component with SA province dropdown', '', s33, 'High', ['ui']);
  add('Task', 'Build address list with add/edit/delete/set-default', '', s33, 'High', ['ui']);
  add('Task', 'Write component tests', '', s33, 'Medium', ['ui', 'testing']);

  const s34 = add(
    'UserStory',
    'S-34: Build identity document management',
    'As a user, I want to store my identity documents (ID, passport, drivers license, etc.). [Depends: S-31, S-18]',
    f61,
    'High',
    ['mobile', 'ui'],
  );
  add('Task', 'Build IdentityDocumentForm with type selector', '', s34, 'High', ['ui']);
  add('Task', 'Support all SA document categories + custom type', '', s34, 'High', ['ui']);
  add('Task', 'Wire to encrypted document CRUD', '', s34, 'High', ['ui', 'security']);
  add('Task', 'Write component tests', '', s34, 'Medium', ['ui', 'testing']);

  const s35 = add(
    'UserStory',
    'S-35: Build emergency contacts management',
    'As a user, I want to add up to 2 emergency contacts. [Depends: S-31, S-15]',
    f61,
    'Medium',
    ['mobile', 'ui'],
  );
  add('Task', 'Build EmergencyContactForm component', '', s35, 'Medium', ['ui']);
  add('Task', 'Enforce maximum of 2 contacts', '', s35, 'Medium', ['ui']);
  add('Task', 'Write component tests', '', s35, 'Medium', ['ui', 'testing']);

  const f62 = add(
    'Feature',
    'F6.2: Dependents',
    'Add and manage dependent profiles (spouse, child, parent).',
    e6,
    'High',
    ['mobile', 'ui'],
  );
  const s36 = add(
    'UserStory',
    'S-36: Build dependent profile management',
    'As a user, I want to manage profiles for dependents. [Depends: S-32]',
    f62,
    'High',
    ['mobile', 'ui'],
  );
  add('Task', 'Create app/profile/dependent.tsx screen', '', s36, 'High', ['ui']);
  add('Task', 'Reuse ProfileForm with relationship field', '', s36, 'High', ['ui']);
  add('Task', 'Build DependentCard component', '', s36, 'Medium', ['ui']);
  add('Task', 'Write component tests', '', s36, 'Medium', ['ui', 'testing']);

  const f63 = add(
    'Feature',
    'F6.3: Profile List & Dashboard',
    'Profiles tab and home dashboard with recent docs and quick actions.',
    e6,
    'High',
    ['mobile', 'ui'],
  );
  const s37 = add(
    'UserStory',
    'S-37: Build profiles tab screen',
    'As a user, I want a profiles tab showing my profile and dependents. [Depends: S-36, S-29]',
    f63,
    'High',
    ['mobile', 'ui'],
  );
  add('Task', 'Create app/(tabs)/profiles.tsx', '', s37, 'High', ['ui']);
  add('Task', 'Add profile completeness indicator', '', s37, 'Medium', ['ui']);
  add('Task', 'Write screen tests', '', s37, 'Medium', ['ui', 'testing']);

  const s38 = add(
    'UserStory',
    'S-38: Build home dashboard screen',
    'As a user, I want a home screen with Scan FAB, Import button, and recent documents. [Depends: S-29, S-24]',
    f63,
    'High',
    ['mobile', 'ui'],
  );
  add('Task', 'Create app/(tabs)/home.tsx with Scan FAB and Import button', '', s38, 'High', [
    'ui',
  ]);
  add('Task', 'Show recent documents as cards with status chips', '', s38, 'Medium', ['ui']);
  add('Task', 'Add profile completeness prompt', '', s38, 'Medium', ['ui']);
  add('Task', 'Write screen tests', '', s38, 'Medium', ['ui', 'testing']);

  // ── EPIC 7: Document Scanning & OCR ──
  const e7 = add(
    'Epic',
    'E7: Document Scanning & OCR',
    'Phase 2 — ML Kit scanner, file import, OCR processing, image processing.',
    null,
    'High',
    ['mobile', 'scanning'],
  );

  const f71 = add(
    'Feature',
    'F7.1: Camera Scanner',
    'ML Kit document scanner with auto-edge detection.',
    e7,
    'High',
    ['mobile', 'scanning'],
  );
  const s39 = add(
    'UserStory',
    'S-39: Integrate ML Kit document scanner',
    'As a user, I want to scan documents with my camera. [Depends: S-21, S-19]',
    f71,
    'High',
    ['mobile', 'scanning'],
  );
  add('Task', 'Install and configure react-native-mlkit-document-scanner', '', s39, 'High', [
    'mobile',
  ]);
  add('Task', 'Create app/scan/camera.tsx screen', '', s39, 'High', ['mobile', 'ui']);
  add('Task', 'Save captured images to app document directory', '', s39, 'High', ['mobile']);
  add('Task', 'Create document record in SQLite with status "scanned"', '', s39, 'High', [
    'mobile',
    'data',
  ]);
  add('Task', 'Test on both iOS and Android', '', s39, 'High', ['mobile', 'testing']);

  const s40 = add(
    'UserStory',
    'S-40: Build scan review screen',
    'As a user, I want to review and reorder scanned pages before processing. [Depends: S-39]',
    f71,
    'Medium',
    ['mobile', 'ui'],
  );
  add('Task', 'Create app/scan/review.tsx with page thumbnails grid', '', s40, 'Medium', ['ui']);
  add('Task', 'Allow reordering, deleting, and adding pages', '', s40, 'Medium', ['ui']);
  add('Task', 'Add "Process" button to advance to OCR', '', s40, 'Medium', ['ui']);
  add('Task', 'Write component tests', '', s40, 'Medium', ['ui', 'testing']);

  const f72 = add(
    'Feature',
    'F7.2: File Import',
    'Import PDFs and images via document picker.',
    e7,
    'High',
    ['mobile'],
  );
  const s41 = add(
    'UserStory',
    'S-41: Implement document file import',
    'As a user, I want to import PDFs and images from my device. [Depends: S-21, S-19]',
    f72,
    'High',
    ['mobile'],
  );
  add('Task', 'Create app/import/picker.tsx screen', '', s41, 'High', ['ui']);
  add('Task', 'Integrate expo-document-picker with PDF and image types', '', s41, 'High', [
    'mobile',
  ]);
  add('Task', 'For PDFs: extract page count, render pages to images for OCR', '', s41, 'High', [
    'mobile',
  ]);
  add('Task', 'Write integration tests', '', s41, 'Medium', ['mobile', 'testing']);

  const f73 = add(
    'Feature',
    'F7.3: OCR Processing',
    'ML Kit text recognition with progress tracking.',
    e7,
    'High',
    ['mobile', 'scanning'],
  );
  const s42 = add(
    'UserStory',
    'S-42: Build ML Kit OCR service',
    'As a developer, I want an OCR service that extracts text with bounding boxes. [Depends: S-02]',
    f73,
    'High',
    ['mobile', 'scanning'],
  );
  add('Task', 'Create services/ocr/mlkit.ts', '', s42, 'High', ['mobile']);
  add('Task', 'Parse results into normalized structure with bounding boxes', '', s42, 'High', [
    'mobile',
  ]);
  add('Task', 'Write unit tests with mocked ML Kit responses', '', s42, 'Medium', [
    'mobile',
    'testing',
  ]);

  const s43 = add(
    'UserStory',
    'S-43: Build platform-aware OCR abstraction',
    'As a developer, I want a platform-agnostic OCR entry point. [Depends: S-42]',
    f73,
    'High',
    ['mobile', 'scanning'],
  );
  add('Task', 'Create services/ocr/index.ts with performOCR()', '', s43, 'High', ['mobile']);
  add('Task', 'Add Tesseract.js placeholder for web (Phase 6)', '', s43, 'Low', ['mobile']);
  add('Task', 'Write unit tests', '', s43, 'Medium', ['mobile', 'testing']);

  const s44 = add(
    'UserStory',
    'S-44: Build OCR progress screen',
    'As a user, I want to see OCR processing progress per page. [Depends: S-43, S-25, S-40]',
    f73,
    'High',
    ['mobile', 'ui'],
  );
  add('Task', 'Create app/process/ocr-progress.tsx', '', s44, 'High', ['ui']);
  add('Task', 'Display per-page progress (skeleton, not spinner)', '', s44, 'Medium', ['ui']);
  add('Task', 'Store OCR results in document_pages table', '', s44, 'High', ['data']);
  add('Task', 'Auto-advance to field detection when complete', '', s44, 'Medium', ['ui']);
  add('Task', 'Write component tests', '', s44, 'Medium', ['ui', 'testing']);

  const f74 = add(
    'Feature',
    'F7.4: Image Processing',
    'Image resize, compress, crop, enhance utilities.',
    e7,
    'Medium',
    ['mobile'],
  );
  const s45 = add(
    'UserStory',
    'S-45: Build image processing utilities',
    'As a developer, I want image manipulation utilities for scanning pipeline. [Depends: S-02]',
    f74,
    'Medium',
    ['mobile'],
  );
  add('Task', 'Create utils/imageProcessing.ts', '', s45, 'Medium', ['mobile']);
  add('Task', 'Implement resizeImage, compressImage, cropImage', '', s45, 'Medium', ['mobile']);
  add('Task', 'Implement optimizeForOCR combining resize + contrast', '', s45, 'Medium', [
    'mobile',
  ]);
  add('Task', 'Write unit tests', '', s45, 'Medium', ['mobile', 'testing']);

  // ── EPIC 8: Backend Proxy Server ──
  const e8 = add(
    'Epic',
    'E8: Backend Proxy Server',
    'Phase 3 — Hono server, OAuth, Claude API integration, template caching, analytics, Fly.io deployment.',
    null,
    'High',
    ['backend'],
  );

  const f81 = add(
    'Feature',
    'F8.1: Server Foundation',
    'Hono middleware stack with OAuth and rate limiting.',
    e8,
    'High',
    ['backend'],
  );
  const s46 = add(
    'UserStory',
    'S-46: Build Hono server with middleware stack',
    'As a developer, I want a production-ready server with CORS, logging, error handling. [Depends: S-04]',
    f81,
    'High',
    ['backend'],
  );
  add('Task', 'Set up Hono app with CORS, logging, error handling', '', s46, 'High', ['backend']);
  add('Task', 'Create routes/health.ts', '', s46, 'Medium', ['backend']);
  add('Task', 'Create utils/config.ts for env management', '', s46, 'Medium', ['backend']);
  add('Task', 'Write integration tests with Supertest', '', s46, 'Medium', ['backend', 'testing']);

  const s47 = add(
    'UserStory',
    'S-47: Implement OAuth token verification middleware',
    'As a developer, I want request authentication via Google/Apple OAuth. [Depends: S-46]',
    f81,
    'Critical',
    ['backend', 'security'],
  );
  add('Task', 'Create middleware/auth.ts', '', s47, 'High', ['backend', 'security']);
  add('Task', 'Integrate google-auth-library for Google verification', '', s47, 'High', [
    'backend',
  ]);
  add('Task', 'Integrate apple-signin-auth for Apple verification', '', s47, 'High', ['backend']);
  add('Task', 'Return 401 for invalid/expired tokens', '', s47, 'High', ['backend', 'security']);
  add('Task', 'Write unit tests (95%+ coverage)', '', s47, 'High', ['backend', 'testing']);

  const s48 = add(
    'UserStory',
    'S-48: Implement per-user rate limiting',
    'As a developer, I want to prevent API abuse with rate limits. [Depends: S-47]',
    f81,
    'High',
    ['backend', 'security'],
  );
  add('Task', 'Create middleware/rateLimit.ts', '', s48, 'High', ['backend']);
  add('Task', 'Implement sliding window rate limiter', '', s48, 'High', ['backend']);
  add('Task', 'Return 429 with retry-after header', '', s48, 'Medium', ['backend']);
  add('Task', 'Write unit tests', '', s48, 'Medium', ['backend', 'testing']);

  const f82 = add(
    'Feature',
    'F8.2: Claude API Integration',
    'Prompt engineering and analyze endpoint.',
    e8,
    'Critical',
    ['backend', 'ai'],
  );
  const s49 = add(
    'UserStory',
    'S-49: Build Claude API service with prompt engineering',
    'As a developer, I want Claude integration with structured output for field detection. [Depends: S-46, S-09]',
    f82,
    'Critical',
    ['backend', 'ai'],
  );
  add('Task', 'Create services/claude.ts', '', s49, 'Critical', ['backend', 'ai']);
  add('Task', 'Build system prompt from plan spec', '', s49, 'High', ['backend', 'ai']);
  add('Task', 'Build tool definition for report_detected_fields', '', s49, 'High', [
    'backend',
    'ai',
  ]);
  add('Task', 'Parse tool_use response into AnalyzeResponse', '', s49, 'High', ['backend', 'ai']);
  add('Task', 'Implement timeout handling (30s)', '', s49, 'Medium', ['backend']);
  add('Task', 'Write unit tests with mocked SDK', '', s49, 'Medium', ['backend', 'testing']);

  const s50 = add(
    'UserStory',
    'S-50: Build analyze API endpoint',
    'As a developer, I want POST /analyze to process documents via Claude. [Depends: S-49, S-47]',
    f82,
    'Critical',
    ['backend', 'ai'],
  );
  add('Task', 'Create routes/analyze.ts', '', s50, 'Critical', ['backend']);
  add('Task', 'Validate request body', '', s50, 'High', ['backend']);
  add('Task', 'Call Claude service, return AnalyzeResponse', '', s50, 'High', ['backend', 'ai']);
  add('Task', 'Handle and map errors', '', s50, 'High', ['backend']);
  add('Task', 'Write integration tests with mocked Claude', '', s50, 'Medium', [
    'backend',
    'testing',
  ]);

  const f83 = add(
    'Feature',
    'F8.3: Template Caching',
    'Document fingerprinting and response caching.',
    e8,
    'High',
    ['backend'],
  );
  const s51 = add(
    'UserStory',
    'S-51: Build document fingerprinting',
    'As a developer, I want to hash document layouts for cache keys. [Depends: S-46]',
    f83,
    'High',
    ['backend'],
  );
  add('Task', 'Create utils/fingerprint.ts', '', s51, 'High', ['backend']);
  add('Task', 'Implement fingerprint from layout + labels (no user data)', '', s51, 'High', [
    'backend',
  ]);
  add('Task', 'Write unit tests', '', s51, 'Medium', ['backend', 'testing']);

  const s52 = add(
    'UserStory',
    'S-52: Build template cache service',
    'As a developer, I want cached AI responses for common form templates. [Depends: S-51, S-50]',
    f83,
    'High',
    ['backend'],
  );
  add('Task', 'Create services/cache.ts with in-memory cache + TTL', '', s52, 'High', ['backend']);
  add('Task', 'Integrate with analyze endpoint (check before Claude call)', '', s52, 'High', [
    'backend',
  ]);
  add('Task', 'Add cache hit/miss logging', '', s52, 'Medium', ['backend']);
  add('Task', 'Write unit tests', '', s52, 'Medium', ['backend', 'testing']);

  const f84 = add(
    'Feature',
    'F8.4: Analytics & Usage',
    'No-PII analytics logging and usage stats endpoint.',
    e8,
    'Medium',
    ['backend'],
  );
  const s53 = add(
    'UserStory',
    'S-53: Build analytics logging service',
    'As a developer, I want usage metrics without PII. [Depends: S-46]',
    f84,
    'Medium',
    ['backend'],
  );
  add('Task', 'Create services/analytics.ts', '', s53, 'Medium', ['backend']);
  add('Task', 'Log per-request: latency, tokens, cache, fields, confidence', '', s53, 'Medium', [
    'backend',
  ]);
  add('Task', 'Ensure no PII is logged', '', s53, 'High', ['backend', 'security']);
  add('Task', 'Write unit tests', '', s53, 'Medium', ['backend', 'testing']);

  const s54 = add(
    'UserStory',
    'S-54: Build usage stats endpoint',
    'As a user, I want to see my usage stats. [Depends: S-53, S-47]',
    f84,
    'Low',
    ['backend'],
  );
  add('Task', 'Create routes/usage.ts', '', s54, 'Low', ['backend']);
  add('Task', 'Write integration tests', '', s54, 'Low', ['backend', 'testing']);

  const f85 = add('Feature', 'F8.5: Deployment', 'Deploy backend to Fly.io.', e8, 'High', [
    'backend',
    'infrastructure',
  ]);
  const s55 = add(
    'UserStory',
    'S-55: Deploy proxy server to Fly.io',
    'As a developer, I want the server live on Fly.io for real-device testing. [Depends: S-50, S-47]',
    f85,
    'High',
    ['backend', 'infrastructure'],
  );
  add('Task', 'Create Fly.io app configuration', '', s55, 'High', ['backend']);
  add('Task', 'Configure environment secrets', '', s55, 'High', ['backend', 'security']);
  add('Task', 'Deploy with Docker', '', s55, 'High', ['backend']);
  add('Task', 'Run smoke tests against deployed endpoint', '', s55, 'High', ['backend', 'testing']);

  // ── EPIC 9: Authentication ──
  const e9 = add(
    'Epic',
    'E9: Authentication',
    'Phase 3 — Mobile OAuth with Google and Apple Sign-In.',
    null,
    'High',
    ['mobile', 'security'],
  );

  const f91 = add(
    'Feature',
    'F9.1: Mobile OAuth',
    'Google and Apple Sign-In on mobile with auth guard.',
    e9,
    'High',
    ['mobile', 'security'],
  );
  const s56 = add(
    'UserStory',
    'S-56: Implement Google Sign-In on mobile',
    'As a user, I want to sign in with Google. [Depends: S-02, S-47]',
    f91,
    'High',
    ['mobile', 'security'],
  );
  add('Task', 'Create services/auth/oauth.ts', '', s56, 'High', ['mobile']);
  add('Task', 'Configure Google Sign-In with Expo', '', s56, 'High', ['mobile']);
  add('Task', 'Implement sign-in flow returning ID token', '', s56, 'High', ['mobile', 'security']);
  add('Task', 'Implement token refresh logic', '', s56, 'Medium', ['mobile', 'security']);
  add('Task', 'Write integration tests', '', s56, 'Medium', ['mobile', 'testing']);

  const s57 = add(
    'UserStory',
    'S-57: Implement Apple Sign-In on mobile',
    'As a user, I want to sign in with Apple. [Depends: S-56]',
    f91,
    'High',
    ['mobile', 'security'],
  );
  add('Task', 'Add Apple Sign-In provider to oauth service', '', s57, 'High', ['mobile']);
  add('Task', 'Configure Apple Sign-In entitlement (iOS)', '', s57, 'High', ['mobile']);
  add('Task', 'Handle Apple email relay and name sharing', '', s57, 'Medium', ['mobile']);
  add('Task', 'Write integration tests', '', s57, 'Medium', ['mobile', 'testing']);

  const s58 = add(
    'UserStory',
    'S-58: Build sign-in screen and auth guard',
    'As a user, I want a sign-in screen that gates app access. [Depends: S-56, S-29]',
    f91,
    'High',
    ['mobile', 'ui', 'security'],
  );
  add('Task', 'Build sign-in screen with Google and Apple buttons', '', s58, 'High', ['ui']);
  add('Task', 'Build auth state management', '', s58, 'High', ['mobile', 'security']);
  add('Task', 'Add auth guard redirecting to sign-in', '', s58, 'High', ['mobile']);
  add('Task', 'Handle sign-out', '', s58, 'Medium', ['mobile']);
  add('Task', 'Write component tests', '', s58, 'Medium', ['ui', 'testing']);

  // ── EPIC 10: AI Field Detection & Matching ──
  const e10 = add(
    'Epic',
    'E10: AI Field Detection & Matching',
    'Phase 3 — Cloud AI client, offline heuristic matcher, field detection UI, field review screen.',
    null,
    'Critical',
    ['mobile', 'ai'],
  );

  const f101 = add(
    'Feature',
    'F10.1: Cloud AI Client',
    'Backend proxy API client with image optimization.',
    e10,
    'High',
    ['mobile', 'ai'],
  );
  const s59 = add(
    'UserStory',
    'S-59: Build backend proxy API client',
    'As a developer, I want a mobile client for the analyze endpoint. [Depends: S-50, S-56]',
    f101,
    'High',
    ['mobile', 'ai'],
  );
  add('Task', 'Create services/ai/proxy.ts', '', s59, 'High', ['mobile', 'ai']);
  add('Task', 'Implement analyzeDocument() with OAuth token', '', s59, 'High', ['mobile', 'ai']);
  add('Task', 'Implement timeout handling with fallback trigger', '', s59, 'Medium', ['mobile']);
  add('Task', 'Write unit tests with mocked fetch', '', s59, 'Medium', ['mobile', 'testing']);

  const s60 = add(
    'UserStory',
    'S-60: Build image optimization for API submission',
    'As a developer, I want images resized and compressed before sending to API. [Depends: S-45]',
    f101,
    'Medium',
    ['mobile'],
  );
  add('Task', 'Implement resize to max 1500px + JPEG at 80%', '', s60, 'Medium', ['mobile']);
  add('Task', 'Convert to base64 for API payload', '', s60, 'Medium', ['mobile']);
  add('Task', 'Write unit tests', '', s60, 'Medium', ['mobile', 'testing']);

  const f102 = add(
    'Feature',
    'F10.2: Offline Heuristic Matcher',
    'Label dictionary, fuzzy matching, network-aware routing.',
    e10,
    'High',
    ['mobile', 'ai'],
  );
  const s61 = add(
    'UserStory',
    'S-61: Build label dictionary for SA forms',
    'As a developer, I want a dictionary mapping SA form labels to profile fields. [Depends: S-11]',
    f102,
    'High',
    ['mobile', 'ai'],
  );
  add('Task', 'Create services/ai/heuristic.ts', '', s61, 'High', ['mobile', 'ai']);
  add('Task', 'Build ~300 entry dictionary: English, Afrikaans, SA-specific', '', s61, 'High', [
    'mobile',
    'ai',
  ]);
  add('Task', 'Write unit tests for dictionary lookups', '', s61, 'Medium', ['mobile', 'testing']);

  const s62 = add(
    'UserStory',
    'S-62: Build fuzzy matching engine',
    'As a developer, I want fuzzy matching for OCR labels that dont exactly match. [Depends: S-61]',
    f102,
    'High',
    ['mobile', 'ai'],
  );
  add('Task', 'Implement Levenshtein distance + token overlap', '', s62, 'High', ['mobile', 'ai']);
  add('Task', 'Combine exact match (0.9) with fuzzy (0.5-0.8)', '', s62, 'High', ['mobile', 'ai']);
  add('Task', 'Implement field type inference from patterns', '', s62, 'Medium', ['mobile', 'ai']);
  add('Task', 'Write unit tests with realistic OCR labels', '', s62, 'Medium', [
    'mobile',
    'testing',
  ]);

  const s63 = add(
    'UserStory',
    'S-63: Build network-aware AI routing',
    'As a user, I want the app to use cloud AI when online and local matching when offline. [Depends: S-59, S-62]',
    f102,
    'High',
    ['mobile', 'ai'],
  );
  add('Task', 'Create services/ai/index.ts', '', s63, 'High', ['mobile', 'ai']);
  add('Task', 'Check network status via NetInfo', '', s63, 'Medium', ['mobile']);
  add('Task', 'Route to cloud online, heuristic offline', '', s63, 'High', ['mobile', 'ai']);
  add('Task', 'Fall back to heuristic on cloud error', '', s63, 'High', ['mobile']);
  add('Task', 'Write unit tests', '', s63, 'Medium', ['mobile', 'testing']);

  const f103 = add(
    'Feature',
    'F10.3: Field Detection UI',
    'Progress screen, document viewer with overlays, field editor, review screen.',
    e10,
    'Critical',
    ['mobile', 'ui', 'ai'],
  );
  const s64 = add(
    'UserStory',
    'S-64: Build field detection progress screen',
    'As a user, I want to see AI analysis progress. [Depends: S-63, S-25, S-44]',
    f103,
    'High',
    ['mobile', 'ui'],
  );
  add('Task', 'Create app/process/field-detection.tsx', '', s64, 'High', ['ui']);
  add('Task', 'Show skeleton progress for AI processing', '', s64, 'Medium', ['ui']);
  add('Task', 'Handle cloud vs offline mode indicator', '', s64, 'Medium', ['ui']);
  add('Task', 'Write component tests', '', s64, 'Medium', ['ui', 'testing']);

  const s65 = add(
    'UserStory',
    'S-65: Build document viewer with field overlays',
    'As a user, I want to see detected fields overlaid on my document with confidence colors. [Depends: S-28]',
    f103,
    'Critical',
    ['mobile', 'ui'],
  );
  add('Task', 'Create components/document/DocumentViewer.tsx', '', s65, 'Critical', ['ui']);
  add('Task', 'Render document image with pinch-to-zoom', '', s65, 'High', ['ui']);
  add('Task', 'Overlay bounding boxes color-coded by confidence', '', s65, 'High', ['ui']);
  add('Task', 'Animate fields fading + scaling in', '', s65, 'Medium', ['ui']);
  add('Task', 'Write component tests', '', s65, 'Medium', ['ui', 'testing']);

  const s66 = add(
    'UserStory',
    'S-66: Build field editor bottom sheet',
    'As a user, I want to tap a field to edit its value, change source, or skip. [Depends: S-65]',
    f103,
    'High',
    ['mobile', 'ui'],
  );
  add('Task', 'Create components/document/FieldEditor.tsx', '', s66, 'High', ['ui']);
  add('Task', 'Show label, value, confidence, profile source', '', s66, 'High', ['ui']);
  add('Task', 'Allow editing, changing source profile, skipping', '', s66, 'High', ['ui']);
  add('Task', 'Write component tests', '', s66, 'Medium', ['ui', 'testing']);

  const s67 = add(
    'UserStory',
    'S-67: Build field matching/review screen',
    'As a user, I want to review all detected fields and confirm or edit them. [Depends: S-65, S-66, S-22]',
    f103,
    'Critical',
    ['mobile', 'ui'],
  );
  add('Task', 'Create app/process/field-matching.tsx', '', s67, 'Critical', ['ui']);
  add('Task', 'Integrate DocumentViewer with FieldEditor', '', s67, 'High', ['ui']);
  add('Task', 'Implement swipe gestures: right=confirm, left=skip', '', s67, 'High', ['ui']);
  add('Task', 'Add haptic feedback on confirmation', '', s67, 'Medium', ['ui']);
  add('Task', 'Add "Confirm All" for high-confidence batches', '', s67, 'High', ['ui']);
  add('Task', 'Show unmatched fields in collapsible panel', '', s67, 'Medium', ['ui']);
  add('Task', 'Write component tests', '', s67, 'Medium', ['ui', 'testing']);

  // ── EPIC 11: Signatures ──
  const e11 = add(
    'Epic',
    'E11: Signatures',
    'Phase 4 — Drawn and typed signature capture, management, and consent flow.',
    null,
    'High',
    ['mobile', 'signatures'],
  );

  const f111 = add(
    'Feature',
    'F11.1: Signature Capture',
    'Drawn signature canvas, typed signatures, preview.',
    e11,
    'High',
    ['mobile', 'signatures'],
  );
  const s68 = add(
    'UserStory',
    'S-68: Build drawn signature canvas',
    'As a user, I want to draw my signature with my finger. [Depends: S-20, S-28]',
    f111,
    'High',
    ['mobile', 'signatures'],
  );
  add('Task', 'Create components/signature/SignaturePad.tsx', '', s68, 'High', [
    'ui',
    'signatures',
  ]);
  add('Task', 'Integrate react-native-signature-canvas', '', s68, 'High', ['mobile']);
  add('Task', 'Capture as PNG image and SVG path', '', s68, 'High', ['mobile']);
  add('Task', 'Add clear and undo controls', '', s68, 'Medium', ['ui']);
  add('Task', 'Write component tests', '', s68, 'Medium', ['ui', 'testing']);

  const s69 = add(
    'UserStory',
    'S-69: Build typed signature component',
    'As a user, I want to type my name and choose a signature font. [Depends: S-27, S-20, S-28]',
    f111,
    'High',
    ['mobile', 'signatures'],
  );
  add('Task', 'Create components/signature/TypedSignature.tsx', '', s69, 'High', [
    'ui',
    'signatures',
  ]);
  add('Task', 'Preview each font option', '', s69, 'Medium', ['ui']);
  add('Task', 'Save selected font + text', '', s69, 'Medium', ['mobile']);
  add('Task', 'Write component tests', '', s69, 'Medium', ['ui', 'testing']);

  const s70 = add(
    'UserStory',
    'S-70: Build signature preview component',
    'As a developer, I want a reusable signature preview for various contexts. [Depends: S-68, S-69]',
    f111,
    'Medium',
    ['ui', 'signatures'],
  );
  add('Task', 'Create components/signature/SignaturePreview.tsx', '', s70, 'Medium', ['ui']);
  add('Task', 'Render drawn or typed signatures with appropriate scaling', '', s70, 'Medium', [
    'ui',
  ]);
  add('Task', 'Write component tests', '', s70, 'Medium', ['ui', 'testing']);

  const f112 = add(
    'Feature',
    'F11.2: Signature Management',
    'Manage saved signatures per profile.',
    e11,
    'Medium',
    ['mobile', 'signatures'],
  );
  const s71 = add(
    'UserStory',
    'S-71: Build signature management screen',
    'As a user, I want to manage my saved signatures. [Depends: S-70, S-29]',
    f112,
    'Medium',
    ['mobile', 'ui', 'signatures'],
  );
  add('Task', 'Create app/signature/manage.tsx', '', s71, 'Medium', ['ui']);
  add('Task', 'List, add, delete, set default signature', '', s71, 'Medium', ['ui']);
  add('Task', 'Write screen tests', '', s71, 'Medium', ['ui', 'testing']);

  const f113 = add(
    'Feature',
    'F11.3: Signature Consent Flow',
    'Consent screen with per-field and blanket signing modes.',
    e11,
    'High',
    ['mobile', 'signatures'],
  );
  const s72 = add(
    'UserStory',
    'S-72: Build signature consent screen',
    'As a user, I want to review and approve signature placements with consent. [Depends: S-70, S-67]',
    f113,
    'High',
    ['mobile', 'signatures'],
  );
  add('Task', 'Create app/process/signature-prompt.tsx', '', s72, 'High', ['ui', 'signatures']);
  add('Task', 'Show document preview with signature locations highlighted', '', s72, 'High', [
    'ui',
  ]);
  add('Task', 'Implement "Review Each" and "Sign All" modes', '', s72, 'High', ['ui']);
  add('Task', 'Store consent choice + timestamp for audit', '', s72, 'High', ['security']);
  add('Task', 'Add stamp animation on signature apply', '', s72, 'Medium', ['ui']);
  add('Task', 'Write component tests', '', s72, 'Medium', ['ui', 'testing']);

  // ── EPIC 12: PDF Generation & Export ──
  const e12 = add(
    'Epic',
    'E12: PDF Generation & Export',
    'Phase 4 — PDF generation, export/share/print, document history.',
    null,
    'High',
    ['mobile', 'pdf'],
  );

  const f121 = add(
    'Feature',
    'F12.1: PDF Generation Service',
    'Fill form fields and overlay text/signatures on PDFs.',
    e12,
    'High',
    ['mobile', 'pdf'],
  );
  const s73 = add(
    'UserStory',
    'S-73: Build PDF generation for form-fill PDFs',
    'As a developer, I want to fill AcroForm fields in existing PDFs. [Depends: S-09]',
    f121,
    'High',
    ['mobile', 'pdf'],
  );
  add('Task', 'Create services/pdf/generator.ts', '', s73, 'High', ['mobile', 'pdf']);
  add('Task', 'Integrate pdf-lib for AcroForm field filling', '', s73, 'High', ['mobile', 'pdf']);
  add('Task', 'Handle checkbox fields', '', s73, 'Medium', ['mobile', 'pdf']);
  add('Task', 'Write unit tests with sample PDF fixtures', '', s73, 'Medium', [
    'mobile',
    'testing',
  ]);

  const s74 = add(
    'UserStory',
    'S-74: Build PDF generation for scanned document overlay',
    'As a developer, I want to draw text and signatures at bounding box coordinates on scanned docs. [Depends: S-73]',
    f121,
    'High',
    ['mobile', 'pdf'],
  );
  add('Task', 'Implement coordinate-based text drawing with page.drawText()', '', s74, 'High', [
    'mobile',
    'pdf',
  ]);
  add('Task', 'Convert relative coords (0-1) to absolute at export time', '', s74, 'High', [
    'mobile',
    'pdf',
  ]);
  add('Task', 'Implement signature image embedding', '', s74, 'High', [
    'mobile',
    'pdf',
    'signatures',
  ]);
  add('Task', 'Handle multi-page documents', '', s74, 'Medium', ['mobile', 'pdf']);
  add('Task', 'Write unit tests', '', s74, 'Medium', ['mobile', 'testing']);

  const s75 = add(
    'UserStory',
    'S-75: Build PDF rendering for preview',
    'As a developer, I want to render PDFs for in-app preview. [Depends: S-02]',
    f121,
    'Medium',
    ['mobile', 'pdf'],
  );
  add('Task', 'Create services/pdf/renderer.ts', '', s75, 'Medium', ['mobile', 'pdf']);
  add('Task', 'Integrate react-native-pdf', '', s75, 'Medium', ['mobile']);
  add('Task', 'Write component tests', '', s75, 'Medium', ['mobile', 'testing']);

  const f122 = add(
    'Feature',
    'F12.2: Export & Sharing',
    'Preview screen with save, share, and print actions.',
    e12,
    'High',
    ['mobile', 'pdf'],
  );
  const s76 = add(
    'UserStory',
    'S-76: Build export preview screen',
    'As a user, I want to preview my filled PDF before exporting. [Depends: S-74, S-75, S-72]',
    f122,
    'High',
    ['mobile', 'ui', 'pdf'],
  );
  add('Task', 'Create app/export/preview.tsx', '', s76, 'High', ['ui']);
  add('Task', 'Render filled PDF full-screen with scroll', '', s76, 'High', ['ui', 'pdf']);
  add('Task', 'Add action bar: Share, Print, Save', '', s76, 'High', ['ui']);
  add('Task', 'Add "Looks wrong?" link back to field review', '', s76, 'Medium', ['ui']);
  add('Task', 'Write screen tests', '', s76, 'Medium', ['ui', 'testing']);

  const s77 = add(
    'UserStory',
    'S-77: Implement share, save, and print actions',
    'As a user, I want to save, share, or print my completed PDF. [Depends: S-76]',
    f122,
    'High',
    ['mobile'],
  );
  add('Task', 'Implement save to device via expo-file-system', '', s77, 'High', ['mobile']);
  add('Task', 'Implement share via expo-sharing', '', s77, 'High', ['mobile']);
  add('Task', 'Implement print via expo-print', '', s77, 'Medium', ['mobile']);
  add('Task', 'Update document status to "exported"', '', s77, 'Medium', ['mobile', 'data']);
  add('Task', 'Write integration tests', '', s77, 'Medium', ['mobile', 'testing']);

  const f123 = add(
    'Feature',
    'F12.3: Document History',
    'Document list with status, resume, and delete.',
    e12,
    'Medium',
    ['mobile', 'ui'],
  );
  const s78 = add(
    'UserStory',
    'S-78: Build document history list screen',
    'As a user, I want to see my processed documents and their statuses. [Depends: S-24, S-29]',
    f123,
    'Medium',
    ['mobile', 'ui'],
  );
  add('Task', 'Create app/(tabs)/documents.tsx', '', s78, 'Medium', ['ui']);
  add('Task', 'Display documents with status chips and metadata', '', s78, 'Medium', ['ui']);
  add('Task', 'Tap to resume processing or view export', '', s78, 'Medium', ['ui']);
  add('Task', 'Implement delete with confirmation', '', s78, 'Medium', ['ui']);
  add('Task', 'Write screen tests', '', s78, 'Medium', ['ui', 'testing']);

  // ── EPIC 13: Security Hardening ──
  const e13 = add(
    'Epic',
    'E13: Security Hardening',
    'Phase 5 — Biometric/PIN lock, auto-lock, security settings.',
    null,
    'High',
    ['security'],
  );

  const f131 = add(
    'Feature',
    'F13.1: Biometric & PIN Lock',
    'App-level security with biometric authentication and auto-lock.',
    e13,
    'High',
    ['mobile', 'security'],
  );
  const s79 = add(
    'UserStory',
    'S-79: Implement biometric authentication',
    'As a user, I want to lock my app with Face ID or fingerprint. [Depends: S-23]',
    f131,
    'High',
    ['mobile', 'security'],
  );
  add('Task', 'Integrate expo-local-authentication', '', s79, 'High', ['mobile', 'security']);
  add('Task', 'Check device capability', '', s79, 'Medium', ['mobile']);
  add('Task', 'Implement auth prompt on app launch', '', s79, 'High', ['mobile', 'security']);
  add('Task', 'Write integration tests', '', s79, 'Medium', ['mobile', 'testing']);

  const s80 = add(
    'UserStory',
    'S-80: Implement auto-lock on background',
    'As a user, I want the app to re-lock after a timeout. [Depends: S-79]',
    f131,
    'High',
    ['mobile', 'security'],
  );
  add('Task', 'Detect app background via AppState', '', s80, 'High', ['mobile']);
  add('Task', 'Start timer based on configurable timeout', '', s80, 'High', ['mobile', 'security']);
  add('Task', 'Clear sensitive data from Zustand on background', '', s80, 'High', [
    'mobile',
    'security',
  ]);
  add('Task', 'Write integration tests', '', s80, 'Medium', ['mobile', 'testing']);

  const s81 = add(
    'UserStory',
    'S-81: Build security settings UI',
    'As a user, I want to configure biometric lock and auto-lock timeout. [Depends: S-79, S-80, S-29]',
    f131,
    'Medium',
    ['mobile', 'ui', 'security'],
  );
  add('Task', 'Add biometric lock toggle in settings', '', s81, 'Medium', ['ui']);
  add('Task', 'Add auto-lock timeout picker', '', s81, 'Medium', ['ui']);
  add('Task', 'Write component tests', '', s81, 'Medium', ['ui', 'testing']);

  // ── EPIC 14: Cloud Backup ──
  const e14 = add(
    'Epic',
    'E14: Cloud Backup',
    'Phase 5 — Google Drive and iCloud backup with encrypted data.',
    null,
    'Medium',
    ['mobile', 'cloud'],
  );

  const f141 = add(
    'Feature',
    'F14.1: Google Drive Backup',
    'Backup/restore encrypted database to Google Drive.',
    e14,
    'Medium',
    ['mobile', 'cloud'],
  );
  const s82 = add(
    'UserStory',
    'S-82: Build Google Drive backup service',
    'As a user, I want to back up my data to Google Drive. [Depends: S-56, S-15]',
    f141,
    'Medium',
    ['mobile', 'cloud'],
  );
  add('Task', 'Create services/cloud/googleDrive.ts', '', s82, 'Medium', ['mobile', 'cloud']);
  add('Task', 'Implement backup (encrypted SQLite + files)', '', s82, 'Medium', [
    'mobile',
    'cloud',
    'security',
  ]);
  add('Task', 'Implement restore from backup', '', s82, 'Medium', ['mobile', 'cloud']);
  add('Task', 'Queue offline backups for reconnect', '', s82, 'Medium', ['mobile', 'cloud']);
  add('Task', 'Write integration tests', '', s82, 'Medium', ['mobile', 'testing']);

  const s83 = add(
    'UserStory',
    'S-83: Build Google Drive backup settings UI',
    'As a user, I want to configure backup frequency and trigger manual backups. [Depends: S-82, S-29]',
    f141,
    'Low',
    ['mobile', 'ui', 'cloud'],
  );
  add('Task', 'Add backup toggle and frequency selector in settings', '', s83, 'Low', ['ui']);
  add('Task', 'Add manual backup/restore buttons', '', s83, 'Low', ['ui']);
  add('Task', 'Write component tests', '', s83, 'Low', ['ui', 'testing']);

  const f142 = add(
    'Feature',
    'F14.2: iCloud Backup',
    'Backup/restore to iCloud (iOS only).',
    e14,
    'Medium',
    ['mobile', 'cloud'],
  );
  const s84 = add(
    'UserStory',
    'S-84: Build iCloud backup service',
    'As an iOS user, I want to back up my data to iCloud. [Depends: S-15]',
    f142,
    'Medium',
    ['mobile', 'cloud'],
  );
  add('Task', 'Create services/cloud/icloud.ts', '', s84, 'Medium', ['mobile', 'cloud']);
  add('Task', 'Implement backup and restore matching Google Drive API surface', '', s84, 'Medium', [
    'mobile',
    'cloud',
  ]);
  add('Task', 'Write integration tests', '', s84, 'Medium', ['mobile', 'testing']);

  const s85 = add(
    'UserStory',
    'S-85: Build iCloud backup settings UI',
    'As an iOS user, I want iCloud backup toggle in settings. [Depends: S-84, S-29]',
    f142,
    'Low',
    ['mobile', 'ui', 'cloud'],
  );
  add('Task', 'Add iCloud backup toggle (iOS only)', '', s85, 'Low', ['ui']);
  add('Task', 'Write component tests', '', s85, 'Low', ['ui', 'testing']);

  // ── EPIC 15: Onboarding & Polish ──
  const e15 = add(
    'Epic',
    'E15: Onboarding & Polish',
    'Phase 5 — First-time onboarding, performance, accessibility, monetization hooks, analytics, settings.',
    null,
    'Medium',
    ['mobile'],
  );

  const f151 = add(
    'Feature',
    'F15.1: Onboarding Flow',
    'First-time user onboarding screens.',
    e15,
    'Medium',
    ['mobile', 'ui'],
  );
  const s86 = add(
    'UserStory',
    'S-86: Build first-time onboarding screens',
    'As a new user, I want a walkthrough explaining the app. [Depends: S-29, S-32]',
    f151,
    'Medium',
    ['mobile', 'ui'],
  );
  add('Task', 'Build 3-4 swipeable onboarding screens', '', s86, 'Medium', ['ui']);
  add('Task', 'Prompt profile creation at the end', '', s86, 'Medium', ['ui']);
  add('Task', 'Store onboarding-completed flag', '', s86, 'Low', ['mobile']);
  add('Task', 'Write component tests', '', s86, 'Low', ['ui', 'testing']);

  const f152 = add(
    'Feature',
    'F15.2: Performance Optimization',
    'Lazy loading, memory management, image caching.',
    e15,
    'High',
    ['mobile'],
  );
  const s87 = add(
    'UserStory',
    'S-87: Implement lazy loading and memory management',
    'As a user, I want the app to be fast and not crash on large documents. [Depends: Phase 4 complete]',
    f152,
    'High',
    ['mobile'],
  );
  add('Task', 'Lazy load heavy screens', '', s87, 'High', ['mobile']);
  add('Task', 'Use thumbnails in lists, full-res only when needed', '', s87, 'Medium', ['mobile']);
  add('Task', 'Implement image cache eviction', '', s87, 'Medium', ['mobile']);
  add('Task', 'Profile memory usage and fix top offenders', '', s87, 'High', ['mobile']);

  const f153 = add(
    'Feature',
    'F15.3: Accessibility',
    'Screen reader support, contrast, tap targets.',
    e15,
    'Medium',
    ['mobile', 'ui'],
  );
  const s88 = add(
    'UserStory',
    'S-88: Conduct accessibility audit and remediation',
    'As a user with disabilities, I want the app to be accessible. [Depends: Phase 4 complete]',
    f153,
    'Medium',
    ['mobile', 'ui'],
  );
  add('Task', 'Add screen reader labels to all interactive elements', '', s88, 'Medium', ['ui']);
  add('Task', 'Verify color contrast meets WCAG AA', '', s88, 'Medium', ['ui']);
  add('Task', 'Ensure 44x44pt minimum tap targets', '', s88, 'Medium', ['ui']);
  add('Task', 'Test with VoiceOver and TalkBack', '', s88, 'Medium', ['mobile', 'testing']);

  const f154 = add(
    'Feature',
    'F15.4: Monetization & Analytics',
    'Usage tier abstraction and mobile analytics.',
    e15,
    'Low',
    ['mobile'],
  );
  const s89 = add(
    'UserStory',
    'S-89: Add monetization abstraction layer',
    'As a developer, I want tier hooks in place for future payment integration. [Depends: S-23]',
    f154,
    'Low',
    ['mobile'],
  );
  add('Task', 'Create usage tier constants (free, premium)', '', s89, 'Low', ['mobile']);
  add('Task', 'Add tier check hooks at key points', '', s89, 'Low', ['mobile']);
  add('Task', 'Write unit tests', '', s89, 'Low', ['mobile', 'testing']);

  const s90 = add(
    'UserStory',
    'S-90: Integrate analytics on mobile',
    'As a developer, I want usage analytics without PII. [Depends: S-23, S-53]',
    f154,
    'Low',
    ['mobile'],
  );
  add('Task', 'Add analytics events at key actions', '', s90, 'Low', ['mobile']);
  add('Task', 'Ensure no PII is sent', '', s90, 'Medium', ['mobile', 'security']);
  add('Task', 'Write unit tests verifying no PII leakage', '', s90, 'Medium', [
    'mobile',
    'testing',
  ]);

  const f155 = add(
    'Feature',
    'F15.5: Settings Screen',
    'Complete settings screen with all configuration options.',
    e15,
    'Medium',
    ['mobile', 'ui'],
  );
  const s91 = add(
    'UserStory',
    'S-91: Build complete settings screen',
    'As a user, I want all app settings in one place. [Depends: S-81, S-83, S-85, S-89]',
    f155,
    'Medium',
    ['mobile', 'ui'],
  );
  add('Task', 'Create app/(tabs)/settings.tsx with all sections', '', s91, 'Medium', ['ui']);
  add('Task', 'Theme toggle, security, backup, account, about', '', s91, 'Medium', ['ui']);
  add('Task', 'Write screen tests', '', s91, 'Medium', ['ui', 'testing']);

  // ── EPIC 16: Web Platform (Future) ──
  const e16 = add(
    'Epic',
    'E16: Web Platform (Future)',
    'Phase 6 — Web OCR, camera, encryption, and UI adaptations. Deferred.',
    null,
    'Low',
    ['web'],
  );

  const f161 = add(
    'Feature',
    'F16.1: Web OCR',
    'Tesseract.js integration for web platform.',
    e16,
    'Low',
    ['web'],
  );
  const s92 = add(
    'UserStory',
    'S-92: Integrate Tesseract.js for web OCR',
    'As a web user, I want OCR to work in the browser. [Depends: S-43]',
    f161,
    'Low',
    ['web'],
  );
  add('Task', 'Create services/ocr/tesseract.ts', '', s92, 'Low', ['web']);
  add('Task', 'Wire into platform-aware OCR abstraction', '', s92, 'Low', ['web']);

  const f162 = add('Feature', 'F16.2: Web Camera', 'Browser-based document capture.', e16, 'Low', [
    'web',
  ]);
  const s93 = add(
    'UserStory',
    'S-93: Implement web camera document capture',
    'As a web user, I want to scan documents using my webcam. [Depends: S-39]',
    f162,
    'Low',
    ['web'],
  );
  add('Task', 'Build expo-camera based scanner for web', '', s93, 'Low', ['web']);
  add('Task', 'Implement basic edge detection', '', s93, 'Low', ['web']);

  const f163 = add(
    'Feature',
    'F16.3: Web Crypto',
    'Web Crypto API encryption for browser.',
    e16,
    'Low',
    ['web', 'security'],
  );
  const s94 = add(
    'UserStory',
    'S-94: Implement Web Crypto API encryption',
    'As a web user, I want my data encrypted in the browser. [Depends: S-13]',
    f163,
    'Low',
    ['web', 'security'],
  );
  add('Task', 'Build platform-aware encryption using Web Crypto on web', '', s94, 'Low', [
    'web',
    'security',
  ]);

  const f164 = add(
    'Feature',
    'F16.4: Web UI Adaptations',
    'Responsive layout for desktop/tablet browsers.',
    e16,
    'Low',
    ['web', 'ui'],
  );
  const s95 = add(
    'UserStory',
    'S-95: Adapt UI for web viewport',
    'As a web user, I want the app to work well on desktop/tablet. [Depends: S-29]',
    f164,
    'Low',
    ['web', 'ui'],
  );
  add('Task', 'Responsive layout for desktop/tablet', '', s95, 'Low', ['web', 'ui']);
  add('Task', 'Replace native-only components with web equivalents', '', s95, 'Low', ['web', 'ui']);

  return items;
}

// ============================================================
// State Management
// ============================================================
let state = loadState();
let saveTimeout = null;
let editingItemId = null;
let draggedItemId = null;

function defaultState() {
  return {
    version: SCHEMA_VERSION,
    items: buildSeedData(),
    settings: {
      viewMode: 'board',
      filterEpic: '',
      filterType: '',
      filterAssignee: '',
      filterSearch: '',
      sidebarCollapsed: false,
      collapsedItems: [],
    },
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.items)) {
        // Migrate v1 → v2: add pipelineStage field
        if (parsed.version === 1) {
          parsed.items.forEach((i) => {
            if (!i.pipelineStage) i.pipelineStage = 'none';
          });
          parsed.version = 2;
        }
        if (parsed.version === SCHEMA_VERSION) return parsed;
      }
    }
  } catch (e) {
    /* ignore */
  }
  return defaultState();
}

function saveState() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    state.items.forEach((i) => (i.updatedAt = new Date().toISOString()));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, 300);
}

function getItem(id) {
  return state.items.find((i) => i.id === id);
}
function getChildren(id) {
  return state.items.filter((i) => i.parentId === id);
}
function getAncestors(id) {
  const result = [];
  let item = getItem(id);
  while (item && item.parentId) {
    item = getItem(item.parentId);
    if (item) result.unshift(item);
  }
  return result;
}

function getDescendantIds(id) {
  const ids = [];
  const queue = [id];
  while (queue.length) {
    const current = queue.shift();
    const children = getChildren(current);
    for (const c of children) {
      ids.push(c.id);
      queue.push(c.id);
    }
  }
  return ids;
}

function getProgress(id) {
  const children = getChildren(id);
  if (children.length === 0) {
    const item = getItem(id);
    return item && item.status === 'Done' ? 1 : 0;
  }
  let total = 0;
  for (const c of children) total += getProgress(c.id);
  return total / children.length;
}

function getFilteredItems() {
  let items = state.items;
  const { filterEpic, filterType, filterAssignee, filterSearch } = state.settings;

  if (filterEpic) {
    const descIds = new Set(getDescendantIds(filterEpic));
    descIds.add(filterEpic);
    items = items.filter((i) => descIds.has(i.id));
  }
  if (filterType) {
    items = items.filter((i) => i.type === filterType);
  }
  if (filterAssignee) {
    items = items.filter((i) => i.assignee === filterAssignee);
  }
  if (filterSearch) {
    const q = filterSearch.toLowerCase();
    items = items.filter(
      (i) => i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q),
    );
  }
  return items;
}

// ============================================================
// Rendering
// ============================================================
function render() {
  renderBoard();
  renderSidebar();
  renderFilters();
  renderStats();
}

function renderBoard() {
  const filtered = getFilteredItems();
  for (const status of STATUSES) {
    const col = document.getElementById('col-' + status);
    const countEl = document.getElementById('count-' + status);
    const statusItems = filtered
      .filter((i) => i.status === status)
      .sort((a, b) => a.order - b.order);
    countEl.textContent = statusItems.length;
    col.innerHTML = '';
    for (const item of statusItems) {
      col.appendChild(createCard(item));
    }
  }
}

function createCard(item) {
  const card = document.createElement('div');
  card.className = 'card';
  card.draggable = true;
  card.dataset.id = item.id;
  card.dataset.type = item.type;

  const ancestors = getAncestors(item.id);
  const breadcrumb = ancestors
    .map((a) => a.title.replace(/^[EFS]\d+[-:]?\s*/, '').substring(0, 20))
    .join(' > ');
  const children = getChildren(item.id);
  const progress = children.length > 0 ? getProgress(item.id) : -1;
  const initials = item.assignee
    ? item.assignee
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .substring(0, 2)
    : '';

  // Extract short ID (S-XX pattern or type abbreviation)
  const idMatch = item.title.match(/^(S-\d+|E\d+|F\d+[\.\d]*)/);
  const shortId = idMatch ? idMatch[1] : '';

  const pipelineStage = item.pipelineStage || 'none';
  const pipelineLabel = PIPELINE_LABELS[pipelineStage] || '';
  const pipelineColor = PIPELINE_COLORS[pipelineStage] || '';

  card.innerHTML = `
    <div class="card-top">
      <span class="card-type" data-type="${item.type}">${TYPE_LABELS[item.type]}</span>
      <span class="card-priority" data-priority="${item.priority}" title="${item.priority}"></span>
      ${pipelineLabel ? `<span class="card-pipeline" style="background:${pipelineColor}20;color:${pipelineColor};border:1px solid ${pipelineColor}40">${pipelineLabel}</span>` : ''}
      ${shortId ? `<span class="card-id">${shortId}</span>` : ''}
    </div>
    <div class="card-title">${escapeHtml(item.title.replace(/^[A-Z]-?\d+[\.\d]*:\s*/, ''))}</div>
    <div class="card-bottom">
      <span class="card-breadcrumb" title="${escapeHtml(breadcrumb)}">${escapeHtml(breadcrumb)}</span>
      ${children.length > 0 ? `<span class="card-children">${children.length}</span>` : ''}
      ${initials ? `<span class="card-assignee" title="${escapeHtml(item.assignee)}">${initials}</span>` : ''}
    </div>
    ${progress >= 0 ? `<div class="card-progress"><div class="card-progress-fill" style="width:${Math.round(progress * 100)}%"></div></div>` : ''}
  `;

  card.addEventListener('click', () => openModal(item.id));
  card.addEventListener('dragstart', onDragStart);
  card.addEventListener('dragend', onDragEnd);

  return card;
}

function renderSidebar() {
  const tree = document.getElementById('sidebar-tree');
  tree.innerHTML = '';
  const epics = state.items
    .filter((i) => i.type === 'Epic' && !i.parentId)
    .sort((a, b) => a.order - b.order);
  for (const epic of epics) {
    renderTreeItem(tree, epic, 0);
  }
}

function renderTreeItem(container, item, depth) {
  const children = getChildren(item.id).sort((a, b) => a.order - b.order);
  const isCollapsed = state.settings.collapsedItems.includes(item.id);
  const progress = getProgress(item.id);
  const pct = Math.round(progress * 100);
  const isActive = state.settings.filterEpic === item.id;

  const typeColor = `var(--${item.type === 'UserStory' ? 'story' : item.type.toLowerCase()})`;

  const el = document.createElement('div');
  el.className = 'tree-item' + (isActive ? ' active' : '');
  el.style.setProperty('--depth', depth);
  el.innerHTML = `
    <span class="tree-toggle">${children.length > 0 ? (isCollapsed ? '&#9654;' : '&#9660;') : ''}</span>
    <span class="tree-type-dot" style="background:${typeColor}"></span>
    <span class="tree-label" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</span>
    <span class="tree-progress">
      <div class="tree-progress-bar"><div class="tree-progress-fill" style="width:${pct}%"></div></div>
      <div class="tree-pct">${pct}%</div>
    </span>
  `;

  el.addEventListener('click', (e) => {
    e.stopPropagation();
    if (e.target.closest('.tree-toggle') && children.length > 0) {
      toggleCollapse(item.id);
    } else {
      state.settings.filterEpic = state.settings.filterEpic === item.id ? '' : item.id;
      document.getElementById('filter-epic').value = state.settings.filterEpic;
      saveState();
      render();
    }
  });

  container.appendChild(el);

  if (!isCollapsed && children.length > 0) {
    for (const child of children) {
      renderTreeItem(container, child, depth + 1);
    }
  }
}

function toggleCollapse(id) {
  const idx = state.settings.collapsedItems.indexOf(id);
  if (idx >= 0) state.settings.collapsedItems.splice(idx, 1);
  else state.settings.collapsedItems.push(id);
  saveState();
  render();
}

function renderFilters() {
  // Epic dropdown
  const epicSelect = document.getElementById('filter-epic');
  const currentEpic = state.settings.filterEpic;
  const epics = state.items.filter((i) => i.type === 'Epic').sort((a, b) => a.order - b.order);
  epicSelect.innerHTML =
    '<option value="">All Epics</option>' +
    epics
      .map(
        (e) =>
          `<option value="${e.id}" ${e.id === currentEpic ? 'selected' : ''}>${escapeHtml(e.title)}</option>`,
      )
      .join('');

  // Assignee dropdown
  const assigneeSelect = document.getElementById('filter-assignee');
  const assignees = [...new Set(state.items.map((i) => i.assignee).filter(Boolean))].sort();
  assigneeSelect.innerHTML =
    '<option value="">All Assignees</option>' +
    assignees
      .map(
        (a) =>
          `<option value="${a}" ${a === state.settings.filterAssignee ? 'selected' : ''}>${escapeHtml(a)}</option>`,
      )
      .join('');

  document.getElementById('filter-type').value = state.settings.filterType || '';
  document.getElementById('filter-search').value = state.settings.filterSearch || '';
}

function renderStats() {
  const filtered = getFilteredItems();
  const total = filtered.length;
  const done = filtered.filter((i) => i.status === 'Done').length;
  document.getElementById('filter-stats').textContent = `${done}/${total} done`;
}

// ============================================================
// Modal
// ============================================================
function openModal(id) {
  editingItemId = id;
  const item = id ? getItem(id) : null;
  const overlay = document.getElementById('modal-overlay');
  document.getElementById('modal-title').textContent = item ? 'Edit Item' : 'New Item';
  document.getElementById('item-title').value = item ? item.title : '';
  document.getElementById('item-description').value = item ? item.description : '';
  document.getElementById('item-type').value = item ? item.type : 'UserStory';
  document.getElementById('item-status').value = item ? item.status : 'Backlog';
  document.getElementById('item-priority').value = item ? item.priority : 'Medium';
  document.getElementById('item-assignee').value = item ? item.assignee : '';
  document.getElementById('item-tags').value = item ? item.tags.join(', ') : '';
  document.getElementById('item-pipeline').value = item ? item.pipelineStage || 'none' : 'none';
  document.getElementById('btn-delete-item').style.display = item ? '' : 'none';

  // Parent dropdown
  const parentSelect = document.getElementById('item-parent');
  const itemType = item ? item.type : 'UserStory';
  const validParentTypes = getValidParentTypes(itemType);
  const possibleParents = state.items.filter(
    (i) => validParentTypes.includes(i.type) && (!item || i.id !== item.id),
  );
  parentSelect.innerHTML =
    '<option value="">None</option>' +
    possibleParents
      .sort((a, b) => a.order - b.order)
      .map(
        (p) =>
          `<option value="${p.id}" ${item && item.parentId === p.id ? 'selected' : ''}>${escapeHtml(p.title)}</option>`,
      )
      .join('');

  // Meta
  if (item) {
    document.getElementById('item-meta').innerHTML =
      `Created: ${new Date(item.createdAt).toLocaleDateString()} &middot; Updated: ${new Date(item.updatedAt).toLocaleDateString()}`;
  } else {
    document.getElementById('item-meta').innerHTML = '';
  }

  overlay.classList.add('open');
  document.getElementById('item-title').focus();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  editingItemId = null;
}

function saveModal() {
  const title = document.getElementById('item-title').value.trim();
  if (!title) return;

  const data = {
    title,
    description: document.getElementById('item-description').value.trim(),
    type: document.getElementById('item-type').value,
    status: document.getElementById('item-status').value,
    priority: document.getElementById('item-priority').value,
    parentId: document.getElementById('item-parent').value || null,
    assignee: document.getElementById('item-assignee').value.trim(),
    tags: document
      .getElementById('item-tags')
      .value.split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    pipelineStage: document.getElementById('item-pipeline').value || 'none',
  };

  if (editingItemId) {
    const item = getItem(editingItemId);
    Object.assign(item, data, { updatedAt: new Date().toISOString() });
  } else {
    state.items.push({
      id: generateId(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      order: state.items.length,
    });
  }

  saveState();
  closeModal();
  render();
}

function deleteItem() {
  if (!editingItemId) return;
  if (!confirm('Delete this item and all its children?')) return;

  const idsToRemove = new Set([editingItemId, ...getDescendantIds(editingItemId)]);
  state.items = state.items.filter((i) => !idsToRemove.has(i.id));

  saveState();
  closeModal();
  render();
}

function getValidParentTypes(type) {
  switch (type) {
    case 'Epic':
      return [];
    case 'Feature':
      return ['Epic'];
    case 'UserStory':
      return ['Feature'];
    case 'Task':
      return ['UserStory'];
    default:
      return [];
  }
}

// ============================================================
// Drag and Drop
// ============================================================
function onDragStart(e) {
  draggedItemId = e.currentTarget.dataset.id;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', draggedItemId);
}

function onDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  draggedItemId = null;
  document
    .querySelectorAll('.column-body.drag-over')
    .forEach((el) => el.classList.remove('drag-over'));
  document.querySelectorAll('.drop-indicator').forEach((el) => el.remove());
}

function initDragDrop() {
  for (const status of STATUSES) {
    const col = document.getElementById('col-' + status);

    col.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      col.classList.add('drag-over');

      // Show drop indicator
      document.querySelectorAll('.drop-indicator').forEach((el) => el.remove());
      const afterEl = getDragAfterElement(col, e.clientY);
      const indicator = document.createElement('div');
      indicator.className = 'drop-indicator';
      if (afterEl) col.insertBefore(indicator, afterEl);
      else col.appendChild(indicator);
    });

    col.addEventListener('dragleave', (e) => {
      if (!col.contains(e.relatedTarget)) {
        col.classList.remove('drag-over');
        col.querySelectorAll('.drop-indicator').forEach((el) => el.remove());
      }
    });

    col.addEventListener('drop', (e) => {
      e.preventDefault();
      col.classList.remove('drag-over');
      col.querySelectorAll('.drop-indicator').forEach((el) => el.remove());

      const itemId = e.dataTransfer.getData('text/plain');
      const item = getItem(itemId);
      if (!item) return;

      item.status = status;
      item.updatedAt = new Date().toISOString();

      // Reorder
      const afterEl = getDragAfterElement(col, e.clientY);
      const colItems = getFilteredItems()
        .filter((i) => i.status === status)
        .sort((a, b) => a.order - b.order);
      if (afterEl) {
        const afterItem = getItem(afterEl.dataset.id);
        if (afterItem) item.order = afterItem.order - 0.5;
      } else {
        item.order = colItems.length > 0 ? colItems[colItems.length - 1].order + 1 : 0;
      }

      // Normalize order
      const sorted = state.items
        .filter((i) => i.status === status)
        .sort((a, b) => a.order - b.order);
      sorted.forEach((it, idx) => (it.order = idx));

      saveState();
      render();
    });
  }
}

function getDragAfterElement(column, y) {
  const cards = [...column.querySelectorAll('.card:not(.dragging)')];
  let closest = null;
  let closestOffset = Number.NEGATIVE_INFINITY;

  for (const card of cards) {
    const box = card.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closestOffset) {
      closestOffset = offset;
      closest = card;
    }
  }
  return closest;
}

// ============================================================
// Touch Drag Support
// ============================================================
let touchDragItem = null;
let touchGhost = null;
let touchStartY = 0;

function initTouchDrag() {
  document.addEventListener(
    'touchstart',
    (e) => {
      const card = e.target.closest('.card');
      if (!card) return;
      touchDragItem = card;
      touchStartY = e.touches[0].clientY;
    },
    { passive: true },
  );

  document.addEventListener(
    'touchmove',
    (e) => {
      if (!touchDragItem) return;
      const dy = Math.abs(e.touches[0].clientY - touchStartY);
      if (dy < 10 && !touchGhost) return;
      e.preventDefault();

      if (!touchGhost) {
        touchGhost = touchDragItem.cloneNode(true);
        touchGhost.style.position = 'fixed';
        touchGhost.style.width = touchDragItem.offsetWidth + 'px';
        touchGhost.style.opacity = '0.8';
        touchGhost.style.zIndex = '9999';
        touchGhost.style.pointerEvents = 'none';
        document.body.appendChild(touchGhost);
        touchDragItem.classList.add('dragging');
      }

      touchGhost.style.left = e.touches[0].clientX - touchGhost.offsetWidth / 2 + 'px';
      touchGhost.style.top = e.touches[0].clientY - 20 + 'px';

      // Highlight column under touch
      document
        .querySelectorAll('.column-body.drag-over')
        .forEach((el) => el.classList.remove('drag-over'));
      const el = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
      const col = el ? el.closest('.column-body') : null;
      if (col) col.classList.add('drag-over');
    },
    { passive: false },
  );

  document.addEventListener('touchend', (e) => {
    if (!touchDragItem || !touchGhost) {
      touchDragItem = null;
      return;
    }

    const touch = e.changedTouches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const col = el ? el.closest('.column-body') : null;

    if (col) {
      const status = col.id.replace('col-', '');
      const item = getItem(touchDragItem.dataset.id);
      if (item && STATUSES.includes(status)) {
        item.status = status;
        item.updatedAt = new Date().toISOString();
        saveState();
        render();
      }
    }

    touchDragItem.classList.remove('dragging');
    if (touchGhost) touchGhost.remove();
    document
      .querySelectorAll('.column-body.drag-over')
      .forEach((el) => el.classList.remove('drag-over'));
    touchDragItem = null;
    touchGhost = null;
  });
}

// ============================================================
// Export / Import
// ============================================================
function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fillit-tracker-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data || !Array.isArray(data.items)) {
        alert('Invalid tracker data file.');
        return;
      }
      if (!confirm(`Import ${data.items.length} items? This will replace all current data.`))
        return;
      state = data;
      state.version = SCHEMA_VERSION;
      saveState();
      render();
    } catch (err) {
      alert('Failed to parse JSON file: ' + err.message);
    }
  };
  reader.readAsText(file);
}

// ============================================================
// Utilities
// ============================================================
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ============================================================
// Event Binding
// ============================================================
function init() {
  // Sidebar toggle
  document.getElementById('sidebar-toggle').addEventListener('click', () => {
    state.settings.sidebarCollapsed = !state.settings.sidebarCollapsed;
    document
      .getElementById('sidebar')
      .classList.toggle('collapsed', state.settings.sidebarCollapsed);
    saveState();
  });
  document.getElementById('sidebar').classList.toggle('collapsed', state.settings.sidebarCollapsed);

  // Filters
  document.getElementById('filter-epic').addEventListener('change', (e) => {
    state.settings.filterEpic = e.target.value;
    saveState();
    render();
  });
  document.getElementById('filter-type').addEventListener('change', (e) => {
    state.settings.filterType = e.target.value;
    saveState();
    render();
  });
  document.getElementById('filter-assignee').addEventListener('change', (e) => {
    state.settings.filterAssignee = e.target.value;
    saveState();
    render();
  });
  document.getElementById('filter-search').addEventListener('input', (e) => {
    state.settings.filterSearch = e.target.value;
    saveState();
    render();
  });

  // New item
  document.getElementById('btn-new-item').addEventListener('click', () => openModal(null));

  // Modal
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('btn-cancel').addEventListener('click', closeModal);
  document.getElementById('btn-save').addEventListener('click', saveModal);
  document.getElementById('btn-delete-item').addEventListener('click', deleteItem);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  // Update parent dropdown when type changes in modal
  document.getElementById('item-type').addEventListener('change', (e) => {
    const parentSelect = document.getElementById('item-parent');
    const validTypes = getValidParentTypes(e.target.value);
    const possibleParents = state.items.filter((i) => validTypes.includes(i.type));
    parentSelect.innerHTML =
      '<option value="">None</option>' +
      possibleParents
        .sort((a, b) => a.order - b.order)
        .map((p) => `<option value="${p.id}">${escapeHtml(p.title)}</option>`)
        .join('');
  });

  // Export / Import
  document.getElementById('btn-export').addEventListener('click', exportData);
  document
    .getElementById('btn-import')
    .addEventListener('click', () => document.getElementById('import-file').click());
  document.getElementById('import-file').addEventListener('change', (e) => {
    if (e.target.files[0]) importData(e.target.files[0]);
    e.target.value = '';
  });

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Drag and drop
  initDragDrop();
  initTouchDrag();

  // Initial render
  render();
}

// Boot
document.addEventListener('DOMContentLoaded', init);
