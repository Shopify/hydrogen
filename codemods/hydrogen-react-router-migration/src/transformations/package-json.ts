import fs from 'fs';
import path from 'path';

export interface PackageJsonUpdate {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  removeDependencies?: string[];
  removeDevDependencies?: string[];
}

export interface PackageJsonResult {
  updated: boolean;
  changes: string[];
}

const DEPENDENCIES_TO_ADD: PackageJsonUpdate = {
  dependencies: {
    'react-router': '^7.8.0',
  },
  removeDependencies: [
    '@remix-run/react',
    '@remix-run/node',
    '@remix-run/server-runtime',
    '@remix-run/dev',
  ],
  removeDevDependencies: [
    '@remix-run/dev',
    '@remix-run/eslint-config',
  ],
};

export function updatePackageJson(projectRoot: string): PackageJsonResult {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  const changes: string[] = [];
  
  if (!fs.existsSync(packageJsonPath)) {
    return { updated: false, changes: ['package.json not found'] };
  }

  try {
    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    // Add new dependencies
    if (DEPENDENCIES_TO_ADD.dependencies) {
      if (!packageJson.dependencies) {
        packageJson.dependencies = {};
      }

      for (const [pkg, version] of Object.entries(DEPENDENCIES_TO_ADD.dependencies)) {
        if (!packageJson.dependencies[pkg]) {
          packageJson.dependencies[pkg] = version;
          changes.push(`Added dependency: ${pkg}@${version}`);
        } else {
          // Check if we need to update the version
          const currentVersion = packageJson.dependencies[pkg];
          if (shouldUpdateVersion(currentVersion, version)) {
            packageJson.dependencies[pkg] = version;
            changes.push(`Updated dependency: ${pkg} from ${currentVersion} to ${version}`);
          }
        }
      }
    }

    // Add new devDependencies
    if (DEPENDENCIES_TO_ADD.devDependencies) {
      if (!packageJson.devDependencies) {
        packageJson.devDependencies = {};
      }

      for (const [pkg, version] of Object.entries(DEPENDENCIES_TO_ADD.devDependencies)) {
        if (!packageJson.devDependencies[pkg]) {
          packageJson.devDependencies[pkg] = version;
          changes.push(`Added devDependency: ${pkg}@${version}`);
        }
      }
    }

    // Remove obsolete dependencies
    if (DEPENDENCIES_TO_ADD.removeDependencies) {
      for (const pkg of DEPENDENCIES_TO_ADD.removeDependencies) {
        if (packageJson.dependencies?.[pkg]) {
          delete packageJson.dependencies[pkg];
          changes.push(`Removed dependency: ${pkg}`);
        }
      }
    }

    // Remove obsolete devDependencies
    if (DEPENDENCIES_TO_ADD.removeDevDependencies) {
      for (const pkg of DEPENDENCIES_TO_ADD.removeDevDependencies) {
        if (packageJson.devDependencies?.[pkg]) {
          delete packageJson.devDependencies[pkg];
          changes.push(`Removed devDependency: ${pkg}`);
        }
      }
    }

    if (changes.length > 0) {
      // Sort dependencies alphabetically
      if (packageJson.dependencies) {
        packageJson.dependencies = sortObject(packageJson.dependencies);
      }
      if (packageJson.devDependencies) {
        packageJson.devDependencies = sortObject(packageJson.devDependencies);
      }

      // Write back to file
      fs.writeFileSync(
        packageJsonPath,
        JSON.stringify(packageJson, null, 2) + '\n',
        'utf-8'
      );

      return { updated: true, changes };
    }

    return { updated: false, changes: ['No changes needed'] };
  } catch (error) {
    return { 
      updated: false, 
      changes: [`Error updating package.json: ${error instanceof Error ? error.message : 'Unknown error'}`] 
    };
  }
}

function shouldUpdateVersion(current: string, target: string): boolean {
  // Simple version comparison - in production, use semver library
  // For now, only update if current is an older major version
  const currentMajor = extractMajorVersion(current);
  const targetMajor = extractMajorVersion(target);
  
  if (currentMajor === null || targetMajor === null) {
    return false;
  }
  
  return targetMajor > currentMajor;
}

function extractMajorVersion(version: string): number | null {
  // Remove prefix characters like ^, ~, >=, etc.
  const cleanVersion = version.replace(/^[\^~>=<*]+/, '');
  const parts = cleanVersion.split('.');
  const major = parseInt(parts[0], 10);
  return isNaN(major) ? null : major;
}

function sortObject<T extends Record<string, unknown>>(obj: T): T {
  const sorted = {} as T;
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    sorted[key as keyof T] = obj[key as keyof T];
  }
  return sorted;
}

export function getPackageJsonPath(projectRoot: string): string {
  return path.join(projectRoot, 'package.json');
}

export function hasReactRouter(projectRoot: string): boolean {
  const packageJsonPath = getPackageJsonPath(projectRoot);
  
  if (!fs.existsSync(packageJsonPath)) {
    return false;
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    return !!(
      packageJson.dependencies?.['react-router'] ||
      packageJson.devDependencies?.['react-router']
    );
  } catch {
    return false;
  }
}

export function hasRemixDependencies(projectRoot: string): boolean {
  const packageJsonPath = getPackageJsonPath(projectRoot);
  
  if (!fs.existsSync(packageJsonPath)) {
    return false;
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    return Object.keys(allDeps).some(dep => dep.startsWith('@remix-run/'));
  } catch {
    return false;
  }
}