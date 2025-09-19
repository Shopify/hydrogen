#!/bin/bash

# E2E Test Setup Script
# Ensures dependencies are installed and packages are built before running E2E tests
# Only runs npm install when package files have changed to save time

set -e  # Exit on error

# Function to check if npm install is needed
needs_npm_install() {
  local dir=$1
  local package_json="$dir/package.json"
  local package_lock="$dir/package-lock.json"
  local node_modules="$dir/node_modules"
  
  # If node_modules doesn't exist, definitely need install
  if [ ! -d "$node_modules" ]; then
    return 0  # true, needs install
  fi
  
  # Check if package.json is newer than node_modules
  if [ "$package_json" -nt "$node_modules" ]; then
    return 0  # true, needs install
  fi
  
  # Check if package-lock.json exists and is newer than node_modules
  if [ -f "$package_lock" ] && [ "$package_lock" -nt "$node_modules" ]; then
    return 0  # true, needs install
  fi
  
  return 1  # false, no install needed
}

echo "🚀 Starting E2E test setup..."

# Check root dependencies
if needs_npm_install "."; then
  echo "📦 Installing root dependencies (package files changed)..."
  npm install
else
  echo "✓ Root dependencies up to date"
fi

# Always build packages (Turbo makes this fast with caching)
echo "🔨 Building packages..."
npm run build:pkg

# Check skeleton dependencies
if needs_npm_install "templates/skeleton"; then
  echo "📦 Installing skeleton dependencies (package files changed)..."
  cd templates/skeleton && npm install && cd ../..
else
  echo "✓ Skeleton dependencies up to date"
fi

echo "✅ E2E setup complete"