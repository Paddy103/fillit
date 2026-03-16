# FillIt Project

## Overview

FillIt is a cross-platform mobile app (React Native + Expo) that scans/imports documents, uses Claude AI for field detection, auto-fills from user profiles, supports signatures, and exports completed PDFs. Target market: South Africa.

## Tech Stack

- **Mobile**: React Native + Expo SDK 55+, Expo Router, Zustand, expo-sqlite
- **Backend**: Hono on Node.js, deployed to Render
- **AI**: @anthropic-ai/sdk (Claude API via backend proxy)
- **PDF**: pdf-lib for generation
- **Monorepo**: pnpm workspaces

## Repository Structure

```
fillit/
├── apps/
│   ├── mobile/          # Expo React Native app
│   └── server/          # Hono backend proxy
├── packages/
│   └── shared/          # Shared types, validation, constants, normalization
├── tests/               # Project-wide tests (infrastructure, integration)
├── implementation-plan/ # Full project spec (source of truth)
├── scripts/             # Pipeline and utility scripts
├── .github/workflows/   # CI/CD pipelines
├── .claude/
│   ├── agents/          # Pipeline agent definitions
│   ├── skills/          # User-invocable skills
│   └── settings.json    # Permissions, hooks (auto-format, file protection)
└── .mcp.json            # Team-shared MCP server config (context7, GitHub)
```

## Conventions

- **Language**: TypeScript everywhere (strict mode)
- **Formatting**: Prettier (2-space indent, single quotes, trailing commas)
- **Linting**: ESLint with @typescript-eslint
- **Testing**: Jest + React Native Testing Library (mobile), Vitest (server/shared)
- **Commits**: Conventional Commits (`feat:`, `fix:`, `test:`, `refactor:`, `docs:`, `chore:`)
- **Branches**: `feature/<story-id>-<short-name>` (e.g., `feature/S-01-pnpm-monorepo`)
- **PRs**: One PR per user story, linked to GitHub Issue (use `Closes #N` in PR body)
- **Tracking**: GitHub Issues + GitHub Projects board (project #2). Stories are issues titled `S-XX: <title>`. Pipeline agents update issue labels and board status automatically via `scripts/update-issue-status.sh`.

## Development Pipeline

This project uses a multi-agent Claude Code pipeline for development. See `.claude/agents/` for agent definitions.

### Pipeline Flow

```
User kicks off story → Issue moved to "In Progress" on project board
                     → Builder Agent (feature branch + implementation)
                     → Tester Agent (writes comprehensive tests)
                     → Reviewer Agent (senior engineer code review)
                     → QA Agent (functional + bug verification)
                     → Docs Updater Agent (updates all READMEs + CLAUDE.md)
                     → Issue moved to "In Review", PR created
                     → User Final Approval → Merge PR
                     → Issue auto-closed, moved to "Done"
                     → CI/CD Build + Deploy
```

### Running the Pipeline

```bash
# From Claude Code, invoke the pipeline orchestrator:
/agents/pipeline

# Or kick off individual agents:
/agents/builder            # Build a feature
/agents/tester             # Write tests for a feature
/agents/reviewer           # Code review
/agents/security-reviewer  # Security audit (parallel with reviewer)
/agents/ux-reviewer        # UX/accessibility review (UI stories)
/agents/qa                 # QA verification
/agents/docs-updater       # Update documentation
```

### Skills

```bash
/pipeline-status S-01    # Check pipeline stage progress for a story
/new-story S-15 sqlite   # Bootstrap a new story (branch + scaffold)
```

### Agent Roles

| Agent                 | Role                                                              | When it runs                     |
| --------------------- | ----------------------------------------------------------------- | -------------------------------- |
| **pipeline**          | Orchestrator — coordinates the full flow                          | User kicks off a story           |
| **builder**           | Implements the feature on a feature branch                        | Stage 1                          |
| **tester**            | Writes unit, integration, and e2e tests                           | Stage 2                          |
| **reviewer**          | Reviews code as a world-class senior engineer                     | Stage 3                          |
| **security-reviewer** | Deep security audit (OWASP Mobile, data protection, API security) | Stage 3 (parallel with reviewer) |
| **ux-reviewer**       | Accessibility, offline UX, performance on low-end devices         | Stage 3 (optional, UI stories)   |
| **qa**                | Verifies functionality, checks for bugs                           | Stage 4                          |
| **docs-updater**      | Updates all READMEs and CLAUDE.md to match code changes           | Stage 5                          |

### Hooks (auto-configured in .claude/settings.json)

- **PostToolUse**: Auto-formats files with Prettier on every edit
- **PreToolUse**: Blocks edits to `.env`, lock files, and `implementation-plan/` (source of truth)

### Quality Gates

- **Reviewer** only accepts code that meets production standards. Will iterate with builder/tester until satisfied. Also flags documentation impact.
- **Security Reviewer** blocks merge on critical/high security findings. Mandatory for auth, encryption, and PII-handling stories.
- **UX Reviewer** blocks merge on accessibility violations and missing offline fallbacks. Runs for UI-heavy stories.
- **QA** verifies actual functionality matches story acceptance criteria. Failures go back to builder.
- **Docs Updater** ensures all documentation (READMEs, CLAUDE.md) is updated before merge. No stale docs ship to main.
- **User** gives final approval before merge to main.
- **CI/CD** runs full test suite (unit, integration, security, load) on merge.

## Key Files

- `implementation-plan/README.md` — Full project specification (source of truth)
- `.claude/agents/pipeline.md` — Main pipeline orchestrator
- `.claude/settings.json` — Permissions, hooks (auto-format + file protection)
- `.mcp.json` — Team-shared MCP servers (context7 for docs, GitHub for PRs/issues)
- `scripts/update-issue-status.sh` — Pipeline helper to sync issue status on project board
- `.github/workflows/deploy-server.yml` — CD pipeline: test → deploy to Render → smoke test → rollback
- `.github/workflows/project-sync.yml` — Auto-syncs PRs/issues to GitHub Projects board
- `render.yaml` — Render Blueprint (service config, region, plan, health check)
- `apps/server/Dockerfile` — Multi-stage Docker build for server (handles pnpm workspace)
- `.dockerignore` — Docker build context exclusions
