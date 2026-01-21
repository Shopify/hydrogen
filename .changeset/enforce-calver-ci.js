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
  writePackage,
} = require('./calver-shared.js');
const {CALVER_BUMP_FILE} = require('./detect-calver-bump-type.js');

/**
 * Reads the pre-computed CalVer bump type from the temp file.
 * This file is created by detect-calver-bump-type.js BEFORE changeset version runs.
 *
 * Returns 'major', 'patch', or null if no CalVer changesets were detected.
 */
function readPreComputedBumpType() {
  try {
    if (fs.existsSync(CALVER_BUMP_FILE)) {
      const bumpType = fs.readFileSync(CALVER_BUMP_FILE, 'utf-8').trim();
      console.log(`Pre-computed CalVer bump type: ${bumpType}`);
      return bumpType;
    }
  } catch (error) {
    console.log(`Could not read pre-computed bump type: ${error.message}`);
  }
  return null;
}

/**
 * Cleans up the temp file after use.
 */
function cleanupBumpTypeFile() {
  try {
    if (fs.existsSync(CALVER_BUMP_FILE)) {
      fs.unlinkSync(CALVER_BUMP_FILE);
    }
  } catch (error) {
    // Ignore cleanup errors
  }
}

// Read all package.json files for CalVer packages
// Fetches individual git baselines for independent patch versioning
// Hydrogen baseline used for major sync across all CalVer packages
function readPackageVersions() {
  const versions = {};

  // Get hydrogen's git baseline (used for major bump synchronization)
  let hydrogenBaselineVersion;
  try {
    const gitVersion = execSync(
      'git show HEAD~1:packages/hydrogen/package.json 2>/dev/null || git show origin/main:packages/hydrogen/package.json',
      {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      },
    );
    const versionMatch = gitVersion.match(/"version":\s*"([^"]+)"/);
    if (versionMatch) {
      hydrogenBaselineVersion = versionMatch[1];
      console.log(
        `Using hydrogen baseline from git: ${hydrogenBaselineVersion}`,
      );
    }
  } catch (error) {
    const hydrogenPath = getPackagePath('@shopify/hydrogen');
    const hydrogenPkg = readPackage(hydrogenPath);
    hydrogenBaselineVersion = hydrogenPkg.version;
    console.log(
      `Using hydrogen current version as fallback: ${hydrogenBaselineVersion}`,
    );
  }

  // Get each package's individual baseline for independent patch versioning
  for (const pkgName of CALVER_PACKAGES) {
    const pkgPath = getPackagePath(pkgName);
    const pkg = readPackage(pkgPath);

    // Fetch this package's own git baseline
    let packageOwnBaseline;
    try {
      const gitPath = pkgPath.replace(process.cwd() + '/', '');
      const gitVersion = execSync(
        `git show HEAD~1:${gitPath} 2>/dev/null || git show origin/main:${gitPath}`,
        {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore'],
        },
      );
      const versionMatch = gitVersion.match(/"version":\s*"([^"]+)"/);
      packageOwnBaseline = versionMatch
        ? versionMatch[1]
        : hydrogenBaselineVersion;
    } catch (error) {
      packageOwnBaseline = hydrogenBaselineVersion;
    }

    versions[pkgName] = {
      path: pkgPath,
      oldVersion: packageOwnBaseline,
      hydrogenBaseline: hydrogenBaselineVersion,
      pkg,
    };
  }
  return versions;
}

