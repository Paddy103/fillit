#!/usr/bin/env bash
# Merge a feature branch into main with a proper commit message
# Usage: ./scripts/merge-feature.sh S-01 "feat(infra): set up pnpm monorepo"

set -euo pipefail

STORY_ID="${1:-}"
COMMIT_MSG="${2:-}"

if [ -z "$STORY_ID" ] || [ -z "$COMMIT_MSG" ]; then
  echo "Usage: ./scripts/merge-feature.sh <story-id> \"<commit-message>\""
  echo "Example: ./scripts/merge-feature.sh S-01 \"feat(infra): set up pnpm monorepo workspace\""
  exit 1
fi

# Find the feature branch
BRANCH=$(git branch --list "feature/${STORY_ID}-*" | head -1 | tr -d '* ')

if [ -z "$BRANCH" ]; then
  echo "Error: No feature branch found for $STORY_ID"
  exit 1
fi

echo "Merging $BRANCH into main..."
echo "Commit message: $COMMIT_MSG"
echo ""

# Ensure feature branch is up to date with main
git checkout "$BRANCH"
git rebase main || {
  echo "Error: Rebase failed. Please resolve conflicts manually."
  exit 1
}

# Switch to main and merge
git checkout main
git merge --no-ff "$BRANCH" -m "$COMMIT_MSG

Story: $STORY_ID
Branch: $BRANCH

Co-Authored-By: Claude Code Pipeline <noreply@anthropic.com>"

echo ""
echo "Merged $BRANCH into main"

# Clean up
read -r -p "Delete feature branch $BRANCH? (y/N) " confirm
if [[ "$confirm" =~ ^[Yy]$ ]]; then
  git branch -d "$BRANCH"
  echo "Deleted $BRANCH"
fi

echo ""
echo "Done. Run 'git push origin main' to trigger CI/CD pipeline."
