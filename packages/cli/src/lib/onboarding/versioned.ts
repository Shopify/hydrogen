import {tmpdir} from 'node:os';
import {mkdtemp} from 'node:fs/promises';
import {readFile} from 'node:fs/promises';
import {joinPath} from '@shopify/cli-kit/node/path';
import {AbortError} from '@shopify/cli-kit/node/error';
import {AbortController} from '@shopify/cli-kit/node/abort';
import {fileExists, copyFile, rmdir, writeFile} from '@shopify/cli-kit/node/fs';
import {outputInfo} from '@shopify/cli-kit/node/output';
import {renderTasks, renderSelectPrompt} from '@shopify/cli-kit/node/ui';
import {fetch} from '@shopify/cli-kit/node/http';
import {pipeline} from 'node:stream/promises';
import {extract} from 'tar-fs';
import gunzipMaybe from 'gunzip-maybe';
import type {InitOptions, SetupSummary} from './common.js';
import type {CliCommand} from '../shell.js';
import {
  handleProjectLocation,
  createAbortHandler,
  handleLanguage,
  handleCssStrategy,
  handleI18n,
  handleRouteGeneration,
  handleDependencies,
  handleCliShortcut,
  createInitialCommit,
  commitAll,
  renderProjectReady,
  handleStorefrontLink,
} from './common.js';
import {findCommitForHydrogenVersion} from '../version-finder.js';
import {getCliCommand} from '../shell.js';
import {setStorefront, setUserAccount} from '../shopify-config.js';

/**
 * Setup a Hydrogen project from a specific version
 */
