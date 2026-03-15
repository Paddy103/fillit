#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/update-issue-status.sh <story-id> <action>
# Actions: start, building, testing, reviewing, qa, docs, ready, done
#
# Examples:
#   ./scripts/update-issue-status.sh S-02 start       # Move to Todo
#   ./scripts/update-issue-status.sh S-02 building     # Add pipeline:building label, move to In Progress
#   ./scripts/update-issue-status.sh S-02 testing      # Swap to pipeline:testing label
#   ./scripts/update-issue-status.sh S-02 reviewing    # Swap to pipeline:reviewing label
#   ./scripts/update-issue-status.sh S-02 qa           # Swap to pipeline:qa label
#   ./scripts/update-issue-status.sh S-02 docs         # Swap to pipeline:docs label
#   ./scripts/update-issue-status.sh S-02 ready        # Swap to pipeline:ready-to-merge, move to In Review
#   ./scripts/update-issue-status.sh S-02 done         # Close issue, remove pipeline labels

STORY_ID="${1:?Usage: update-issue-status.sh <story-id> <action>}"
ACTION="${2:?Usage: update-issue-status.sh <story-id> <action>}"

# Validate inputs
if ! [[ "$STORY_ID" =~ ^S-[0-9]+$ ]]; then
  echo "ERROR: Invalid story ID format: $STORY_ID (expected S-XX)"
  exit 1
fi

# Find issue number by title prefix
ISSUE_NUM=$(gh issue list --search "${STORY_ID}:" --state all --json number,title -q ".[] | select(.title | startswith(\"${STORY_ID}:\")) | .number" | head -1)

if ! [[ "$ISSUE_NUM" =~ ^[0-9]+$ ]]; then
  echo "ERROR: No issue found for ${STORY_ID}"
  exit 1
fi

echo "Found issue #${ISSUE_NUM} for ${STORY_ID}"

# Cache repo owner/name to avoid repeated API calls
REPO_OWNER=$(gh repo view --json owner -q '.owner.login')
REPO_NAME=$(gh repo view --json name -q '.name')

# Pipeline labels to manage
PIPELINE_LABELS=("pipeline:building" "pipeline:testing" "pipeline:reviewing" "pipeline:qa" "pipeline:docs" "pipeline:ready-to-merge")

remove_pipeline_labels() {
  for label in "${PIPELINE_LABELS[@]}"; do
    gh issue edit "$ISSUE_NUM" --remove-label "$label" 2>/dev/null || true
  done
}

set_pipeline_label() {
  remove_pipeline_labels
  gh issue edit "$ISSUE_NUM" --add-label "$1"
}

# Project board status updates via GraphQL helper
move_to_status() {
  local status_name="$1"
  local item_info
  item_info=$(gh api graphql -f query="
    query {
      repository(owner: \"${REPO_OWNER}\", name: \"${REPO_NAME}\") {
        issue(number: ${ISSUE_NUM}) {
          projectItems(first: 10) {
            nodes {
              id
              project { id number }
            }
          }
        }
      }
    }" -q '.data.repository.issue.projectItems.nodes[] | select(.project.number == 2) | .id + "|" + .project.id' 2>/dev/null)

  if [ -z "$item_info" ]; then
    echo "WARN: Issue not on project board"
    return
  fi

  local item_id="${item_info%%|*}"
  local project_id="${item_info##*|}"

  # Get Status field and option IDs
  local field_info
  field_info=$(gh api graphql -f query="
    query {
      node(id: \"${item_id}\") {
        ... on ProjectV2Item {
          project {
            field(name: \"Status\") {
              ... on ProjectV2SingleSelectField {
                id
                options { id name }
              }
            }
          }
        }
      }
    }" 2>/dev/null)

  local field_id
  field_id=$(echo "$field_info" | jq -r '.data.node.project.field.id')
  local option_id
  option_id=$(echo "$field_info" | jq -r ".data.node.project.field.options[] | select(.name == \"${status_name}\") | .id")

  if [ -z "$option_id" ] || [ "$option_id" = "null" ]; then
    echo "WARN: Status '${status_name}' not found on project board"
    return
  fi

  gh api graphql -f query="
    mutation {
      updateProjectV2ItemFieldValue(input: {
        projectId: \"${project_id}\"
        itemId: \"${item_id}\"
        fieldId: \"${field_id}\"
        value: { singleSelectOptionId: \"${option_id}\" }
      }) {
        projectV2Item { id }
      }
    }" > /dev/null 2>&1

  echo "Moved #${ISSUE_NUM} to '${status_name}' on project board"
}

case "$ACTION" in
  start)
    gh issue edit "$ISSUE_NUM" --remove-label "pipeline:ready-to-merge" 2>/dev/null || true
    move_to_status "Todo"
    echo "✓ ${STORY_ID} moved to Todo"
    ;;
  building)
    set_pipeline_label "pipeline:building"
    move_to_status "In Progress"
    echo "✓ ${STORY_ID} → Building (In Progress)"
    ;;
  testing)
    set_pipeline_label "pipeline:testing"
    echo "✓ ${STORY_ID} → Testing"
    ;;
  reviewing)
    set_pipeline_label "pipeline:reviewing"
    echo "✓ ${STORY_ID} → Reviewing"
    ;;
  qa)
    set_pipeline_label "pipeline:qa"
    echo "✓ ${STORY_ID} → QA"
    ;;
  docs)
    set_pipeline_label "pipeline:docs"
    echo "✓ ${STORY_ID} → Docs Update"
    ;;
  ready)
    set_pipeline_label "pipeline:ready-to-merge"
    move_to_status "In Review"
    echo "✓ ${STORY_ID} → Ready to Merge (In Review)"
    ;;
  done)
    remove_pipeline_labels
    gh issue close "$ISSUE_NUM" --comment "✅ Completed via pipeline."
    move_to_status "Done"
    echo "✓ ${STORY_ID} → Done"
    ;;
  *)
    echo "Unknown action: $ACTION"
    echo "Valid actions: start, building, testing, reviewing, qa, docs, ready, done"
    exit 1
    ;;
esac
