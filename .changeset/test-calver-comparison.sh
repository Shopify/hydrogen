#!/bin/bash

# CalVer vs Standard Changeset Comparison Script
# This script demonstrates the differences between standard changeset versioning
# and the new CalVer enforcement script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Function to print colored output
print_header() {
    echo -e "\n${BLUE}${BOLD}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}${BOLD} $1${NC}"
    echo -e "${BLUE}${BOLD}═══════════════════════════════════════════════════════════════${NC}\n"
}

print_info() {
    echo -e "${GREEN}➜${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to capture package versions
capture_versions() {
    local label=$1
    echo -e "\n${BOLD}$label:${NC}"
    echo "  @shopify/hydrogen: $(grep '"version"' packages/hydrogen/package.json | cut -d'"' -f4)"
    echo "  @shopify/hydrogen-react: $(grep '"version"' packages/hydrogen-react/package.json | cut -d'"' -f4)"
    echo "  @shopify/cli-hydrogen: $(grep '"version"' packages/cli/package.json | cut -d'"' -f4)"
    echo "  @shopify/create-hydrogen: $(grep '"version"' packages/create-hydrogen/package.json | cut -d'"' -f4)"
}

# Function to cleanup
cleanup() {
    print_info "Cleaning up test artifacts..."
    
    # Only remove test changesets that we created
    rm -f .changeset/calver-test-*.md 2>/dev/null || true
    
    # Remove any sed temporary files
    rm -f .changeset/config.json.tmp 2>/dev/null || true
    rm -f package.json.tmp 2>/dev/null || true
    
    # Restore original package.json if backup exists
    if [ -f package.json.backup ]; then
        mv package.json.backup package.json
    fi
    
    # Restore original changeset config
    if [ -f .changeset/config.json.backup ]; then
        mv .changeset/config.json.backup .changeset/config.json
    fi
    
    # Reset ALL modified files to their original state
    print_info "Reverting all package.json changes..."
    git checkout -- packages/*/package.json 2>/dev/null || true
    git checkout -- templates/*/package.json 2>/dev/null || true  
    git checkout -- examples/*/package.json 2>/dev/null || true
    
    # Remove any generated CHANGELOG entries
    git checkout -- packages/*/CHANGELOG.md 2>/dev/null || true
    git checkout -- templates/*/CHANGELOG.md 2>/dev/null || true
    git checkout -- examples/*/CHANGELOG.md 2>/dev/null || true
    
    # Restore any consumed changesets
    if [ -f .changesets-backup.tar ]; then
        tar -xf .changesets-backup.tar 2>/dev/null || true
        rm -f .changesets-backup.tar
    fi
    
    # Clean up temp files
    rm -f /tmp/packages_*.tmp 2>/dev/null || true
    
    # Final verification - make sure we're back to clean state
    if [ -f .changeset/config.json ]; then
        git checkout -- .changeset/config.json 2>/dev/null || true
    fi
    
    print_info "Cleanup complete!"
}

# Set trap to cleanup on exit
trap cleanup EXIT INT TERM

# Main script
print_header "CalVer vs Standard Changeset Comparison Test"

# Step 1: Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "packages" ]; then
    print_error "This script must be run from the Hydrogen repository root"
    exit 1
fi

print_info "Starting comparison test..."

# Step 2: Backup changeset config
print_info "Backing up changeset configuration..."
cp .changeset/config.json .changeset/config.json.backup

# Step 3: Capture initial versions and analyze changesets
print_header "Initial State & Changeset Analysis"

# Store initial versions for later comparison
INITIAL_HYDROGEN=$(grep '"version"' packages/hydrogen/package.json | cut -d'"' -f4)
INITIAL_HYDROGEN_REACT=$(grep '"version"' packages/hydrogen-react/package.json | cut -d'"' -f4)
INITIAL_CLI=$(grep '"version"' packages/cli/package.json | cut -d'"' -f4)
INITIAL_CREATE=$(grep '"version"' packages/create-hydrogen/package.json | cut -d'"' -f4)
INITIAL_MINIOXY=$(grep '"version"' packages/mini-oxygen/package.json 2>/dev/null | cut -d'"' -f4 || echo "N/A")
INITIAL_SKELETON=$(grep '"version"' templates/skeleton/package.json 2>/dev/null | cut -d'"' -f4 || echo "N/A")

echo -e "${BOLD}Current Package Versions:${NC}"
echo "┌─────────────────────────────────┬──────────────┐"
printf "│ %-31s │ %-12s │\n" "Package" "Version"
echo "├─────────────────────────────────┼──────────────┤"
printf "│ %-31s │ %-12s │\n" "@shopify/hydrogen" "$INITIAL_HYDROGEN"
printf "│ %-31s │ %-12s │\n" "@shopify/hydrogen-react" "$INITIAL_HYDROGEN_REACT"
printf "│ %-31s │ %-12s │\n" "@shopify/cli-hydrogen" "$INITIAL_CLI"
printf "│ %-31s │ %-12s │\n" "@shopify/create-hydrogen" "$INITIAL_CREATE"
if [ "$INITIAL_MINIOXY" != "N/A" ]; then
    printf "│ %-31s │ %-12s │\n" "@shopify/mini-oxygen" "$INITIAL_MINIOXY"
fi
if [ "$INITIAL_SKELETON" != "N/A" ]; then
    printf "│ %-31s │ %-12s │\n" "skeleton" "$INITIAL_SKELETON"
fi
echo "└─────────────────────────────────┴──────────────┘"

# Check if there are existing changesets
EXISTING_CHANGESETS=$(ls .changeset/*.md 2>/dev/null | grep -v README.md | grep -v config.json || true)

# Initialize counters for changeset analysis
MAJOR_COUNT=0
MINOR_COUNT=0
PATCH_COUNT=0
PACKAGES_WITH_CHANGES=""

if [ -n "$EXISTING_CHANGESETS" ]; then
    print_info "Analyzing existing changesets..."
    
    # Create temporary files to track unique packages
    echo -n "" > /tmp/packages_major.tmp
    echo -n "" > /tmp/packages_minor.tmp  
    echo -n "" > /tmp/packages_patch.tmp
    
    # Parse changesets to count bump types
    for changeset in $EXISTING_CHANGESETS; do
        if [ -f "$changeset" ]; then
            while IFS= read -r line; do
                # Match both single quotes and double quotes
                if [[ $line =~ ^[\'\"]([^\'\"]+)[\'\"]:[[:space:]]*(patch|minor|major)$ ]]; then
                    pkg="${BASH_REMATCH[1]}"
                    bump="${BASH_REMATCH[2]}"
                    
                    # Track highest bump per package
                    case "$bump" in
                        major) echo "$pkg" >> /tmp/packages_major.tmp ;;
                        minor) echo "$pkg" >> /tmp/packages_minor.tmp ;;
                        patch) echo "$pkg" >> /tmp/packages_patch.tmp ;;
                    esac
                fi
            done < "$changeset"
        fi
    done
    
    # Count unique packages per bump type (removing duplicates and packages with higher bumps)
    MAJOR_PACKAGES=$(sort -u /tmp/packages_major.tmp 2>/dev/null | grep -v '^$' || true)
    MINOR_PACKAGES=$(sort -u /tmp/packages_minor.tmp 2>/dev/null | grep -v '^$' || true)
    PATCH_PACKAGES=$(sort -u /tmp/packages_patch.tmp 2>/dev/null | grep -v '^$' || true)
    
    # Remove packages with major bumps from minor and patch
    if [ -n "$MAJOR_PACKAGES" ]; then
        for pkg in $MAJOR_PACKAGES; do
            MINOR_PACKAGES=$(echo "$MINOR_PACKAGES" | grep -v "^$pkg$" || true)
            PATCH_PACKAGES=$(echo "$PATCH_PACKAGES" | grep -v "^$pkg$" || true)
        done
    fi
    
    # Remove packages with minor bumps from patch
    if [ -n "$MINOR_PACKAGES" ]; then
        for pkg in $MINOR_PACKAGES; do
            PATCH_PACKAGES=$(echo "$PATCH_PACKAGES" | grep -v "^$pkg$" || true)
        done
    fi
    
    MAJOR_COUNT=$(echo "$MAJOR_PACKAGES" | grep -v '^$' | wc -l || echo 0)
    MINOR_COUNT=$(echo "$MINOR_PACKAGES" | grep -v '^$' | wc -l || echo 0)
    PATCH_COUNT=$(echo "$PATCH_PACKAGES" | grep -v '^$' | wc -l || echo 0)
    
    # Build package summary
    PACKAGES_WITH_CHANGES=""
    for pkg in $MAJOR_PACKAGES; do
        [ -n "$pkg" ] && PACKAGES_WITH_CHANGES="${PACKAGES_WITH_CHANGES}│ ${pkg} → major bump\n"
    done
    for pkg in $MINOR_PACKAGES; do
        [ -n "$pkg" ] && PACKAGES_WITH_CHANGES="${PACKAGES_WITH_CHANGES}│ ${pkg} → minor bump\n"
    done
    for pkg in $PATCH_PACKAGES; do
        [ -n "$pkg" ] && PACKAGES_WITH_CHANGES="${PACKAGES_WITH_CHANGES}│ ${pkg} → patch bump\n"
    done
    
    # Clean up temp files
    rm -f /tmp/packages_*.tmp
    
    # Backup existing changesets
    tar -cf .changesets-backup.tar .changeset/*.md 2>/dev/null || true
    USING_REAL_CHANGESETS=true
    
    echo -e "\n${BOLD}Changesets Summary:${NC}"
    printf "Found %d changesets affecting %d packages: %d major, %d minor, %d patch\n" \
        $(echo "$EXISTING_CHANGESETS" | wc -w) \
        $(echo "$MAJOR_PACKAGES $MINOR_PACKAGES $PATCH_PACKAGES" | tr ' ' '\n' | grep -v '^$' | wc -l) \
        $MAJOR_COUNT $MINOR_COUNT $PATCH_COUNT
    
    # Store package bump types for later use in the table
    for pkg in $MAJOR_PACKAGES; do
        [ -n "$pkg" ] && eval "BUMP_TYPE_$(echo $pkg | tr '@/:.-' '_')=major"
    done
    for pkg in $MINOR_PACKAGES; do
        [ -n "$pkg" ] && eval "BUMP_TYPE_$(echo $pkg | tr '@/:.-' '_')=minor"
    done
    for pkg in $PATCH_PACKAGES; do
        [ -n "$pkg" ] && eval "BUMP_TYPE_$(echo $pkg | tr '@/:.-' '_')=patch"
    done
else
    print_info "No existing changesets found. Creating test changesets..."
    
    cat > .changeset/calver-test-major.md << 'EOF'
---
'@shopify/hydrogen': major
'@shopify/hydrogen-react': major
---

Test major version bump for CalVer comparison
EOF

    cat > .changeset/calver-test-minor.md << 'EOF'
---
'@shopify/cli-hydrogen': minor
---

Test minor version bump for CalVer comparison
EOF

    cat > .changeset/calver-test-patch.md << 'EOF'
---
'@shopify/create-hydrogen': patch
---

Test patch version bump for CalVer comparison
EOF

    USING_REAL_CHANGESETS=false
    
    echo -e "\n${BOLD}Test Changesets Created:${NC}"
    echo "Created 4 test changesets: 2 major, 1 minor, 1 patch"
    
    # Set bump types for test packages
    BUMP_TYPE__shopify_hydrogen=major
    BUMP_TYPE__shopify_hydrogen_react=major
    BUMP_TYPE__shopify_cli_hydrogen=minor
    BUMP_TYPE__shopify_create_hydrogen=patch
fi

# Step 4: Process both versioning methods
print_header "Processing Version Changes"

print_info "Running standard changeset version (without CalVer enforcement)..."

# Temporarily backup and modify package.json to disable CalVer
cp package.json package.json.backup

# Replace the version script to use raw changeset instead of CalVer script
if command -v perl >/dev/null 2>&1; then
    perl -i -pe 's/"version": "npm run version:changeset && node \.changeset\/enforce-calver-ci\.js && npm run version:post && npm run format"/"version": "changeset version"/' package.json
else
    # Use portable sed syntax that works on both macOS and Linux
    if sed --version 2>/dev/null | grep -q GNU; then
        # GNU sed (Linux)
        sed -i 's/"version": "npm run version:changeset && node \.changeset\/enforce-calver-ci\.js && npm run version:post && npm run format"/"version": "changeset version"/' package.json
    else
        # BSD sed (macOS)
        sed -i.tmp 's/"version": "npm run version:changeset && node \.changeset\/enforce-calver-ci\.js && npm run version:post && npm run format"/"version": "changeset version"/' package.json
        rm -f package.json.tmp 2>/dev/null || true
    fi
fi

# Disable changelog to avoid GitHub token requirement
if command -v perl >/dev/null 2>&1; then
    perl -i -pe 's/"changelog": \[.*\]/"changelog": false/' .changeset/config.json
else
    # Use portable sed syntax that works on both macOS and Linux
    if sed --version 2>/dev/null | grep -q GNU; then
        # GNU sed (Linux)
        sed -i 's/"changelog": \[.*\]/"changelog": false/' .changeset/config.json
    else
        # BSD sed (macOS)  
        sed -i.tmp 's/"changelog": \[.*\]/"changelog": false/' .changeset/config.json
        rm -f .changeset/config.json.tmp 2>/dev/null || true
    fi
fi

# Run standard changeset (now using raw changeset without CalVer)
npm run version > /dev/null 2>&1 || true

# Restore original package.json
mv package.json.backup package.json

# Capture standard versions
STANDARD_HYDROGEN=$(grep '"version"' packages/hydrogen/package.json | cut -d'"' -f4)
STANDARD_HYDROGEN_REACT=$(grep '"version"' packages/hydrogen-react/package.json | cut -d'"' -f4)
STANDARD_CLI=$(grep '"version"' packages/cli/package.json | cut -d'"' -f4)
STANDARD_CREATE=$(grep '"version"' packages/create-hydrogen/package.json | cut -d'"' -f4)
STANDARD_MINIOXY=$(grep '"version"' packages/mini-oxygen/package.json 2>/dev/null | cut -d'"' -f4 || echo "N/A")
STANDARD_SKELETON=$(grep '"version"' templates/skeleton/package.json 2>/dev/null | cut -d'"' -f4 || echo "N/A")

print_info "Resetting and running CalVer version (with enforcement)..."

# Reset package versions
git checkout -- packages/*/package.json templates/*/package.json examples/*/package.json 2>/dev/null || true

# Restore changesets (they get consumed)
if [ "$USING_REAL_CHANGESETS" = true ]; then
    tar -xf .changesets-backup.tar 2>/dev/null || true
else
    # Recreate test changesets
    cat > .changeset/calver-test-major.md << 'EOF'
---
'@shopify/hydrogen': major
'@shopify/hydrogen-react': major
---

Test major version bump for CalVer comparison
EOF

    cat > .changeset/calver-test-minor.md << 'EOF'
---
'@shopify/cli-hydrogen': minor
---

Test minor version bump for CalVer comparison
EOF

    cat > .changeset/calver-test-patch.md << 'EOF'
---
'@shopify/create-hydrogen': patch
---

Test patch version bump for CalVer comparison
EOF
fi

# Run CalVer script (using local version with apply flag)
node .changeset/enforce-calver-local.js --apply > /dev/null 2>&1

# Capture CalVer versions
CALVER_HYDROGEN=$(grep '"version"' packages/hydrogen/package.json | cut -d'"' -f4)
CALVER_HYDROGEN_REACT=$(grep '"version"' packages/hydrogen-react/package.json | cut -d'"' -f4)
CALVER_CLI=$(grep '"version"' packages/cli/package.json | cut -d'"' -f4)
CALVER_CREATE=$(grep '"version"' packages/create-hydrogen/package.json | cut -d'"' -f4)
CALVER_MINIOXY=$(grep '"version"' packages/mini-oxygen/package.json 2>/dev/null | cut -d'"' -f4 || echo "N/A")
CALVER_SKELETON=$(grep '"version"' templates/skeleton/package.json 2>/dev/null | cut -d'"' -f4 || echo "N/A")

echo -e "${GREEN}✓${NC} Both versioning methods complete"

# Step 8: Generate comparison report
print_header "Versioning Comparison Results"

echo -e "${BOLD}Version Changes by Method:${NC}\n"

echo "┌─────────────────────────────┬──────────┬──────────┬──────────┬──────────┬─────────────────┐"
echo "│ Package                     │ Initial  │ Changeset│ Standard │ CalVer   │ Key Difference  │"
echo "├─────────────────────────────┼──────────┼──────────┼──────────┼──────────┼─────────────────┤"

# Compare hydrogen
HYDROGEN_BUMP="${BUMP_TYPE__shopify_hydrogen:-none}"
if [ "$STANDARD_HYDROGEN" != "$CALVER_HYDROGEN" ]; then
    printf "│ %-27s │ %-8s │ %-8s │ ${RED}%-8s${NC} │ ${GREEN}%-8s${NC} │ %-15s │\n" \
        "@shopify/hydrogen" "$INITIAL_HYDROGEN" "$HYDROGEN_BUMP" "$STANDARD_HYDROGEN" "$CALVER_HYDROGEN" "Quarter aligned"
else
    printf "│ %-27s │ %-8s │ %-8s │ %-8s │ %-8s │ %-15s │\n" \
        "@shopify/hydrogen" "$INITIAL_HYDROGEN" "$HYDROGEN_BUMP" "$STANDARD_HYDROGEN" "$CALVER_HYDROGEN" "Same"
fi

# Compare hydrogen-react
HYDROGEN_REACT_BUMP="${BUMP_TYPE__shopify_hydrogen_react:-none}"
if [ "$STANDARD_HYDROGEN_REACT" != "$CALVER_HYDROGEN_REACT" ]; then
    printf "│ %-27s │ %-8s │ %-8s │ ${RED}%-8s${NC} │ ${GREEN}%-8s${NC} │ %-15s │\n" \
        "@shopify/hydrogen-react" "$INITIAL_HYDROGEN_REACT" "$HYDROGEN_REACT_BUMP" "$STANDARD_HYDROGEN_REACT" "$CALVER_HYDROGEN_REACT" "Quarter aligned"
else
    printf "│ %-27s │ %-8s │ %-8s │ %-8s │ %-8s │ %-15s │\n" \
        "@shopify/hydrogen-react" "$INITIAL_HYDROGEN_REACT" "$HYDROGEN_REACT_BUMP" "$STANDARD_HYDROGEN_REACT" "$CALVER_HYDROGEN_REACT" "Same"
fi

# Compare CLI
CLI_BUMP="${BUMP_TYPE__shopify_cli_hydrogen:-none}"
if [ "$STANDARD_CLI" != "$CALVER_CLI" ]; then
    printf "│ %-27s │ %-8s │ %-8s │ ${RED}%-8s${NC} │ ${GREEN}%-8s${NC} │ %-15s │\n" \
        "@shopify/cli-hydrogen" "$INITIAL_CLI" "$CLI_BUMP" "$STANDARD_CLI" "$CALVER_CLI" "Preserved minor"
else
    printf "│ %-27s │ %-8s │ %-8s │ %-8s │ %-8s │ %-15s │\n" \
        "@shopify/cli-hydrogen" "$INITIAL_CLI" "$CLI_BUMP" "$STANDARD_CLI" "$CALVER_CLI" "Same"
fi

# Compare create-hydrogen
CREATE_BUMP="${BUMP_TYPE__shopify_create_hydrogen:-none}"
if [ "$STANDARD_CREATE" != "$CALVER_CREATE" ]; then
    printf "│ %-27s │ %-8s │ %-8s │ ${RED}%-8s${NC} │ ${GREEN}%-8s${NC} │ %-15s │\n" \
        "@shopify/create-hydrogen" "$INITIAL_CREATE" "$CREATE_BUMP" "$STANDARD_CREATE" "$CALVER_CREATE" "Same"
else
    printf "│ %-27s │ %-8s │ %-8s │ %-8s │ %-8s │ %-15s │\n" \
        "@shopify/create-hydrogen" "$INITIAL_CREATE" "$CREATE_BUMP" "$STANDARD_CREATE" "$CALVER_CREATE" "Same"
fi

# Compare mini-oxygen if it exists and has changes
MINIOXY_BUMP="${BUMP_TYPE__shopify_mini_oxygen:-none}"
if [ "$INITIAL_MINIOXY" != "N/A" ] && [ "$MINIOXY_BUMP" != "none" ]; then
    if [ "$STANDARD_MINIOXY" != "$CALVER_MINIOXY" ]; then
        printf "│ %-27s │ %-8s │ %-8s │ ${RED}%-8s${NC} │ ${GREEN}%-8s${NC} │ %-15s │\n" \
            "@shopify/mini-oxygen" "$INITIAL_MINIOXY" "$MINIOXY_BUMP" "$STANDARD_MINIOXY" "$CALVER_MINIOXY" "Preserved minor"
    else
        printf "│ %-27s │ %-8s │ %-8s │ %-8s │ %-8s │ %-15s │\n" \
            "@shopify/mini-oxygen" "$INITIAL_MINIOXY" "$MINIOXY_BUMP" "$STANDARD_MINIOXY" "$CALVER_MINIOXY" "Same"
    fi
fi

# Compare skeleton if it exists and has changes
SKELETON_BUMP="${BUMP_TYPE_skeleton:-none}"
if [ "$INITIAL_SKELETON" != "N/A" ] && [ "$SKELETON_BUMP" != "none" ]; then
    if [ "$STANDARD_SKELETON" != "$CALVER_SKELETON" ]; then
        printf "│ %-27s │ %-8s │ %-8s │ ${RED}%-8s${NC} │ ${GREEN}%-8s${NC} │ %-15s │\n" \
            "skeleton" "$INITIAL_SKELETON" "$SKELETON_BUMP" "$STANDARD_SKELETON" "$CALVER_SKELETON" "Quarter aligned"
    else
        printf "│ %-27s │ %-8s │ %-8s │ %-8s │ %-8s │ %-15s │\n" \
            "skeleton" "$INITIAL_SKELETON" "$SKELETON_BUMP" "$STANDARD_SKELETON" "$CALVER_SKELETON" "Same"
    fi
fi

echo "└─────────────────────────────┴──────────┴──────────┴──────────┴──────────┴─────────────────┘"

print_header "Test Complete!"

# Explicitly call cleanup (trap will also ensure it runs on exit)
cleanup