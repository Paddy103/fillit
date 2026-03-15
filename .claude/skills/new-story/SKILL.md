---
name: new-story
description: Bootstrap a new story by creating the feature branch and scaffolding the initial file structure
disable-model-invocation: true
---

# New Story Skill

Bootstrap a new story for development. Creates the feature branch, validates dependencies, and scaffolds initial files.

## Usage
```
/new-story <story-id> <short-name>
```

Example: `/new-story S-15 sqlite-schema`

## Workflow

### 1. Create the Feature Branch
```bash
./scripts/new-feature-branch.sh ${STORY_ID} ${SHORT_NAME}
```

### 2. Look Up Story Details
Search the tracker seed data and implementation plan for the story:
```bash
# Check tracker for story details
grep -r "${STORY_ID}" tracker/ --include="*.html" --include="*.js" --include="*.json" -l
# Check implementation plan for context
grep -r "${STORY_ID}" implementation-plan/ --include="*.md" -A 5
```

Read the matched files to extract:
- Story title and description
- Acceptance criteria
- Dependencies (`[Depends: S-XX]`)
- Which epic/feature this belongs to

### 3. Validate Dependencies
For each dependency listed:
- Check if it has been merged to main: `git log --oneline main | grep "S-XX"`
- If not merged, warn the user and ask whether to proceed

### 4. Scaffold Initial Files
Based on the story type, create placeholder files in the appropriate locations:

| Story involves... | Scaffold in |
|-------------------|-------------|
| Mobile UI | `apps/mobile/src/screens/` or `apps/mobile/src/components/` |
| Mobile state | `apps/mobile/src/stores/` |
| Server endpoint | `apps/server/src/routes/` |
| Shared types | `packages/shared/src/types/` |
| Shared validation | `packages/shared/src/validation/` |
| Database | `apps/mobile/src/db/` |

Create files with:
- Proper TypeScript exports
- Basic structure matching existing patterns in the codebase
- A comment header: `// ${STORY_ID}: <story title>`

### 5. Initial Commit
```bash
git add -A
git commit -m "chore(${STORY_ID}): scaffold initial files for <short description>

Story: ${STORY_ID}
Branch: feature/${STORY_ID}-${SHORT_NAME}

Co-Authored-By: Claude Code Pipeline <noreply@anthropic.com>"
```

### 6. Report

Output a summary:

```
## Story Bootstrapped: <Story ID> — <Title>

**Branch**: feature/<story-id>-<short-name>
**Epic**: <parent epic>
**Feature**: <parent feature>

### Dependencies
| Story | Status |
|-------|--------|
| S-XX | Merged / NOT MERGED (warning) |

### Files Scaffolded
- [list of created files]

### Acceptance Criteria
1. [list from story]

### Ready for Pipeline
Run the pipeline to start building:
\`\`\`
/agents/pipeline
\`\`\`
```