export async function setupVersionedTemplate(
  options: InitOptions,
  controller: AbortController,
) {
  const version = options.version!;

  outputInfo(
    `Creating Hydrogen ${version} project\nThis will fetch the exact skeleton template from that version.`,
  );

  // Validate version format - only quarterly releases (1, 4, 7, 10)
  const versionPattern = /^\d{4}\.(1|4|7|10)\.(0|[1-9]\d*)$/;
  if (!versionPattern.test(version)) {
    throw new AbortError(
      `Invalid version format: ${version}`,
      'Expected format: YYYY.MM.P where MM is 1, 4, 7, or 10 (quarterly releases)',
    );
  }

  // Get commit for version from git history
  let commit: string | undefined;
  try {
    commit = await findCommitForHydrogenVersion(version);
  } catch (error) {
    // Re-throw AbortError as is (includes rate limit errors with proper messaging)
    if (error instanceof AbortError) {
      throw error;
    }
    // For unexpected errors
    throw new AbortError(
      `Failed to fetch version ${version} from GitHub.`,
      `Please check your network connection and try again.`,
    );
  }

  if (!commit) {
    throw new AbortError(
      `Version ${version} not found.`,
      `Please check https://github.com/Shopify/hydrogen/releases for available versions.`,
    );
  }

  // Set up project location
  const project = await handleProjectLocation({
    ...options,
    controller,
  });

  if (!project) return;

  const abort = createAbortHandler(controller, project);

  // Handle mock shop vs storefront link
  const templateAction = options.mockShop
    ? 'mock'
    : await renderSelectPrompt<'mock' | 'link'>({
        message: 'Connect to Shopify',
        choices: [
          {
            label: 'Mock.shop (Development only)',
            value: 'mock',
          },
          {
            label: 'Link your Shopify account',
            value: 'link',
          },
        ],
        defaultValue: 'mock',
        abortSignal: controller.signal,
      });

  const storefrontInfo =
    templateAction === 'link'
      ? await handleStorefrontLink(controller)
      : undefined;

  let tempDir: string | undefined;

  try {
    // Background tasks
    let backgroundPromise: Promise<void> = Promise.resolve();
    let backgroundError: Error | null = null;

    const tasks = [
      {
        title: `Fetching Hydrogen ${version}`,
        task: async () => {
          tempDir = await fetchVersionedSkeleton(
            version,
            commit,
            controller.signal as AbortSignal,
          );
          const skeletonPath = joinPath(tempDir, 'skeleton');

          if (!(await fileExists(skeletonPath))) {
            throw new AbortError(
              `Skeleton not found for version ${version}`,
              'The template structure may have been different in this version.',
            );
          }

          // Copy skeleton to project directory
          // Handle errors to prevent unhandled rejection
          backgroundPromise = copyFile(skeletonPath, project.directory).catch(
            (error) => {
              backgroundError = error;
              // Return void to match Promise<void> type
            },
          );
        },
      },
      {
        title: 'Setting up project',
        task: async () => {
          await backgroundPromise;

          // If there was an error, throw it now
          if (backgroundError) {
            throw backgroundError;
          }

          // Pin dependencies to exact versions from package-lock.json at this commit
          await pinDependenciesToLockfile(
            project.directory,
            commit,
            controller.signal as AbortSignal,
          );
        },
      },
    ];

    await renderTasks(tasks);

    // Apply customizations (language, styling, etc.)
    const {language, transpileProject} = await handleLanguage(
      project.directory,
      controller,
      options.language,
    );

    const cssResult = await handleCssStrategy(
      project.directory,
      controller,
      options.styling,
    );

    // Handle dependencies first to get package manager
    const {packageManager, shouldInstallDeps, installDeps} =
      await handleDependencies(
        project.directory,
        controller,
        options.packageManager,
        options.installDeps,
      );

    const cliCommand = await getCliCommand('', packageManager);

    const i18n = await handleI18n(controller, cliCommand, options.i18n);

    const {needsRouteGeneration, setupRoutes} = await handleRouteGeneration(
      controller,
      options.routes,
    );

    // Generate route files if requested
    let routes: Record<string, string[]> | undefined;
    if (needsRouteGeneration && setupRoutes) {
      routes = await setupRoutes(project.directory, language, {
        i18nStrategy: i18n.i18nStrategy,
        overwriteFileDeps: false,
      });
    }

    const envLeadingComment =
      '# The variables added in this file are only available locally in MiniOxygen.\n' +
      `# Run \`${cliCommand} link\` to also inject environment variables from your storefront,\n` +
      `# or \`${cliCommand} env pull\` to populate this file.`;

    // Save storefront info and create .env file
    if (storefrontInfo) {
      const promises = [
        setUserAccount(project.directory, storefrontInfo),
        writeFile(joinPath(project.directory, '.env'), envLeadingComment),
      ];

      if (storefrontInfo.id) {
        promises.unshift(
          setStorefront(project.directory, {
            id: storefrontInfo.id,
            title: storefrontInfo.title,
          }),
        );
      }

      await Promise.all(promises);

      if (storefrontInfo.id) {
        outputInfo(
          `\n${storefrontInfo.title} (ID: ${storefrontInfo.id}) is now linked to your project.`,
        );
      }
    } else {
      // Create .env file with SESSION_SECRET for mock shop
      await writeFile(
        joinPath(project.directory, '.env'),
        envLeadingComment +
          '\n' +
          [['SESSION_SECRET', 'foobar']]
            .map(([key, value]) => `${key}="${value}"`)
            .join('\n'),
      );
    }

    // Git setup
    if (options.git) {
      await createInitialCommit(project.directory);
    }

    const setupSummary: SetupSummary = {
      language,
      packageManager,
      cssStrategy: cssResult.cssStrategy,
      i18n: i18n.i18nStrategy,
      depsInstalled: false,
      cliCommand: cliCommand as CliCommand,
      routes,
    };

    if (shouldInstallDeps) {
      const installTask = [
        {
          title: 'Installing dependencies. This could take a few minutes',
          task: async () => {
            try {
              await installDeps();
              setupSummary.depsInstalled = true;
            } catch (error) {
              // Store error but continue
              (setupSummary as any).depsError = error;
            }
          },
        },
      ];

      await renderTasks(installTask);
    }

    // Final git commit
    if (options.git) {
      await commitAll(project.directory, `Scaffold from Hydrogen ${version}`);
    }

    // CLI shortcut
    const shortcut = await handleCliShortcut(
      controller,
      cliCommand,
      options.shortcut,
    );

    await renderProjectReady(project, setupSummary);

    outputInfo(
      `Project created from Hydrogen ${version}\nYour project is using the skeleton from Hydrogen ${version}.\nTo upgrade to the latest version, run: ${cliCommand} upgrade`,
    );

    return {
      ...project,
      ...setupSummary,
      ...shortcut,
      storefrontInfo,
      version,
    };
  } catch (error) {
    abort(error as AbortError);
    throw error;
  } finally {
    // Cleanup temp directory
    if (tempDir) {
      await rmdir(tempDir, {force: true}).catch(() => {});
    }
  }
}

/**
 * Pin dependencies to exact versions from package-lock.json at commit
 */
