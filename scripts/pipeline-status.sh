#!/usr/bin/env bash
# Pipeline Status Helper
# Shows the current state of the development pipeline for a given story

set -euo pipefail

STORY_ID="${1:-}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ -z "$STORY_ID" ]; then
  echo "Usage: ./scripts/pipeline-status.sh <story-id>"
  echo "Example: ./scripts/pipeline-status.sh S-01"
  exit 1
fi

echo "═══════════════════════════════════════════"
echo "  Pipeline Status: $STORY_ID"
echo "═══════════════════════════════════════════"
echo ""

# Check for feature branch
BRANCH=$(git branch --list "feature/${STORY_ID}-*" 2>/dev/null | head -1 | tr -d '* ')
if [ -n "$BRANCH" ]; then
  echo "Branch:    $BRANCH"
  COMMITS=$(git log main.."$BRANCH" --oneline 2>/dev/null | wc -l | tr -d ' ')
  echo "Commits:   $COMMITS ahead of main"

  # Show files changed
  FILES=$(git diff --name-only main..."$BRANCH" 2>/dev/null | wc -l | tr -d ' ')
  echo "Files:     $FILES changed"

  # Show test files
  TESTS=$(git diff --name-only main..."$BRANCH" 2>/dev/null | grep -c '\.test\.' || true)
  echo "Tests:     $TESTS test files"
  echo ""

  # Recent commits
  echo "Recent commits:"
  git log main.."$BRANCH" --oneline --max-count=10 2>/dev/null | while read -r line; do
    echo "  $line"
  done
else
  echo "Branch:    No feature branch found"
  echo "Status:    Not started"
fi

echo ""
echo "═══════════════════════════════════════════"

# Check if merged
if git log --oneline main | grep -q "$STORY_ID" 2>/dev/null; then
  echo "  ✓ MERGED TO MAIN"
  MERGE_COMMIT=$(git log --oneline main | grep "$STORY_ID" | head -1)
  echo "  Commit: $MERGE_COMMIT"
fi
