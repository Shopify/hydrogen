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

const QUARTERS = [1, 4, 7, 10];
const CALVER_PACKAGES = [
  '@shopify/hydrogen',
  '@shopify/hydrogen-react',
  'skeleton',
];

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
    // Advance to next quarter
    const nextQ = QUARTERS.find((q) => q > v.major) || QUARTERS[0];
    const nextY = nextQ === QUARTERS[0] ? v.year + 1 : v.year;
    return `${nextY}.${nextQ}.0`;
  }

  if (bumpType === 'minor') {
    return `${v.year}.${v.major}.${v.minor + 1}`;
  }

  // Patch
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

// Read package.json
function readPackage(pkgPath) {
  return JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
}

// Write package.json
function writePackage(pkgPath, data) {
  fs.writeFileSync(pkgPath, JSON.stringify(data, null, 2) + '\n');
}

// Main execution
console.log('📅 Starting CalVer versioning for CI release...');

// 1. Save original versions
const originalVersions = {};
CALVER_PACKAGES.forEach((pkgName) => {
  const pkgPath = getPackagePath(pkgName);
  originalVersions[pkgName] = readPackage(pkgPath).version;
  console.log(`  ${pkgName}: ${originalVersions[pkgName]}`);
});

// 2. Run changesets (this modifies package.json files)
console.log('\n🦋 Running changeset version...');
execSync('npx changeset version', {stdio: 'inherit'});

// 3. Transform to CalVer and apply
console.log('\n✏️  Applying CalVer transformations...');
const updates = {};

CALVER_PACKAGES.forEach((pkgName) => {
  const pkgPath = getPackagePath(pkgName);
  const pkg = readPackage(pkgPath);

  // Skip if version unchanged
  if (pkg.version === originalVersions[pkgName]) return;

  const bumpType = getBumpType(originalVersions[pkgName], pkg.version);
  const calverVersion = getNextVersion(originalVersions[pkgName], bumpType);

  // Apply CalVer version
  pkg.version = calverVersion;
  writePackage(pkgPath, pkg);

  updates[pkgName] = {
    from: originalVersions[pkgName],
    to: calverVersion,
    type: bumpType,
  };

  console.log(
    `  ${pkgName}: ${originalVersions[pkgName]} → ${calverVersion} (${bumpType})`,
  );
});

// 4. Update internal dependencies
if (Object.keys(updates).length > 0) {
  console.log('\n🔗 Updating internal dependencies...');

  const allPackages = fs
    .readdirSync(path.join(process.cwd(), 'packages'))
    .map((dir) => path.join(process.cwd(), 'packages', dir, 'package.json'))
    .concat(path.join(process.cwd(), 'templates/skeleton/package.json'))
    .filter((p) => fs.existsSync(p));

  allPackages.forEach((pkgPath) => {
    const pkg = readPackage(pkgPath);
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
            console.log(
              `  Updated ${updatedPkg} in ${path.basename(path.dirname(pkgPath))}`,
            );
          }
        });
      },
    );

    if (modified) {
      writePackage(pkgPath, pkg);
    }
  });
}

// 5. Update CHANGELOG headers
console.log('\n📝 Updating CHANGELOG headers...');
Object.entries(updates).forEach(([pkgName, update]) => {
  const pkgDir = path.dirname(getPackagePath(pkgName));
  const changelogPath = path.join(pkgDir, 'CHANGELOG.md');

  if (fs.existsSync(changelogPath)) {
    let changelog = fs.readFileSync(changelogPath, 'utf-8');
    // Replace the changeset version with CalVer version in headers
    const changesetVersion = update.from.replace(/\./g, '\\.');
    changelog = changelog.replace(
      new RegExp(`## ${changesetVersion}\\b`, 'g'),
      `## ${update.to}`,
    );
    fs.writeFileSync(changelogPath, changelog);
    console.log(`  Updated CHANGELOG for ${pkgName}`);
  }
});

console.log('\n✅ CalVer versioning complete!');
