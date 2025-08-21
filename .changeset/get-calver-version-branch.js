#!/usr/bin/env node

/**
 * Determines the correct latestBranch for CI releases
 * WITH SAFEGUARDS for existing open release PRs
 */

const { execSync } = require('child_process');
const {
  parseVersion,
  getPackagePath,
  readPackage,
  hasMajorChangesets,
  getNextQuarter,
  versionToBranchName,
  QUARTERS
} = require('./calver-shared.js');

/**
 * Check if there's an open release PR
 * Returns the branch name from the PR title if found, null otherwise
 */
function getExistingReleasePRBranch() {
  try {
    // Use GitHub CLI to check for open PRs from changeset-release branch
    const result = execSync(
      `gh pr list --state open --head changeset-release/main --json title --limit 1`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
    ).trim();
    
    if (!result) return null;
    
    const prs = JSON.parse(result);
    if (prs.length === 0) return null;
    
    const pr = prs[0];
    // Extract branch from title like "[ci] release 2025-05"
    const match = pr.title.match(/\[ci\] release (\d{4}-\d{2})/);
    if (match) {
      console.error(`Found existing release PR with branch: ${match[1]}`);
      return match[1];
    }
    
    return null;
  } catch (error) {
    // If gh CLI not available or other error, log warning but continue
    console.error('Warning: Could not check for existing PRs:', error.message);
    return null;
  }
}

// Get the latest branch based on current version and changesets
function getLatestBranch() {
  try {
    // SAFEGUARD 1: Check for existing open release PR
    const existingBranch = getExistingReleasePRBranch();
    if (existingBranch) {
      console.error('Using existing release PR branch to avoid conflicts');
      return existingBranch;
    }
    
    // Use hydrogen package as the source of truth
    const hydrogenPath = getPackagePath('@shopify/hydrogen');
    const hydrogenPkg = readPackage(hydrogenPath);
    const currentVersion = hydrogenPkg.version;
    
    const v = parseVersion(currentVersion);
    
    // Check if we need to advance to next quarter
    if (hasMajorChangesets()) {
      // SAFEGUARD 2: Only advance if no open PR
      console.error('Major changesets detected, advancing to next quarter');
      const nextQ = getNextQuarter(v.major);
      const nextY = nextQ === QUARTERS[0] ? v.year + 1 : v.year;
      
      return versionToBranchName(nextY, nextQ);
    }
    
    // No major bump, stay on current branch
    return versionToBranchName(v.year, v.major);
    
  } catch (error) {
    // In CI, we should fail loudly
    if (process.env.CI === 'true') {
      console.error('Error determining latest branch:', error.message);
      process.exit(1);
    }
    
    // In local development, show error but don't exit
    console.error('Error:', error.message);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  const branch = getLatestBranch();
  console.log(branch);
}

// Export for testing
module.exports = { getLatestBranch, getExistingReleasePRBranch };