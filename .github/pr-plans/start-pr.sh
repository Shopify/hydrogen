#!/bin/bash

# React Router 7.8.x Migration - PR Starter Script
# Usage: ./start-pr.sh [PR_NUMBER]

PR_NUMBER=$1

if [ -z "$PR_NUMBER" ]; then
    echo "React Router 7.8.x Migration - PR Starter"
    echo "========================================="
    echo ""
    echo "Usage: $0 [PR_NUMBER]"
    echo ""
    echo "Available PRs:"
    echo "  0 - Version Pinning (MUST BE FIRST)"
    echo "  1 - Remix-Oxygen Package"
    echo "  2 - Hydrogen-React Package"
    echo "  3 - Hydrogen Core Infrastructure"
    echo "  4 - CLI Minimal Updates"
    echo "  5 - Skeleton Template Migration"
    echo "  6 - Mini-Oxygen & Create-Hydrogen"
    echo "  7 - CLI Advanced Features"
    echo "  8 - Examples Conversion"
    echo "  9 - Recipe Updates"
    echo ""
    echo "Example: $0 0"
    exit 1
fi

# Define branch names and first steps for each PR
case $PR_NUMBER in
    0)
        BRANCH_NAME="feat/pin-react-router-7.8.2"
        PLAN_FILE="PR0_PLAN.md"
        CHERRY_PICK="411bb36"
        DESCRIPTION="Version Pinning"
        ;;
    1)
        BRANCH_NAME="feat/remix-oxygen-rr-7.8"
        PLAN_FILE="PR1_PLAN.md"
        CHERRY_PICK=""
        DESCRIPTION="Remix-Oxygen Updates"
        ;;
    2)
        BRANCH_NAME="feat/hydrogen-react-rr-7.8"
        PLAN_FILE="PR2_PLAN.md"
        CHERRY_PICK="636bc80 df09825"
        DESCRIPTION="Hydrogen-React Updates"
        ;;
    3)
        BRANCH_NAME="feat/hydrogen-core-rr-7.8"
        PLAN_FILE="PR3_PLAN.md"
        CHERRY_PICK="22e4ca3 7ae1060 ee23476 269853d 16f51f4 3b9207c"
        DESCRIPTION="Hydrogen Core Infrastructure"
        ;;
    4)
        BRANCH_NAME="feat/cli-minimal-rr-7.8"
        PLAN_FILE="PR4_PLAN.md"
        CHERRY_PICK="543e93a"
        DESCRIPTION="CLI Minimal Updates"
        ;;
    5)
        BRANCH_NAME="feat/skeleton-rr-7.8-migration"
        PLAN_FILE="PR5_PLAN.md"
        CHERRY_PICK=""
        DESCRIPTION="Skeleton Template Migration"
        ;;
    6)
        BRANCH_NAME="feat/mini-oxygen-create-hydrogen-rr-7.8"
        PLAN_FILE="PR6_PLAN.md"
        CHERRY_PICK=""
        DESCRIPTION="Mini-Oxygen & Create-Hydrogen"
        ;;
    7)
        BRANCH_NAME="feat/cli-advanced-rr-7.8"
        PLAN_FILE="PR7_PLAN.md"
        CHERRY_PICK="3beb46e a600b04 97493ed"
        DESCRIPTION="CLI Advanced Features"
        ;;
    8)
        BRANCH_NAME="feat/examples-standalone-rr-7.8"
        PLAN_FILE="PR8_PLAN.md"
        CHERRY_PICK="e2b78b1"
        DESCRIPTION="Examples Conversion"
        ;;
    9)
        BRANCH_NAME="feat/recipes-rr-7.8"
        PLAN_FILE="PR9_PLAN.md"
        CHERRY_PICK=""
        DESCRIPTION="Recipe Updates"
        ;;
    *)
        echo "Invalid PR number: $PR_NUMBER"
        exit 1
        ;;
esac

echo "🚀 Starting PR $PR_NUMBER: $DESCRIPTION"
echo "================================================"
echo ""
echo "📋 Plan file: .github/pr-plans/$PLAN_FILE"
echo "🌿 Branch name: $BRANCH_NAME"
if [ ! -z "$CHERRY_PICK" ]; then
    echo "🍒 Commits to cherry-pick: $CHERRY_PICK"
fi
echo ""
echo "Steps to start:"
echo "---------------"
echo "1. git checkout main"
echo "2. git pull origin main"
echo "3. git checkout -b $BRANCH_NAME"

if [ ! -z "$CHERRY_PICK" ]; then
    echo "4. Cherry-pick commits:"
    for commit in $CHERRY_PICK; do
        echo "   git cherry-pick $commit"
    done
fi

echo ""
echo "📖 Full instructions: cat .github/pr-plans/$PLAN_FILE"
echo ""
echo "Would you like to create the branch now? (y/n)"
read -r response

if [[ "$response" == "y" ]]; then
    echo ""
    echo "Creating branch..."
    git checkout main
    git pull origin main
    git checkout -b $BRANCH_NAME
    
    echo ""
    echo "✅ Branch created: $BRANCH_NAME"
    echo "📋 Now follow the plan in: .github/pr-plans/$PLAN_FILE"
    echo ""
    echo "To view the plan:"
    echo "  cat .github/pr-plans/$PLAN_FILE | less"
else
    echo "Branch creation skipped. Run the commands manually when ready."
fi