// Calculate new CalVer versions based on changeset bumps
// preComputedBumpType: The bump type detected from changesets BEFORE they were consumed.
//   - 'major' means at least one CalVer package had a major changeset
//   - 'patch' means changesets were minor or patch (both treated the same in CalVer)
//   - null means no CalVer changesets were found (fallback to version comparison)
function calculateNewVersions(versions, preComputedBumpType) {
  const updates = [];

  // Use pre-computed bump type to determine if this is a major release.
  // This fixes the bug where `getBumpType()` incorrectly infers 'major' when
  // changesets does a semver minor bump (e.g., 2025.7.2 → 2025.8.0).
  const hasAnyMajor = preComputedBumpType === 'major';

  if (preComputedBumpType) {
    console.log(
      `Using pre-computed bump type: ${preComputedBumpType} (hasAnyMajor=${hasAnyMajor})`,
    );
  } else {
    console.log(
      'No pre-computed bump type found, falling back to version comparison',
    );
  }

  for (const [pkgName, data] of Object.entries(versions)) {
    // Determine if this package was changed by changesets
    const wasChanged = data.pkg.version !== data.oldVersion;

    // For the bump type used in versioning, prefer the pre-computed type
    // since version comparison is unreliable after changesets runs
    let effectiveBumpType;
    if (!wasChanged) {
      effectiveBumpType = null;
    } else if (preComputedBumpType) {
      effectiveBumpType = preComputedBumpType;
    } else {
      effectiveBumpType = getBumpType(data.oldVersion, data.pkg.version);
    }

    let newVersion;
    if (hasAnyMajor) {
      // Major: Sync all CalVer packages to same quarter using hydrogen's baseline
      newVersion = getNextVersion(data.hydrogenBaseline, 'major');
    } else if (!wasChanged) {
      // No change: Keep current version (don't bump unchanged packages)
      newVersion = data.pkg.version;
    } else {
      // Patch/minor: Independent versioning using package's own baseline
      // Both 'minor' and 'patch' result in incrementing within the quarter
      newVersion = getNextVersion(data.oldVersion, 'patch');
    }

    updates.push({
      name: pkgName,
      path: data.path,
      pkg: data.pkg,
      oldVersion: data.oldVersion,
      bumpType: effectiveBumpType,
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
    const regex = new RegExp(`^## \\d+\\.\\d+\\.\\d+`, 'gm');
    content = content.replace(regex, (match) => {
      // Only replace if it's a recent addition (first occurrence)
      return content.indexOf(match) === content.search(regex)
        ? `## ${update.newVersion}`
        : match;
    });

    fs.writeFileSync(changelogPath, content);
  }
}

// Get all package.json paths from packages/ and templates/ directories
function getAllPackageJsonPaths() {
  const paths = [];

  // Get packages directory entries
  const packagesDir = path.join(process.cwd(), 'packages');
  const packageDirs = fs.readdirSync(packagesDir);

  for (const dir of packageDirs) {
    const pkgPath = path.join(packagesDir, dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      paths.push(pkgPath);
    }
  }

  // Get templates directory entries
  const templatesDir = path.join(process.cwd(), 'templates');
  const templateDirs = fs
    .readdirSync(templatesDir)
    .filter((d) => d !== 'TEMPLATE_GUIDELINES.md');

  for (const dir of templateDirs) {
    const pkgPath = path.join(templatesDir, dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      paths.push(pkgPath);
    }
  }

  return paths;
}

// Update dependencies in a single package.json
function updatePackageDependencies(pkg, versionMap) {
  let modified = false;
  const depTypes = ['dependencies', 'devDependencies', 'peerDependencies'];

  for (const depType of depTypes) {
    if (!pkg[depType]) continue;

    for (const [depName, depVersion] of Object.entries(pkg[depType])) {
      if (versionMap[depName]) {
        // Preserve any prefix like ^, ~, or workspace:
        const prefix = depVersion.match(/^([^\d]*)/)[1];
        pkg[depType][depName] = prefix + versionMap[depName];
        modified = true;
      }
    }
  }

  return modified;
}

// Update internal dependencies
function updateInternalDependencies(updates) {
  // Create version map from updates
  const versionMap = {};
  for (const update of updates) {
    versionMap[update.name] = update.newVersion;
  }

  // Get all package.json paths
  const packagePaths = getAllPackageJsonPaths();

  // Update each package.json file
  for (const pkgPath of packagePaths) {
    const pkg = readPackage(pkgPath);
    const modified = updatePackageDependencies(pkg, versionMap);

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
    throw new Error(
      `Invalid quarter in version ${version}: ${v.major} not in [${QUARTERS}]`,
    );
  }

  return true;
}

// Main execution
function main() {
  // Read the pre-computed bump type FIRST (before any other processing)
  // This file was created by detect-calver-bump-type.js before changesets ran
  const preComputedBumpType = readPreComputedBumpType();

  // Get versions: oldVersion from git baseline, pkg.version from current state
  const versions = readPackageVersions();

  // Skip CalVer enforcement if no CalVer packages were bumped by changesets
  // This prevents semver-only releases (CLI, mini-oxygen) from touching CalVer packages
  let hasCalVerChanges = false;
  for (const [pkgName, data] of Object.entries(versions)) {
    if (data.pkg.version !== data.oldVersion) {
      hasCalVerChanges = true;
      break;
    }
  }

  if (!hasCalVerChanges) {
    console.log(
      'No CalVer package changes detected. Skipping CalVer enforcement.',
    );
    console.log('This is a semver-only release.');
    cleanupBumpTypeFile();
    return;
  }

  console.log('Starting CalVer enforcement...\n');

  // Calculate new CalVer versions using the pre-computed bump type
  const updates = calculateNewVersions(versions, preComputedBumpType);

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

  // Clean up the temp file
  cleanupBumpTypeFile();

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
