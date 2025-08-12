#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');

const QUARTERLY_MONTHS = [1, 4, 7, 10];

function isValidCalverFormat(version) {
  if (typeof version !== 'string') return false;
  const match = version.match(/^(\d{4})\.(\d+)\.(\d+)(?:\.(\d+))?$/);
  if (!match) return false;
  const major = parseInt(match[2], 10);
  return major >= 1 && major <= 12;
}

function compareVersions(a, b) {
  try {
    const vA = parseVersion(a);
    const vB = parseVersion(b);
    
    if (vA.year !== vB.year) return vA.year - vB.year;
    if (vA.major !== vB.major) return vA.major - vB.major;
    if (vA.minor !== vB.minor) return vA.minor - vB.minor;
    
    const patchA = vA.patch || 0;
    const patchB = vB.patch || 0;
    return patchA - patchB;
  } catch {
    return 0;
  }
}

function hasVersionRegression(oldVersion, newVersion) {
  return compareVersions(newVersion, oldVersion) < 0;
}

function isValidQuarter(major) {
  return QUARTERLY_MONTHS.includes(major);
}

function hasQuarterMismatch(version, bumpType) {
  if (bumpType !== 'major') return false;
  try {
    const parsed = parseVersion(version);
    return !isValidQuarter(parsed.major);
  } catch {
    return false;
  }
}

function runInternalValidations(versionUpdates) {
  const errors = [];
  
  for (const [pkgName, update] of Object.entries(versionUpdates)) {
    // Check for version format
    if (!isValidCalverFormat(update.calver)) {
      errors.push(`Invalid CalVer format for ${pkgName}: ${update.calver}`);
    }
    
    // Check for version regression
    if (hasVersionRegression(update.original, update.calver)) {
      errors.push(`Version regression detected for ${pkgName}: ${update.original} → ${update.calver}`);
    }
    
    // Check quarter alignment for major bumps
    if (update.bumpType === 'major' && hasQuarterMismatch(update.calver, 'major')) {
      errors.push(`Quarter misalignment for ${pkgName}: ${update.calver} should be on quarter (1,4,7,10)`);
    }
  }
  
  return {
    success: errors.length === 0,
    errors
  };
}

const CALVER_PACKAGES = [
  {name: '@shopify/hydrogen', path: 'packages/hydrogen/package.json'},
  {name: '@shopify/hydrogen-react', path: 'packages/hydrogen-react/package.json'},
  {name: 'skeleton', path: 'templates/skeleton/package.json'},
];

const ALL_PACKAGES = [
  'packages/hydrogen/package.json',
  'packages/hydrogen-react/package.json',
  'packages/cli-hydrogen/package.json',
  'packages/create-hydrogen/package.json',
  'packages/mini-oxygen/package.json',
  'packages/remix-oxygen/package.json',
  'packages/hydrogen-codegen/package.json',
  'templates/skeleton/package.json',
];

const DEP_TYPES = ['dependencies', 'devDependencies', 'peerDependencies'];

