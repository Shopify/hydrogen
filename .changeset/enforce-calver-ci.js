#!/usr/bin/env node

/**
 * Hydrogen CalVer CI Script - Production Release Only
 *
 * Transforms changeset versions to CalVer format for Hydrogen packages.
 * This script runs in CI as part of the release process.
 *
 * For local testing, use enforce-calver-local.js
 * For detailed documentation, see docs/CALVER.md
 */

const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');
const {
  QUARTERS,
  CALVER_PACKAGES,
  parseVersion,
  getNextVersion,
  getBumpType,
  getPackagePath,
  readPackage,
  writePackage
} = require('./calver-shared.js');

// Read all package.json files for CalVer packages
function readPackageVersions() {
  const versions = {};
  for (const pkgName of CALVER_PACKAGES) {
    const pkgPath = getPackagePath(pkgName);
    const pkg = readPackage(pkgPath);
    versions[pkgName] = {
      path: pkgPath,
      oldVersion: pkg.version,
      pkg,
    };
  }
  return versions;
}

// Calculate new CalVer versions based on changeset bumps
function calculateNewVersions(versions) {
  const updates = [];
  let hasAnyMajor = false;

  // First pass: determine if any package needs major bump
  for (const [pkgName, data] of Object.entries(versions)) {
    const bumpType = getBumpType(data.oldVersion, data.pkg.version);
    if (bumpType === 'major') {
      hasAnyMajor = true;
      break;
    }
  }

  // Second pass: calculate new versions
  for (const [pkgName, data] of Object.entries(versions)) {
    const bumpType = getBumpType(data.oldVersion, data.pkg.version);

    // For major bumps, ensure all CalVer packages advance to same quarter
    const effectiveBumpType = hasAnyMajor ? 'major' : bumpType;
    const newVersion = getNextVersion(data.oldVersion, effectiveBumpType);

    updates.push({
      name: pkgName,
      path: data.path,
      pkg: data.pkg,
      oldVersion: data.oldVersion,
      bumpType,
      newVersion,
    });
  }

  return updates;
}

// Apply version updates
function applyUpdates(updates) {
  for (const update of updates) {
    update.pkg.version = update.newVersion;
    writePackage(update.path, update.pkg);
    console.log(`${update.name}: ${update.oldVersion} → ${update.newVersion}`);
  }
}

// Update CHANGELOG headers
function updateChangelogs(updates) {
  for (const update of updates) {
    const dir = path.dirname(update.path);
    const changelogPath = path.join(dir, 'CHANGELOG.md');

    if (!fs.existsSync(changelogPath)) continue;

    let content = fs.readFileSync(changelogPath, 'utf-8');

    // Replace the version that changesets generated with our CalVer version
    const regex = new RegExp(
      `^## \\d+\\.\\d+\\.\\d+`,
      'gm'
    );
    content = content.replace(regex, (match) => {
      // Only replace if it's a recent addition (first occurrence)
      return content.indexOf(match) === content.search(regex)
        ? `## ${update.newVersion}`
        : match;
    });

    fs.writeFileSync(changelogPath, content);
  }
}

// Update internal dependencies
function updateInternalDependencies(updates) {
  const versionMap = {};
  for (const update of updates) {
    versionMap[update.name] = update.newVersion;
  }

  // Update all package.json files that might depend on CalVer packages
  const packagesDir = path.join(process.cwd(), 'packages');
  const dirs = fs.readdirSync(packagesDir);

  for (const dir of dirs) {
    const pkgPath = path.join(packagesDir, dir, 'package.json');
    if (!fs.existsSync(pkgPath)) continue;

    const pkg = readPackage(pkgPath);
    let modified = false;

    // Check all dependency types
    for (const depType of ['dependencies', 'devDependencies', 'peerDependencies']) {
      if (!pkg[depType]) continue;

      for (const [depName, depVersion] of Object.entries(pkg[depType])) {
        if (versionMap[depName]) {
          // Update to new version (preserve any prefix like ^, ~, or workspace:)
          const prefix = depVersion.match(/^([^\d]*)/)[1];
          pkg[depType][depName] = prefix + versionMap[depName];
          modified = true;
        }
      }
    }

    if (modified) {
      writePackage(pkgPath, pkg);
    }
  }
}

// Validate CalVer format and rules
function validateCalVer(version) {
  const v = parseVersion(version);

  // Check year is reasonable
  const currentYear = new Date().getFullYear();
  if (v.year < 2024 || v.year > currentYear + 1) {
    throw new Error(`Invalid year in version ${version}`);
  }

  // Check major is a valid quarter
  if (!QUARTERS.includes(v.major)) {
    throw new Error(`Invalid quarter in version ${version}: ${v.major} not in [${QUARTERS}]`);
  }

  return true;
}

// Main execution
function main() {
  console.log('Starting CalVer enforcement...\n');

  // Read current versions (after changesets has run)
  const versions = readPackageVersions();

  // Calculate new CalVer versions
  const updates = calculateNewVersions(versions);

  // Validate all new versions
  for (const update of updates) {
    validateCalVer(update.newVersion);
  }

  // Apply updates
  applyUpdates(updates);

  // Update changelogs
  updateChangelogs(updates);

  // Update internal dependencies
  updateInternalDependencies(updates);

  console.log('\nCalVer enforcement complete ✅');
}

// Run if executed directly
if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}