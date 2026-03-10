import {execSync} from 'child_process';
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import {REPO_ROOT} from './constants';

/**
 * Builds a map of package name → version for all workspace packages.
 */
let _workspaceVersions: Map<string, string> | null = null;

/** @internal Reset cached workspace versions (for testing) */
export function _resetWorkspaceVersionsCache(): void {
  _workspaceVersions = null;
}

function getWorkspaceVersions(): Map<string, string> {
  if (_workspaceVersions) return _workspaceVersions;
  _workspaceVersions = new Map();

  const workspacePath = path.join(REPO_ROOT, 'pnpm-workspace.yaml');
  if (!fs.existsSync(workspacePath)) return _workspaceVersions;

  const workspaceContent = fs.readFileSync(workspacePath, 'utf-8');
  const workspace = YAML.parse(workspaceContent);
  const packages: string[] = workspace?.packages ?? [];

  for (const pattern of packages) {
    const pkgJsonPath = path.join(REPO_ROOT, pattern, 'package.json');
    if (fs.existsSync(pkgJsonPath)) {
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
      if (pkgJson.name && pkgJson.version) {
        _workspaceVersions.set(pkgJson.name, pkgJson.version);
      }
    }
  }

  return _workspaceVersions;
}

/**
 * Resolves a workspace: version by looking up the package's version
 * from its package.json in the monorepo. Preserves range prefixes
 * (workspace:^ → ^version, workspace:~ → ~version, workspace:* → version).
 */
function resolveWorkspaceVersion(
  packageName: string,
  protocol: string,
): string | null {
  const version = getWorkspaceVersions().get(packageName) ?? null;
  if (!version) return null;

  // workspace:^ → ^version, workspace:~ → ~version, workspace:* → version
  const suffix = protocol.slice('workspace:'.length);
  if (suffix === '^') return `^${version}`;
  if (suffix === '~') return `~${version}`;
  return version;
}

/**
 * Resolves `catalog:` and `workspace:` protocol references in all workspace
 * package.json files by looking up versions from pnpm-workspace.yaml catalog
 * and workspace package versions respectively.
 * This is needed because `npm install` doesn't understand these protocols.
 *
 * Returns the list of package.json file paths that were modified.
 */
export function resolveCatalogProtocol(): string[] {
  const workspacePath = path.join(REPO_ROOT, 'pnpm-workspace.yaml');
  if (!fs.existsSync(workspacePath)) return [];

  const workspaceContent = fs.readFileSync(workspacePath, 'utf-8');
  const workspace = YAML.parse(workspaceContent);
  const catalog = workspace?.catalog;
  if (!catalog) return [];

  // Resolve in all workspace package.json files since npm traverses the workspace
  const workspacePkgPaths: string[] = [path.join(REPO_ROOT, 'package.json')];
  const workspacePackages: string[] = workspace?.packages ?? [];
  for (const pattern of workspacePackages) {
    const pkgJsonPath = path.join(REPO_ROOT, pattern, 'package.json');
    if (fs.existsSync(pkgJsonPath)) {
      workspacePkgPaths.push(pkgJsonPath);
    }
  }

  let totalResolved = 0;
  const modifiedPaths: string[] = [];

  for (const pkgJsonPath of workspacePkgPaths) {
    if (!fs.existsSync(pkgJsonPath)) continue;

    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
    let resolved = 0;

    for (const depType of [
      'dependencies',
      'devDependencies',
      'peerDependencies',
    ]) {
      const deps = pkgJson[depType];
      if (!deps) continue;

      for (const [name, version] of Object.entries(deps)) {
        if (version === 'catalog:' || version === 'catalog:default') {
          if (catalog[name]) {
            deps[name] = catalog[name];
            resolved++;
          } else {
            console.warn(
              `  Warning: catalog entry '${name}' not found in pnpm-workspace.yaml`,
            );
          }
        } else if (
          typeof version === 'string' &&
          version.startsWith('workspace:')
        ) {
          const workspaceVersion = resolveWorkspaceVersion(
            name,
            version as string,
          );
          if (workspaceVersion) {
            deps[name] = workspaceVersion;
            resolved++;
          }
        }
      }
    }

    if (resolved > 0) {
      fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n');
      modifiedPaths.push(pkgJsonPath);
      totalResolved += resolved;
    }
  }

  if (totalResolved > 0) {
    console.log(`  Resolved ${totalResolved} catalog:/workspace: references`);
  }

  return modifiedPaths;
}

/**
 * Restores the given package.json files to their git HEAD state.
 */
function restorePackageJsonFiles(paths: string[]): void {
  if (paths.length === 0) return;
  try {
    // Use -- separator and pass each path as a separate argument via
    // a safe approach that avoids shell injection from file paths.
    const relativePaths = paths.map((p) => path.relative(REPO_ROOT, p));
    execSync(
      `git checkout -- ${relativePaths.map((p) => `'${p}'`).join(' ')}`,
      {
        cwd: REPO_ROOT,
        stdio: 'pipe',
      },
    );
  } catch {
    // Ignore if files were not modified or already restored
  }
}

/**
 * Executes the given function with catalog: and workspace: protocols resolved
 * in all workspace package.json files, then restores them afterward.
 * This ensures callers don't need to manually manage resolve/cleanup lifecycle.
 * Supports both sync and async functions.
 */
export function withResolvedCatalog<T>(fn: () => T): T {
  console.log('- 🔄 Resolving catalog: and workspace: protocol references…');
  const modifiedPaths = resolveCatalogProtocol();
  try {
    const result = fn();
    // Handle async functions: attach cleanup to the promise chain
    if (result instanceof Promise) {
      return result.finally(() =>
        restorePackageJsonFiles(modifiedPaths),
      ) as unknown as T;
    }
    restorePackageJsonFiles(modifiedPaths);
    return result;
  } catch (error) {
    restorePackageJsonFiles(modifiedPaths);
    throw error;
  }
}