function parseVersion(version) {
  const match = version.match(/^(\d{4})\.(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!match) {
    throw new Error(`Invalid version format: ${version}`);
  }

  return {
    year: parseInt(match[1], 10),
    major: parseInt(match[2], 10),
    minor: parseInt(match[3], 10),
    patch: match[4] ? parseInt(match[4], 10) : undefined,
  };
}

function formatVersion(year, major, minor, patch) {
  const base = `${year}.${major}.${minor}`;
  return patch !== undefined ? `${base}.${patch}` : base;
}

function getNextQuarter(currentMajor, currentYear) {
  if (currentMajor < 1) return {quarter: 1, year: currentYear};
  if (currentMajor < 4) return {quarter: 4, year: currentYear};
  if (currentMajor < 7) return {quarter: 7, year: currentYear};
  if (currentMajor < 10) return {quarter: 10, year: currentYear};
  return {quarter: 1, year: currentYear + 1};
}

function calculateMajorVersion(currentVersion) {
  const parsed = parseVersion(currentVersion);
  const next = getNextQuarter(parsed.major, parsed.year);
  return formatVersion(next.year, next.quarter, 0);
}

function calculateMinorVersion(currentVersion) {
  const parsed = parseVersion(currentVersion);
  return formatVersion(parsed.year, parsed.major, parsed.minor + 1);
}

function calculatePatchVersion(currentVersion) {
  const parsed = parseVersion(currentVersion);
  const nextPatch = parsed.patch !== undefined ? parsed.patch + 1 : 1;
  return formatVersion(parsed.year, parsed.major, parsed.minor, nextPatch);
}

function getNextQuarterlyVersion(currentVersion, bumpType) {
  switch (bumpType) {
    case 'major':
      return calculateMajorVersion(currentVersion);
    case 'minor':
      return calculateMinorVersion(currentVersion);
    case 'patch':
      return calculatePatchVersion(currentVersion);
    default:
      throw new Error(`Unknown bump type: ${bumpType}`);
  }
}

function determineBumpType(oldVersion, newVersion) {
  const oldParsed = parseVersion(oldVersion);
  const newParsed = parseVersion(newVersion);

  if (oldParsed.year !== newParsed.year || oldParsed.major !== newParsed.major) {
    return 'major';
  }
  if (oldParsed.minor !== newParsed.minor) {
    return 'minor';
  }
  return 'patch';
}

function readPackageJson(packagePath) {
  const content = fs.readFileSync(packagePath, 'utf-8');
  return JSON.parse(content);
}

function writePackageJson(packagePath, data) {
  fs.writeFileSync(packagePath, JSON.stringify(data, null, 2) + '\n');
}

function resolvePackagePath(relativePath) {
  return path.join(process.cwd(), relativePath);
}

function getCalverPackages() {
  return CALVER_PACKAGES.map((pkg) => ({
    ...pkg,
    fullPath: resolvePackagePath(pkg.path),
  }));
}

function extractRangeOperator(versionRange) {
  const match = versionRange.match(/^([^\d]*)/);
  return match ? match[1] : '';
}

function buildVersionRange(operator, version) {
  return `${operator}${version}`;
}

// Original version reading is now handled inline in main()

function runChangesetVersion(isDryRun) {
  if (isDryRun) {
    console.log('  [DRY RUN] Would run: npx changeset version');
    return;
  }
  execSync('npx changeset version', {stdio: 'inherit'});
}

function calculateVersionUpdates(packages, originalVersions) {
  const updates = {};

  for (const pkg of packages) {
    try {
      const packageJson = readPackageJson(pkg.fullPath);
      const newVersion = packageJson.version;
      const originalVersion = originalVersions[pkg.name];

      if (!originalVersion || newVersion === originalVersion) {
        continue;
      }

      const bumpType = determineBumpType(originalVersion, newVersion);
      const calverVersion = getNextQuarterlyVersion(originalVersion, bumpType);

      updates[pkg.name] = {
        original: originalVersion,
        changeset: newVersion,
        calver: calverVersion,
        bumpType,
      };
    } catch {
      console.warn(`  Warning: Could not process ${pkg.name}`);
    }
  }

  return updates;
}

function applyVersionUpdate(packagePath, version, isDryRun) {
  const packageJson = readPackageJson(packagePath);
  const oldVersion = packageJson.version;
  packageJson.version = version;

  if (!isDryRun) {
    writePackageJson(packagePath, packageJson);
  }

  return oldVersion;
}

function updatePackageVersion(pkg, update, isDryRun) {
  try {
    const oldVersion = applyVersionUpdate(pkg.fullPath, update.calver, isDryRun);
    const action = isDryRun ? '[DRY RUN] Would update' : 'Updated';
    console.log(`  ${action} ${pkg.name}: ${oldVersion} → ${update.calver}`);
  } catch {
    console.warn(`  Warning: Could not update ${pkg.name}`);
  }
}

function updateDependencyVersion(packageJson, depType, depName, newVersion, isDryRun) {
  if (!packageJson[depType]?.[depName]) {
    return false;
  }

  const oldRange = packageJson[depType][depName];
  const operator = extractRangeOperator(oldRange);
  const newRange = buildVersionRange(operator, newVersion);

  if (!isDryRun) {
    packageJson[depType][depName] = newRange;
  }

  return {oldRange, newRange};
}

function updateInternalDependencies(versionUpdates, isDryRun) {
  for (const pkgPath of ALL_PACKAGES) {
    const fullPath = resolvePackagePath(pkgPath);

    try {
      const packageJson = readPackageJson(fullPath);
      let hasUpdates = false;

      for (const depType of DEP_TYPES) {
        for (const [depName, update] of Object.entries(versionUpdates)) {
          const result = updateDependencyVersion(
            packageJson,
            depType,
            depName,
            update.calver,
            isDryRun,
          );

          if (result) {
            const action = isDryRun ? '[DRY RUN] Would update' : 'Updated';
            console.log(
              `  ${action} ${depName} in ${path.basename(pkgPath)} ${depType}: ${result.oldRange} → ${result.newRange}`,
            );
            hasUpdates = true;
          }
        }
      }

      if (hasUpdates && !isDryRun) {
        writePackageJson(fullPath, packageJson);
      }
    } catch {
      // Package might not exist, that's okay
    }
  }
}

function updateChangelog(pkg, versionUpdate, isDryRun) {
  const changelogPath = path.join(path.dirname(pkg.fullPath), 'CHANGELOG.md');

  try {
    if (!fs.existsSync(changelogPath)) {
      return false;
    }

    const changelog = fs.readFileSync(changelogPath, 'utf-8');
    const escapedVersion = versionUpdate.changeset.replace(/\./g, '\\.');
    const pattern = new RegExp(`## ${escapedVersion}`, 'g');
    const updatedChangelog = changelog.replace(pattern, `## ${versionUpdate.calver}`);

    if (changelog === updatedChangelog) {
      return false;
    }

    if (!isDryRun) {
      fs.writeFileSync(changelogPath, updatedChangelog);
    }

    const action = isDryRun ? '[DRY RUN] Would update' : 'Updated';
    console.log(`  ${action} CHANGELOG for ${pkg.name}`);
    return true;
  } catch {
    console.warn(`  Warning: Could not update CHANGELOG for ${pkg.name}`);
    return false;
  }
}

function parseCliArgs() {
  return {
    isDryRun: process.argv.includes('--dry-run'),
    skipChangesets: process.argv.includes('--skip-changesets'),
  };
}

function logVersionUpdate(packageName, update) {
  console.log(`  ${packageName}:`);
  console.log(`    Changeset: ${update.original} → ${update.changeset} (${update.bumpType})`);
  console.log(`    CalVer:    ${update.original} → ${update.calver}`);
}

function logFinalVersions(packages, versionUpdates) {
  console.log('\n✅ CalVer versioning complete!');
  console.log('\nFinal versions:');
  for (const pkg of packages) {
    if (versionUpdates[pkg.name]) {
      console.log(`  ${pkg.name}: ${versionUpdates[pkg.name].calver}`);
    }
  }
}

async function main() {
  const {isDryRun, skipChangesets} = parseCliArgs();
  
  // Force dry-run in local environment unless --force is used
  const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  const forceLocal = process.argv.includes('--force');
  const effectiveDryRun = isDryRun || (!isCI && !forceLocal);

  if (effectiveDryRun) {
    console.log('🧪 DRY RUN MODE - No files will be modified');
    if (!isCI && !forceLocal) {
      console.log('   (Use --force to modify files locally)');
    }
  }

  console.log('📅 Starting CalVer versioning process...');

  const packages = getCalverPackages();

  // Save original versions BEFORE running changeset
  console.log('\n📦 Saving original versions (before changeset)...');
  const originalVersions = {};
  for (const pkg of packages) {
    try {
      const packageJson = readPackageJson(pkg.fullPath);
      originalVersions[pkg.name] = packageJson.version;
      console.log(`  ${pkg.name}: ${packageJson.version}`);
    } catch {
      console.warn(`  Warning: Could not read ${pkg.name} at ${pkg.fullPath}`);
    }
  }

  if (!skipChangesets) {
    console.log('\n🦋 Running changeset version...');
    try {
      runChangesetVersion(effectiveDryRun);
    } catch (error) {
      console.error('Failed to run changeset version:', error);
      process.exit(1);
    }
  } else {
    console.log('\n⏭️  Skipping changeset version (--skip-changesets flag)');
  }

  console.log('\n🔄 Calculating version adjustments...');
  const versionUpdates = calculateVersionUpdates(packages, originalVersions);

  if (Object.keys(versionUpdates).length === 0) {
    console.log('✅ No version changes detected.');
    return;
  }

  for (const [packageName, update] of Object.entries(versionUpdates)) {
    logVersionUpdate(packageName, update);
  }

  // Run safeguard validations
  console.log('\n🛡️  Running safety checks...');
  // Use internal validations
  const validation = runInternalValidations(versionUpdates);
  
  if (!validation.success) {
    console.error('\n❌ SAFETY CHECK FAILED:');
    validation.errors.forEach(error => console.error(`   🚨 ${error}`));
    console.error('\n⛔ Aborting to prevent publishing incorrect versions');
    process.exit(1);
  }
  
  console.log('  ✅ All safety checks passed');
  console.log('\n✏️  Applying CalVer versions...');
  for (const pkg of packages) {
    if (versionUpdates[pkg.name]) {
      updatePackageVersion(pkg, versionUpdates[pkg.name], effectiveDryRun);
    }
  }

  console.log('\n🔗 Updating internal dependencies...');
  updateInternalDependencies(versionUpdates, effectiveDryRun);

  console.log('\n📝 Updating CHANGELOG files...');
  for (const pkg of packages) {
    if (versionUpdates[pkg.name]) {
      updateChangelog(pkg, versionUpdates[pkg.name], effectiveDryRun);
    }
  }

  if (effectiveDryRun) {
    console.log('\n🧪 DRY RUN COMPLETE - No files were modified');
  } else {
    logFinalVersions(packages, versionUpdates);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseVersion,
    formatVersion,
    getNextQuarter,
    calculateMajorVersion,
    calculateMinorVersion,
    calculatePatchVersion,
    getNextQuarterlyVersion,
    determineBumpType,
    extractRangeOperator,
    buildVersionRange,
    calculateVersionUpdates,
    updateDependencyVersion,
    getCalverPackages,
    readPackageJson,
    isValidCalverFormat,
    compareVersions,
    hasVersionRegression,
    isValidQuarter,
    hasQuarterMismatch,
    QUARTERLY_MONTHS,
  };
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
}