#!/usr/bin/env node

/**
 * Hydrogen CalVer Local Testing Script
 *
 * For testing CalVer transformations locally with dry-run and other options.
 * Production releases should use enforce-calver-ci.js
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
  hasMajorChangesets
} = require('./calver-shared.js');

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Hydrogen CalVer Local Testing Script

Usage: node .changeset/enforce-calver-local.js [options]

Options:
  --dry-run         Preview changes without modifying files (default)
  --apply           Actually modify files (use with caution)
  --skip-changesets Skip running changesets (use existing versions)
  --help, -h        Show this help message

For production releases, use enforce-calver-ci.js
    `);
    process.exit(0);
  }

  return {
    dryRun: !args.includes('--apply'),
    skipChangesets: args.includes('--skip-changesets'),
  };
}

// Validate CalVer format and checks
function validateUpdates(updates, originalVersions) {
  const errors = [];

  Object.entries(updates).forEach(([pkgName, update]) => {
    // Check format
    const match = update.to.match(/^(\d{4})\.(\d+)\.(\d+)(?:\.(\d+))?$/);
    if (!match || +match[2] < 1 || +match[2] > 12) {
      errors.push(`Invalid CalVer format for ${pkgName}: ${update.to}`);
    }

    // Check regression
    const oldV = parseVersion(update.from);
    const newV = parseVersion(update.to);
    if (
      newV.year < oldV.year ||
      (newV.year === oldV.year && newV.major < oldV.major) ||
      (newV.year === oldV.year &&
        newV.major === oldV.major &&
        newV.minor < oldV.minor)
    ) {
      errors.push(
        `Version regression for ${pkgName}: ${update.from} → ${update.to}`,
      );
    }

    // Check quarter alignment for majors
    if (update.type === 'major' && !QUARTERS.includes(newV.major)) {
      errors.push(
        `Quarter misalignment for ${pkgName}: ${update.to} should use quarters (1,4,7,10)`,
      );
    }
  });

  return errors;
}

// Analyze changesets to determine bump type for a package
function getBumpTypeFromChangesets(pkgName) {
  const changesetDir = path.join(process.cwd(), '.changeset');
  let bumpType = null;
  
  try {
    const files = fs.readdirSync(changesetDir);
    for (const file of files) {
      if (!file.endsWith('.md') || file === 'README.md') continue;
      const filePath = path.join(changesetDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Check for this package in changesets
      if (content.includes(`"${pkgName}": major`)) {
        bumpType = 'major';
        break;
      } else if (content.includes(`"${pkgName}": minor`)) {
        bumpType = bumpType !== 'major' ? 'minor' : bumpType;
      } else if (content.includes(`"${pkgName}": patch`)) {
        bumpType = bumpType || 'patch';
      }
    }
  } catch (error) {
    console.error(`Error reading changesets: ${error.message}`);
  }
  
  return bumpType;
}

// Main execution
const opts = parseArgs();

console.log(
  opts.dryRun
    ? '🧪 DRY RUN MODE - No files will be modified'
    : '⚠️  APPLY MODE - Files will be modified!',
);
console.log('📅 Starting CalVer versioning test...\n');

// Save original versions
const originalVersions = {};
const originalPackages = {};

console.log('📦 Current versions:');
CALVER_PACKAGES.forEach((pkgName) => {
  const pkgPath = getPackagePath(pkgName);
  const pkg = readPackage(pkgPath);
  originalVersions[pkgName] = pkg.version;
  originalPackages[pkgPath] = JSON.stringify(pkg, null, 2) + '\n';
  console.log(`  ${pkgName}: ${pkg.version}`);
});

// Run changesets if not skipped
if (!opts.skipChangesets) {
  console.log('\n🦋 Running changeset version...');
  if (opts.dryRun) {
    console.log('  [DRY RUN] Would run: npx @changesets/cli version');
  } else {
    execSync('npx @changesets/cli version', {stdio: 'inherit'});
  }
} else {
  console.log('\n⏭️  Skipping changeset version');
}

// Calculate transformations
console.log('\n🔄 Calculating CalVer transformations...');
const updates = {};

// Check if any package has major changesets
const hasAnyMajor = hasMajorChangesets();

CALVER_PACKAGES.forEach((pkgName) => {
  const pkgPath = getPackagePath(pkgName);
  const pkg = opts.dryRun
    ? JSON.parse(originalPackages[pkgPath])
    : readPackage(pkgPath);

  // In dry-run mode, simulate what changesets would do based on actual changesets
  if (opts.dryRun && !opts.skipChangesets) {
    const bumpType = getBumpTypeFromChangesets(pkgName);
    
    if (bumpType) {
      // Simulate the changeset bump
      const simVersion = getNextVersion(originalVersions[pkgName], bumpType);
      // Replace pkg.version with simulated version
      pkg.version = simVersion;
    }
  }

  const originalVersion = originalVersions[pkgName];
  const changesetVersion = pkg.version;
  const bumpType = getBumpType(originalVersion, changesetVersion);
  
  // For major bumps, ensure all CalVer packages advance to same quarter
  const effectiveBumpType = hasAnyMajor ? 'major' : bumpType;
  const calverVersion = getNextVersion(originalVersion, effectiveBumpType);

  updates[pkgName] = {
    from: originalVersion,
    changeset: changesetVersion,
    to: calverVersion,
    type: bumpType,
  };
});

// Print updates
console.log('\n📊 Version transformations:');
Object.entries(updates).forEach(([pkgName, update]) => {
  const arrow = update.from === update.to ? '=' : '→';
  const changesetInfo =
    update.from !== update.changeset
      ? ` (changeset: ${update.changeset})`
      : '';
  console.log(
    `  ${pkgName}: ${update.from} ${arrow} ${update.to}${changesetInfo}`,
  );
});

// Check for major version coordination
if (hasAnyMajor) {
  console.log('\n🔗 Major version coordination:');
  console.log('  All CalVer packages advance to same quarter due to major bump');
}

// Validate transformations
const errors = validateUpdates(updates, originalVersions);
if (errors.length > 0) {
  console.error('\n❌ Validation errors:');
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}

// Apply changes if not dry-run
if (!opts.dryRun) {
  console.log('\n✏️  Applying CalVer transformations...');
  
  // Apply version updates
  Object.entries(updates).forEach(([pkgName, update]) => {
    const pkgPath = getPackagePath(pkgName);
    const pkg = readPackage(pkgPath);
    pkg.version = update.to;
    writePackage(pkgPath, pkg);
    console.log(`  ${pkgName}: Updated to ${update.to}`);
  });
  
  // Update internal dependencies
  console.log('\n📝 Updating internal dependencies...');
  const versionMap = {};
  Object.entries(updates).forEach(([pkgName, update]) => {
    versionMap[pkgName] = update.to;
  });
  
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
  
  console.log('\n✅ CalVer transformations applied successfully!');
} else {
  console.log('\n✅ CalVer simulation complete (no files modified)');
}

// Restore files if dry-run and changesets was not skipped
if (opts.dryRun && !opts.skipChangesets) {
  console.log('\n🔄 Restoring original versions (dry-run cleanup)...');
  Object.entries(originalPackages).forEach(([pkgPath, content]) => {
    if (!opts.dryRun) {
      fs.writeFileSync(pkgPath, content);
    }
  });
}