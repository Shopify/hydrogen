#!/bin/bash

# Script to rename new patch files to match old patch filenames for easier diff review
# This is for review purposes only - changes should not be committed

echo "Renaming patch files for review..."
echo "================================"

# Get all deleted patch files and their corresponding new files
git status --porcelain | while IFS= read -r line; do
    status="${line:0:2}"
    file="${line:3}"

    # Only process deleted patch files in cookbook/*/patches/ folders
    if [[ "$status" == " D" && "$file" =~ cookbook/.*/patches/.*\.patch$ ]]; then
        # Extract the base filename without the hash
        base_name=$(echo "$file" | sed -E 's/\.[a-f0-9]{6}\.patch$//')
        old_hash=$(echo "$file" | sed -E 's/.*\.([a-f0-9]{6})\.patch$/\1/')

        # Find the corresponding new file (untracked file with same base name)
        new_file=$(git status --porcelain | grep "^??" | grep "${base_name}\." | sed 's/^?? //')

        if [[ -n "$new_file" && -f "$new_file" ]]; then
            # Construct the old filename to rename to
            old_filename="$file"

            echo "Renaming:"
            echo "  From: $new_file"
            echo "  To:   $old_filename"

            # Perform the rename
            mv "$new_file" "$old_filename"

            echo "  ✓ Renamed"
            echo ""
        fi
    fi
done

echo "================================"
echo "Patch files renamed for review!"
echo ""
echo "You can now see proper diffs with:"
echo "  git diff"
echo ""
echo "Remember: These renames are for review only - do not commit!"
