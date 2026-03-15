#!/usr/bin/env bash
# Create a new feature branch from main
# Usage: ./scripts/new-feature-branch.sh S-01 pnpm-monorepo

set -euo pipefail

STORY_ID="${1:-}"
SHORT_NAME="${2:-}"

if [ -z "$STORY_ID" ] || [ -z "$SHORT_NAME" ]; then
  echo "Usage: ./scripts/new-feature-branch.sh <story-id> <short-name>"
  echo "Example: ./scripts/new-feature-branch.sh S-01 pnpm-monorepo"
  exit 1
fi

BRANCH="feature/${STORY_ID}-${SHORT_NAME}"

echo "Creating feature branch: $BRANCH"

# Ensure we're on main and up to date
git checkout main 2>/dev/null || git checkout -b main
git pull origin main 2>/dev/null || true

# Check if branch already exists
if git branch --list "$BRANCH" | grep -q .; then
  echo "Branch $BRANCH already exists. Switching to it."
  git checkout "$BRANCH"
else
  git checkout -b "$BRANCH"
  echo "Created and switched to $BRANCH"
fi

echo ""
echo "Ready to build $STORY_ID on branch $BRANCH"
