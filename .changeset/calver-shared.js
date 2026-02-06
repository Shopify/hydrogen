#!/usr/bin/env node

/**
 * Shared CalVer utilities used by all CalVer-related scripts
 * Extracted to avoid code duplication
 */

const fs = require('fs');
const path = require('path');

// Constants
const QUARTERS = [1, 4, 7, 10];
const CALVER_PACKAGES = [
  '@shopify/hydrogen',
  '@shopify/hydrogen-react',
  'skeleton',
];

// Packages whose major bumps trigger cross-package CalVer synchronization.
// skeleton is excluded because its major bumps are independent (template-only).
const CALVER_SYNC_PACKAGES = ['@shopify/hydrogen', '@shopify/hydrogen-react'];

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

  if (bumpType === 'minor' || bumpType === 'patch') {
    // For patch/minor bumps, always increment within same quarter
    // Invalid quarters are only corrected during major bumps
    return `${v.year}.${v.major}.${v.minor + 1}`;
  }
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

// Get the next quarter for a given major version
function getNextQuarter(currentMajor) {
  return QUARTERS.find((q) => q > currentMajor) || QUARTERS[0];
}

// Convert version to branch name format (YYYY-MM)
function versionToBranchName(year, major) {
  return `${year}-${String(major).padStart(2, '0')}`;
}

// Check if there are major changesets for CalVer packages
function hasMajorChangesets() {
  const changesetDir = path.join(process.cwd(), '.changeset');

  try {
    const files = fs.readdirSync(changesetDir);

    for (const file of files) {
      if (!file.endsWith('.md') || file === 'README.md') continue;

      const filePath = path.join(changesetDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Only sync-eligible packages trigger cross-package major bumps
      for (const pkg of CALVER_SYNC_PACKAGES) {
        // Check for both single and double quotes (changesets can use either)
        if (
          content.includes(`"${pkg}": major`) ||
          content.includes(`'${pkg}': major`)
        ) {
          return true;
        }
      }
    }
  } catch (error) {
    // If we can't read changesets, assume no major bump
    return false;
  }

  return false;
}

// Check if there are any changesets for CalVer packages (any bump type)
function hasCalVerChangesets() {
  const changesetDir = path.join(process.cwd(), '.changeset');

  try {
    const files = fs.readdirSync(changesetDir);

    for (const file of files) {
      if (!file.endsWith('.md') || file === 'README.md') continue;

      const filePath = path.join(changesetDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Check for any bumps (patch, minor, major) in CalVer packages
      for (const pkg of CALVER_PACKAGES) {
        // Check for both single and double quotes (changesets can use either)
        if (
          content.includes(`"${pkg}": patch`) ||
          content.includes(`'${pkg}': patch`) ||
          content.includes(`"${pkg}": minor`) ||
          content.includes(`'${pkg}': minor`) ||
          content.includes(`"${pkg}": major`) ||
          content.includes(`'${pkg}': major`)
        ) {
          return true;
        }
      }
    }
  } catch (error) {
    // If we can't read changesets, assume no CalVer changesets
    return false;
  }

  return false;
}

// Validate CalVer updates (used by enforce-calver-local.js)
function validateUpdates(updates) {
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

// Get all package.json paths in the repo
function getAllPackagePaths() {
  const packages = fs
    .readdirSync(path.join(process.cwd(), 'packages'))
    .map((dir) => path.join(process.cwd(), 'packages', dir, 'package.json'))
    .concat(path.join(process.cwd(), 'templates/skeleton/package.json'))
    .filter((p) => fs.existsSync(p));

  return packages;
}

// Update internal dependencies across all packages
function updateInternalDependencies(updates, dryRun = false) {
  const allPackages = getAllPackagePaths();
  const modifiedPackages = [];

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
          }
        });
      },
    );

    if (modified) {
      if (!dryRun) {
        writePackage(pkgPath, pkg);
      }
      modifiedPackages.push(path.basename(path.dirname(pkgPath)));
    }
  });

  return modifiedPackages;
}

// Update CHANGELOG headers after version changes
function updateChangelogs(updates, dryRun = false) {
  const updatedChangelogs = [];

  Object.entries(updates).forEach(([pkgName, update]) => {
    const pkgDir = path.dirname(getPackagePath(pkgName));
    const changelogPath = path.join(pkgDir, 'CHANGELOG.md');

    if (fs.existsSync(changelogPath)) {
      let changelog = fs.readFileSync(changelogPath, 'utf-8');
      // Replace the version header that changesets just created with CalVer version
      const changesetVersionEscaped = (
        update.changesetVersion ||
        update.changeset ||
        update.from
      ).replace(/\./g, '\\.');
      const newChangelog = changelog.replace(
        new RegExp(`^## ${changesetVersionEscaped}$`, 'm'),
        `## ${update.to}`,
      );

      if (newChangelog !== changelog) {
        if (!dryRun) {
          fs.writeFileSync(changelogPath, newChangelog);
        }
        updatedChangelogs.push(pkgName);
      }
    }
  });

  return updatedChangelogs;
}

// CLI interface for bash scripts
if (require.main === module) {
  const [, , command, ...args] = process.argv;

  try {
    switch (command) {
      case 'get-next':
        console.log(getNextVersion(args[0], args[1]));
        break;
      case 'detect-bump':
        console.log(getBumpType(args[0], args[1]));
        break;
      case 'list-calver-packages':
        console.log(CALVER_PACKAGES.join(' '));
        break;
      case 'has-calver-changesets':
        console.log(hasCalVerChangesets());
        break;
      case 'has-major-changesets':
        console.log(hasMajorChangesets());
        break;
      default:
        console.error(`Usage: node calver-shared.js <command> [args]
Commands:
  get-next <version> <bump-type>
  detect-bump <old> <new>
  list-calver-packages
  has-calver-changesets
  has-major-changesets`);
        process.exit(1);
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = {
  QUARTERS,
  CALVER_PACKAGES,
  CALVER_SYNC_PACKAGES,
  parseVersion,
  getNextVersion,
  getBumpType,
  getPackagePath,
  readPackage,
  writePackage,
  getNextQuarter,
  versionToBranchName,
  hasMajorChangesets,
  hasCalVerChangesets,
  validateUpdates,
  getAllPackagePaths,
  updateInternalDependencies,
  updateChangelogs,
};
