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
// Uses the original version from git as baseline (before changesets corruption)
function readPackageVersions() {
  const versions = {};
  
  // Get the original version from git (before changesets ran)
  // This prevents using corrupted versions like 2026.0.0 that changesets might generate
  let sourceOfTruthVersion;
  try {
    // Try to get the version from the base branch (before changesets modified it)
    const gitVersion = execSync('git show HEAD~1:packages/hydrogen/package.json 2>/dev/null || git show origin/main:packages/hydrogen/package.json', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    const versionMatch = gitVersion.match(/"version":\s*"([^"]+)"/);
    if (versionMatch) {
      sourceOfTruthVersion = versionMatch[1];
      console.log(`Using original version from git: ${sourceOfTruthVersion}`);
    }
  } catch (error) {
    // Fallback to current version if git command fails
    const hydrogenPath = getPackagePath('@shopify/hydrogen');
    const hydrogenPkg = readPackage(hydrogenPath);
    sourceOfTruthVersion = hydrogenPkg.version;
    console.log(`Using current version as fallback: ${sourceOfTruthVersion}`);
  }
  
  for (const pkgName of CALVER_PACKAGES) {
    const pkgPath = getPackagePath(pkgName);
    const pkg = readPackage(pkgPath);
    versions[pkgName] = {
      path: pkgPath,
      oldVersion: sourceOfTruthVersion, // Use original version as baseline for all packages
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
  const templateDirs = fs.readdirSync(templatesDir)
    .filter(d => d !== 'TEMPLATE_GUIDELINES.md');
  
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
    throw new Error(`Invalid quarter in version ${version}: ${v.major} not in [${QUARTERS}]`);
  }

  return true;
}

// Main execution
function main() {
  // Read current versions (after changesets has run)
  // This compares current pkg versions against git baseline
  const versions = readPackageVersions();

  // Check if any CalVer package actually changed
  // After changesets runs, if a package wasn't touched, oldVersion === pkg.version
  let hasCalVerChanges = false;
  for (const [pkgName, data] of Object.entries(versions)) {
    if (data.pkg.version !== data.oldVersion) {
      hasCalVerChanges = true;
      break;
    }
  }

  if (!hasCalVerChanges) {
    console.log('No CalVer package changes detected. Skipping CalVer enforcement.');
    console.log('This is a semver-only release.');
    return;
  }

  console.log('Starting CalVer enforcement...\n');

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