async function pinDependenciesToLockfile(
  projectDir: string,
  commit: string,
  signal?: AbortSignal,
): Promise<void> {
  try {
    // Fetch package-lock.json from GitHub API
    const lockfileUrl = `https://raw.githubusercontent.com/Shopify/hydrogen/${commit}/package-lock.json`;
    const response = await fetch(lockfileUrl, {signal});

    if (!response.ok) {
      return;
    }

    const lockfileContent = await response.text();

    const lockfile = JSON.parse(lockfileContent);
    const packageJsonPath = joinPath(projectDir, 'package.json');
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));

    // In npm lockfile v3, the actual resolved versions are in node_modules entries
    // Dependencies can be either in skeleton's node_modules or hoisted to root
    const resolvedVersions: Record<string, string> = {};

    // Get skeleton's declared dependencies
    const skeletonPackages = lockfile.packages?.['templates/skeleton'];
    const declaredDeps = {
      ...skeletonPackages?.dependencies,
      ...skeletonPackages?.devDependencies,
    };

    // Extract resolved versions from the lockfile
    if (lockfile.packages && declaredDeps) {
      for (const [pkgName, declaredVersion] of Object.entries(declaredDeps)) {
        // First check skeleton's node_modules
        const skeletonNodeModulesPath = `templates/skeleton/node_modules/${pkgName}`;
        if (lockfile.packages[skeletonNodeModulesPath]?.version) {
          resolvedVersions[pkgName] =
            lockfile.packages[skeletonNodeModulesPath].version;
        }
        // Then check root node_modules (hoisted dependencies)
        else {
          const rootNodeModulesPath = `node_modules/${pkgName}`;
          if (lockfile.packages[rootNodeModulesPath]?.version) {
            resolvedVersions[pkgName] =
              lockfile.packages[rootNodeModulesPath].version;
          }
          // For workspace packages, we need to find the actual workspace version
          else if (typeof declaredVersion === 'string') {
            // Check if this is a workspace package
            // @shopify/remix-oxygen -> packages/remix-oxygen
            // @shopify/hydrogen -> packages/hydrogen
            const packageNameWithoutScope = pkgName.replace('@shopify/', '');
            const workspacePath = `packages/${packageNameWithoutScope}`;
            if (lockfile.packages?.[workspacePath]?.version) {
              // Use the exact workspace version
              resolvedVersions[pkgName] =
                lockfile.packages[workspacePath].version;
            } else if (
              declaredVersion.startsWith('^') ||
              declaredVersion.startsWith('~')
            ) {
              // For external packages with range specifiers, we need to find the actual resolved version
              // Look through all packages to find the resolved version
              for (const [path, pkg] of Object.entries(lockfile.packages)) {
                // Check if this path ends with our package name and has a version
                if (
                  path.endsWith(`/${pkgName}`) &&
                  typeof pkg === 'object' &&
                  pkg !== null &&
                  'version' in pkg &&
                  typeof pkg.version === 'string'
                ) {
                  resolvedVersions[pkgName] = pkg.version;
                  break;
                }
              }
            } else {
              // This is an exact version, use it as-is
              resolvedVersions[pkgName] = declaredVersion;
            }
          }
        }
      }
    }

    // If we couldn't find resolved versions, use original versions
    if (Object.keys(resolvedVersions).length === 0) {
      return;
    }

    // Pin dependencies to exact resolved versions
    if (packageJson.dependencies) {
      for (const [pkg, currentVersion] of Object.entries(
        packageJson.dependencies,
      )) {
        if (resolvedVersions[pkg]) {
          // Use the exact resolved version from lockfile
          packageJson.dependencies[pkg] = resolvedVersions[pkg];
        }
      }
    }

    // Pin devDependencies to exact resolved versions
    if (packageJson.devDependencies) {
      for (const [pkg] of Object.entries(packageJson.devDependencies)) {
        if (resolvedVersions[pkg]) {
          // Use the exact resolved version from lockfile
          packageJson.devDependencies[pkg] = resolvedVersions[pkg];
        }
      }
    }

    // Write updated package.json
    await writeFile(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2) + '\n',
    );
  } catch {
    // If we can't get the lockfile, continue with the original versions
  }
}

/**
 * Fetch skeleton from GitHub for a specific version
 */
async function fetchVersionedSkeleton(
  version: string,
  commit: string,
  signal?: AbortSignal,
): Promise<string> {
  // Create temp directory
  const tempDir = await mkdtemp(joinPath(tmpdir(), 'hydrogen-'));

  try {
    // Try tag-based URL first (for published versions), then fall back to commit-based
    let url = `https://api.github.com/repos/Shopify/hydrogen/tarball/skeleton@${version}`;
    let response = await fetch(url, {signal});

    // If tag doesn't exist, try commit-based URL
    if (!response.ok && response.status === 404) {
      url = `https://github.com/Shopify/hydrogen/archive/${commit}.tar.gz`;
      response = await fetch(url, {signal});
    }

    if (!response.ok) {
      throw new AbortError(
        `Failed to download Hydrogen ${version}`,
        `Status: ${response.status}. Check your connection and try again.`,
      );
    }

    // Extract only the skeleton directory
    await pipeline(
      response.body as any,
      gunzipMaybe(),
      extract(tempDir, {
        map: (header) => {
          // Rename to remove the top-level directory and templates prefix
          const parts = header.name.split('/');
          if (
            parts.length > 1 &&
            parts[1] === 'templates' &&
            parts[2] === 'skeleton'
          ) {
            // Keep only skeleton/* paths
            parts.splice(0, 2); // Remove "hydrogen-commit/templates"
            header.name = parts.join('/');
            return header;
          }
          // Skip non-skeleton files
          header.name = '';
          return header;
        },
        ignore: (name) => !name || !name.includes('skeleton'),
      }),
    );

    return tempDir;
  } catch (error) {
    // Cleanup on error
    await rmdir(tempDir, {force: true}).catch(() => {});
    throw error;
  }
}
