#!/bin/bash
# Detects skeleton file changes and warns about recipes that may need updating.
# Always exits 0 — this check is informational only.
# Bypass: git commit --no-verify

REPO_ROOT="$(git rev-parse --show-toplevel)"

# 1. Find staged skeleton files (read into array to safely handle spaces/special chars)
STAGED_ARGS=()
while IFS= read -r f; do
  [[ -n "$f" ]] && STAGED_ARGS+=("$f")
done < <(git diff --cached --name-only -- 'templates/skeleton/')

if [ ${#STAGED_ARGS[@]} -eq 0 ]; then
  exit 0
fi

# 2. Find affected recipes (one name per line)
#    Capture stderr separately so errors surface as warnings without mixing into output.
STDERR_FILE=$(mktemp)
AFFECTED=$(cd "$REPO_ROOT/cookbook" && npm run --silent cookbook -- affected-recipes "${STAGED_ARGS[@]}" 2>"$STDERR_FILE")
STATUS=$?
STDERR_CONTENT=$(cat "$STDERR_FILE")
rm -f "$STDERR_FILE"

if [ $STATUS -ne 0 ]; then
  echo "⚠️  Skeleton recipe check encountered an error — skipping." >&2
  [ -n "$STDERR_CONTENT" ] && echo "$STDERR_CONTENT" >&2
  exit 0
fi

if [ -z "$AFFECTED" ]; then
  exit 0
fi

# 3. Print actionable warning
echo ""
echo "⚠️  Skeleton changes detected. The following recipes may need updating:"
echo ""
while IFS= read -r recipe; do
  echo "  - $recipe"
done <<< "$AFFECTED"
echo ""
echo "  After committing your skeleton changes, run the following to update affected recipes:"
while IFS= read -r recipe; do
  echo "    cd cookbook && npm run cookbook -- regenerate --recipe $recipe --format github"
done <<< "$AFFECTED"
echo ""
echo "  Note: the regenerate command requires a clean working tree — run it after committing."
echo "  To skip this skeleton changes warning: git commit --no-verify"
echo ""

exit 0
