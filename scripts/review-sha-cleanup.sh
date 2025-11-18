#!/bin/bash

# Script to replace new SHAs with old SHAs in cookbook prompt.md files for easier review
# This script does NOT stage any changes - it's purely for local review purposes

set -e

echo "SHA Cleanup Script for Recipe Review"
echo "====================================="
echo "This script will replace new SHAs with old ones in cookbook prompt.md files"
echo "to make reviewing actual changes easier."
echo ""

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "Error: Not in a git repository"
    exit 1
fi

# Find all modified prompt.md files in cookbook folder
modified_files=$(git diff --name-only | grep -E "cookbook/.*\.prompt\.md$" || true)

if [ -z "$modified_files" ]; then
    echo "No modified prompt.md files found in cookbook folder"
    exit 0
fi

echo "Found modified prompt.md files:"
echo "$modified_files"
echo ""

# Process each modified file
for file in $modified_files; do
    echo "Processing: $file"
    
    # Extract unique SHAs from the diff
    # Look for GitHub URLs with /blob/SHA/ pattern
    old_shas=$(git diff "$file" | grep -E "^-.*github\.com/[^/]+/[^/]+/blob/[a-f0-9]{40}/" | \
               sed -E 's/.*\/blob\/([a-f0-9]{40})\/.*/\1/' | sort -u || true)
    
    new_shas=$(git diff "$file" | grep -E "^\+.*github\.com/[^/]+/[^/]+/blob/[a-f0-9]{40}/" | \
               sed -E 's/.*\/blob\/([a-f0-9]{40})\/.*/\1/' | sort -u || true)
    
    # Count the number of unique SHAs
    old_count=$(echo "$old_shas" | grep -c . || echo 0)
    new_count=$(echo "$new_shas" | grep -c . || echo 0)
    
    if [ "$old_count" -eq 0 ] || [ "$new_count" -eq 0 ]; then
        echo "  No SHA changes detected in this file"
        continue
    fi
    
    if [ "$old_count" -ne 1 ] || [ "$new_count" -ne 1 ]; then
        echo "  Warning: Multiple different SHAs detected"
        echo "  Old SHAs ($old_count): $old_shas"
        echo "  New SHAs ($new_count): $new_shas"
        echo "  Skipping this file to avoid confusion"
        continue
    fi
    
    # Get the single SHA from each
    old_sha=$(echo "$old_shas" | head -1)
    new_sha=$(echo "$new_shas" | head -1)
    
    if [ "$old_sha" = "$new_sha" ]; then
        echo "  No SHA change detected (same SHA)"
        continue
    fi
    
    echo "  Old SHA: $old_sha"
    echo "  New SHA: $new_sha"
    
    # Count occurrences
    occurrences=$(grep -c "$new_sha" "$file" || echo 0)
    echo "  Found $occurrences occurrences of new SHA"
    
    # Replace new SHA with old SHA in the file
    if [ "$(uname)" = "Darwin" ]; then
        # macOS version
        sed -i '' "s/$new_sha/$old_sha/g" "$file"
    else
        # Linux version
        sed -i "s/$new_sha/$old_sha/g" "$file"
    fi
    
    echo "  ✓ Replaced $new_sha with $old_sha"
    echo ""
done

echo "SHA cleanup complete!"
echo ""
echo "IMPORTANT: These changes are for review purposes only."
echo "Do NOT commit these changes - they're just to help you see the real diffs."
echo ""
echo "To see the cleaned-up diff, run:"
echo "  git diff cookbook/"
echo ""
echo "To restore the original SHAs (undo this script), run:"
echo "  git checkout -- cookbook/"