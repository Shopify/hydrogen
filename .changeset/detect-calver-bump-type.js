#!/usr/bin/env node

/**
 * Hydrogen CalVer Bump Type Detection Script
 *
 * MUST run BEFORE `changeset version` since changesets deletes the .md files.
 *
 * This script:
 * 1. Reads all .changeset/*.md files
 * 2. Detects the highest bump type for CalVer packages (major > minor/patch)
 * 3. Writes the result to a temp file for enforce-calver-ci.js to read
 *
 * For CalVer:
 * - 'major' = advance to next quarter
 * - 'minor' or 'patch' = increment within current quarter (both treated the same)
 */

const fs = require('fs');
const path = require('path');
const {CALVER_PACKAGES, CALVER_SYNC_PACKAGES} = require('./calver-shared.js');

const CALVER_BUMP_FILE = path.join(__dirname, '.calver-bump-type');

/**
 * Detects the highest bump type from changesets for CalVer packages.
 * Returns 'major' if any CalVer package has a major changeset,
 * otherwise returns 'patch' (minor and patch are equivalent in CalVer).
 * Returns null if no CalVer packages have changesets.
 */
function detectBumpType() {
  const changesetDir = path.join(process.cwd(), '.changeset');

  let files;
  try {
    files = fs.readdirSync(changesetDir);
  } catch (error) {
    console.log('No .changeset directory found');
    return null;
  }

  let hasMajor = false;
  let hasMinorOrPatch = false;

  for (const file of files) {
    if (!file.endsWith('.md') || file === 'README.md') continue;

    const filePath = path.join(changesetDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    for (const pkg of CALVER_PACKAGES) {
      const canTriggerMajorSync = CALVER_SYNC_PACKAGES.includes(pkg);

      if (
        canTriggerMajorSync &&
        (content.includes(`"${pkg}": major`) ||
          content.includes(`'${pkg}': major`))
      ) {
        hasMajor = true;
      } else if (
        content.includes(`"${pkg}": minor`) ||
        content.includes(`'${pkg}': minor`) ||
        content.includes(`"${pkg}": patch`) ||
        content.includes(`'${pkg}': patch`) ||
        content.includes(`"${pkg}": major`) ||
        content.includes(`'${pkg}': major`)
      ) {
        hasMinorOrPatch = true;
      }
    }

    if (hasMajor) break;
  }

  if (hasMajor) return 'major';
  if (hasMinorOrPatch) return 'patch';
  return null;
}

/**
 * Writes the bump type to a temp file for enforce-calver-ci.js to read.
 */
function writeBumpType(bumpType) {
  if (bumpType) {
    fs.writeFileSync(CALVER_BUMP_FILE, bumpType, 'utf-8');
    console.log(`CalVer bump type detected: ${bumpType}`);
    console.log(`Written to: ${CALVER_BUMP_FILE}`);
  } else {
    if (fs.existsSync(CALVER_BUMP_FILE)) {
      fs.unlinkSync(CALVER_BUMP_FILE);
    }
    console.log('No CalVer changesets detected');
  }
}

function main() {
  const bumpType = detectBumpType();
  writeBumpType(bumpType);
}

if (require.main === module) {
  main();
}

module.exports = {detectBumpType, writeBumpType, CALVER_BUMP_FILE};
