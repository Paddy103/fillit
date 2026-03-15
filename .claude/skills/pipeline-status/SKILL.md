---
name: pipeline-status
description: Check which pipeline stages have completed for a given story by analyzing the feature branch commits and state
disable-model-invocation: true
---

# Pipeline Status Skill

Check the current pipeline status for a story. Shows which stages (build, test, review, QA, docs) have completed based on branch state and commit history.

## Usage
```
/pipeline-status <story-id>
```

Example: `/pipeline-status S-01`

## How to Determine Status

### 1. Find the Feature Branch
```bash
git branch --list "feature/${STORY_ID}-*"
```

If no branch exists, the story has not started.

### 2. Analyze Commits for Stage Completion

Check the commit messages on the feature branch (relative to main) to determine which stages have run:

| Stage | Indicator | Commit Pattern |
|-------|-----------|----------------|
| **Build** | Implementation commits exist | `feat(*)`, `fix(*)`, `refactor(*)` |
| **Test** | Test files added/modified | `test(*)` commits, `*.test.ts` files in diff |
| **Review** | Review iteration commits | `fix:` commits after test commits (review feedback) |
| **QA** | QA passed | All tests pass when run |
| **Docs** | Documentation updated | `docs:` commits, `.md` files in diff |

### 3. Run the Status Script
```bash
./scripts/pipeline-status.sh ${STORY_ID}
```

### 4. Check Test Health
```bash
# Run tests to verify current state
pnpm test 2>/dev/null || npx jest --passWithNoTests 2>/dev/null || echo "No test runner configured yet"
```

### 5. Report

Output a status report in this format:

```
## Pipeline Status: <Story ID>

**Branch**: feature/<story-id>-<name>
**Commits**: X ahead of main

### Stage Progress
| Stage | Status | Evidence |
|-------|--------|----------|
| Build | Done/Pending | X implementation commits |
| Test | Done/Pending | X test files added |
| Review | Done/Pending | Review feedback commits found |
| QA | Done/Pending | All tests passing |
| Docs | Done/Pending | Documentation commits found |
| Merge | Done/Pending | Merged to main / Not yet |

### Recent Activity
- [Last 5 commits on the branch]

### Next Step
[What stage should run next]
```
