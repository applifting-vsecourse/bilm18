#!/usr/bin/env bash
# Fails when a change removes or rewrites lines in an existing test file.
# Only added lines are fine: new test files, new tests, new checks in a test.
# A test is the spec — changing it means changing the spec, and the PR has to
# say why.
#
# Usage: scripts/check-test-changes.sh <base-ref> [head-ref]
#   CI:    scripts/check-test-changes.sh origin/main
#   local: scripts/check-test-changes.sh main
set -euo pipefail

base="${1:?usage: check-test-changes.sh <base-ref> [head-ref]}"
head="${2:-HEAD}"

# Test files: backend unit + integration, frontend unit, Playwright end-to-end.
export TEST_FILES='(\.spec\.ts|\.int-spec\.ts|\.test\.tsx?)$|^apps/frontend/e2e/'

# --numstat prints "added<TAB>removed<TAB>path". A rewritten line counts as
# removed + added. --no-renames: renaming a test file counts as removing it.
changed=$(
  git diff --numstat --no-renames "$base...$head" |
    awk -F'\t' '$3 ~ ENVIRON["TEST_FILES"] && $2 != "-" && $2 > 0 {
      print $3 "\t" $2
    }'
)

if [ -z "$changed" ]; then
  echo "No existing test was changed ($base...$head): only added lines in test files."
  exit 0
fi

echo "These test files have removed or rewritten lines ($base...$head):"
while IFS=$'\t' read -r file removed; do
  echo "  $file  ($removed lines removed or rewritten)"
  if [ -n "${GITHUB_ACTIONS:-}" ]; then
    echo "::error file=$file::Existing test changed ($removed lines removed or rewritten). Say why in the PR."
  fi
done <<<"$changed"
echo
echo "Tests are the spec. If a test really had to change, explain why in the PR."
exit 1
