#!/bin/bash
# Detects skeleton file changes and warns about recipes that may need updating.
# Always exits 0 — this check is informational only.
# Bypass: git commit --no-verify

REPO_ROOT="$(git rev-parse --show-toplevel)"

# 1. Find staged skeleton files
STAGED=$(git diff --cached --name-only -- 'templates/skeleton/')
if [ -z "$STAGED" ]; then
  exit 0
fi

# 2. Find affected recipes (one name per line)
AFFECTED=$(cd "$REPO_ROOT/cookbook" && npm run --silent cookbook -- affected-recipes $STAGED 2>/dev/null)
if [ -z "$AFFECTED" ]; then
  exit 0
fi

# 3. Print actionable warning
echo ""
echo "⚠️  Skeleton changes detected. The following recipes may need updating:"
echo ""
while IFS= read -r recipe; do
  echo "  - $recipe"
  echo ""
done <<< "$AFFECTED"
echo "  After committing your skeleton changes, run the following to update affected recipes:"
while IFS= read -r recipe; do
  echo "    cd cookbook && npm run cookbook -- regenerate --recipe $recipe --format github"
done <<< "$AFFECTED"
echo ""
echo "  Note: the regenerate command requires a clean working tree — run it after committing."
echo "  To skip this skeleton changes warning: git commit --no-verify"
echo ""

exit 0
