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

const QUARTERS = [1, 4, 7, 10];
const CALVER_PACKAGES = [
  '@shopify/hydrogen',
  '@shopify/hydrogen-react',
  'skeleton',
];

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

// Parse version string into components
function parseVersion(version) {
  const match = version.match(/^(\d{4})\.(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!match) throw new Error(`Invalid version: ${version}`);
  return {
    year: +match[1],
    major: +match[2],
    minor: +match[3],
    patch: match[4] ? +match[4] : undefined,
  };
}

// Get next CalVer version based on bump type
function getNextVersion(currentVersion, bumpType) {
  const v = parseVersion(currentVersion);

  if (bumpType === 'major') {
    const nextQ = QUARTERS.find((q) => q > v.major) || QUARTERS[0];
    const nextY = nextQ === QUARTERS[0] ? v.year + 1 : v.year;
    return `${nextY}.${nextQ}.0`;
  }

  if (bumpType === 'minor') {
    return `${v.year}.${v.major}.${v.minor + 1}`;
  }

  const nextPatch = v.patch !== undefined ? v.patch + 1 : 1;
  return `${v.year}.${v.major}.${v.minor}.${nextPatch}`;
}

// Determine bump type by comparing versions
function getBumpType(oldVersion, newVersion) {
  const oldV = parseVersion(oldVersion);
  const newV = parseVersion(newVersion);

  if (oldV.year !== newV.year || oldV.major !== newV.major) return 'major';
  if (oldV.minor !== newV.minor) return 'minor';
  return 'patch';
}

// Get package.json path for a package
function getPackagePath(pkgName) {
  if (pkgName === 'skeleton') {
    return path.join(process.cwd(), 'templates/skeleton/package.json');
  }
  const shortName = pkgName.replace('@shopify/', '');
  return path.join(process.cwd(), `packages/${shortName}/package.json`);
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
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  originalVersions[pkgName] = pkg.version;
  originalPackages[pkgPath] = JSON.stringify(pkg, null, 2) + '\n';
  console.log(`  ${pkgName}: ${pkg.version}`);
});

// Run changesets if not skipped
if (!opts.skipChangesets) {
  console.log('\n🦋 Running changeset version...');
  if (opts.dryRun) {
    console.log('  [DRY RUN] Would run: npx changeset version');
  } else {
    execSync('npx changeset version', {stdio: 'inherit'});
  }
} else {
  console.log('\n⏭️  Skipping changeset version');
}

// Calculate transformations
console.log('\n🔄 Calculating CalVer transformations...');
const updates = {};

CALVER_PACKAGES.forEach((pkgName) => {
  const pkgPath = getPackagePath(pkgName);
  const pkg = opts.dryRun
    ? JSON.parse(originalPackages[pkgPath])
    : JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

  // Simulate changeset bump for dry-run
  if (opts.dryRun && !opts.skipChangesets) {
    // In dry-run, simulate a minor bump for demo
    const v = parseVersion(pkg.version);
    pkg.version = `${v.year}.${v.major}.${v.minor + 1}`;
  }

  if (pkg.version === originalVersions[pkgName]) return;

  const bumpType = getBumpType(originalVersions[pkgName], pkg.version);
  const calverVersion = getNextVersion(originalVersions[pkgName], bumpType);

  updates[pkgName] = {
    from: originalVersions[pkgName],
    changeset: pkg.version,
    to: calverVersion,
    type: bumpType,
  };

  console.log(`  ${pkgName}:`);
  console.log(
    `    Changeset: ${originalVersions[pkgName]} → ${pkg.version} (${bumpType})`,
  );
  console.log(`    CalVer:    ${originalVersions[pkgName]} → ${calverVersion}`);
});

if (Object.keys(updates).length === 0) {
  console.log('  No version changes detected.');
  process.exit(0);
}

// Validate
console.log('\n🛡️  Running validation...');
const errors = validateUpdates(updates, originalVersions);
if (errors.length > 0) {
  console.error('\n❌ Validation failed:');
  errors.forEach((err) => console.error(`  • ${err}`));
  process.exit(1);
}
console.log('  ✅ All checks passed');

// Apply changes if not dry-run
if (!opts.dryRun) {
  console.log('\n✏️  Applying CalVer versions...');

  // Update package versions
  Object.entries(updates).forEach(([pkgName, update]) => {
    const pkgPath = getPackagePath(pkgName);
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    pkg.version = update.to;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`  Updated ${pkgName} to ${update.to}`);
  });

  // Update dependencies
  console.log('\n🔗 Updating internal dependencies...');
  const allPackages = fs
    .readdirSync(path.join(process.cwd(), 'packages'))
    .map((dir) => path.join(process.cwd(), 'packages', dir, 'package.json'))
    .concat(path.join(process.cwd(), 'templates/skeleton/package.json'))
    .filter((p) => fs.existsSync(p));

  allPackages.forEach((pkgPath) => {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    let modified = false;

    ['dependencies', 'devDependencies', 'peerDependencies'].forEach(
      (depType) => {
        if (!pkg[depType]) return;

        Object.keys(updates).forEach((updatedPkg) => {
          if (pkg[depType][updatedPkg]) {
            const oldRange = pkg[depType][updatedPkg];
            const operator = oldRange.match(/^([^\d]*)/)?.[1] || '';
            pkg[depType][updatedPkg] = `${operator}${updates[updatedPkg].to}`;
            modified = true;
          }
        });
      },
    );

    if (modified) {
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
      console.log(
        `  Updated dependencies in ${path.basename(path.dirname(pkgPath))}`,
      );
    }
  });

  console.log('\n✅ CalVer versioning complete!');
} else {
  console.log('\n🧪 DRY RUN COMPLETE - No files were modified');
  console.log('\nTo apply changes, run with --apply flag');
}
