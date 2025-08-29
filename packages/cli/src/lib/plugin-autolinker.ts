/**
 * Plugin Auto-Linker for Hydrogen CLI Monorepo Development
 * =========================================================
 *
 * PURPOSE:
 * This module automatically links the local Hydrogen CLI plugin when working within
 * the Hydrogen monorepo, eliminating the need for manual `shopify plugins link` steps.
 *
 * PROBLEM IT SOLVES:
 * When developing in the Hydrogen monorepo, there are multiple ways to invoke CLI commands:
 * 1. Via npm scripts (e.g., `npm run dev`) - uses node_modules version
 * 2. Via global shopify command (e.g., `shopify hydrogen dev`) - uses linked plugin
 * 3. Via npx (e.g., `npx shopify hydrogen dev`) - uses node_modules version
 *
 * Without auto-linking, developers must manually run `shopify plugins link` to ensure
 * they're using the local development version of the CLI, not the npm-installed version.
 * This leads to confusion when changes to the CLI don't appear to work.
 *
 * HOW IT WORKS:
 * 1. Detects when a command is run inside the Hydrogen monorepo
 * 2. Checks if the plugin is already linked to avoid redundant operations
 * 3. Automatically links the local plugin if needed
 * 4. Caches the link status for the session to minimize overhead
 *
 * SUPPORTED WORKFLOWS:
 * - Example projects: `cd examples/b2b && npm run dev`
 * - External projects with --path: `shopify hydrogen dev --path /path/to/project`
 * - Direct monorepo commands: `shopify hydrogen build`
 *
 * EXCLUDED WORKFLOWS:
 * - Skeleton template itself (to avoid circular issues)
 * - Remote-only commands (login, logout, list, etc.)
 * - Already linked scenarios (idempotent)
 *
 * INTEGRATION:
 * This module is called from the CLI's init hook (hooks/init.ts) which runs
 * before every command, ensuring consistent behavior across all commands.
 *
 * PERFORMANCE:
 * - First check: ~50-100ms overhead for detection and linking
 * - Subsequent checks: <5ms (cached via environment variable)
 * - Can be disabled via HYDROGEN_DISABLE_AUTOLINK=true
 *
 * CI BEHAVIOR:
 * - Auto-linking runs in CI environments (detects monorepo)
 * - If linking fails in CI (common due to permissions), continues anyway
 * - CI uses local built CLI via npm scripts, so linking isn't required
 * - No failure messages shown in CI to avoid confusion
 */

import {execAsync} from './process.js';
import {outputDebug} from '@shopify/cli-kit/node/output';
import {dirname, resolvePath, joinPath} from '@shopify/cli-kit/node/path';
import {existsSync} from 'node:fs';
import {
  isInsideHydrogenMonorepo as checkMonorepo,
  getMonorepoRoot,
} from './build.js';

/**
 * Options for auto-linking functionality
 */
export interface AutoLinkOptions {
  /** The command being executed */
  command?: string;
  /** Command line arguments */
  args?: string[];
  /** Working directory for the command */
  workingDirectory?: string;
  /** Whether to force linking even if already linked */
  force?: boolean;
}

/**
 * Result of plugin status check
 */
export interface PluginStatus {
  /** Whether the plugin is currently linked */
  isLinked: boolean;
  /** Path to the linked plugin if linked */
  linkedPath?: string;
  /** Whether auto-linking has already occurred in this session */
  isAutoLinked?: boolean;
}

/**
 * Result of auto-linking operation
 */
export interface LinkResult {
  /** Whether linking was successful */
  success: boolean;
  /** Error message if linking failed */
  error?: string;
  /** Path to the linked plugin */
  linkedPath?: string;
}

/**
 * Checks if the current process is running inside the Hydrogen monorepo
 * @param directory - The directory to check from (defaults to current working directory)
 * @returns True if inside the Hydrogen monorepo
 */
export function isInsideHydrogenMonorepo(directory?: string): boolean {
  const dir = directory || process.cwd();
  return checkMonorepo(dir);
}

/**
 * Checks if the current directory is an external project (not in monorepo)
 * @param directory - The directory to check
 * @returns True if this is an external project
 */
export function isExternalProject(directory?: string): boolean {
  const dir = directory || process.cwd();

  // An external project is one that:
  // 1. Is NOT inside the monorepo
  // 2. Has a package.json (indicating it's a Node project)
  if (isInsideHydrogenMonorepo(dir)) {
    return false;
  }

  // Check if it has a package.json
  const packageJsonPath = joinPath(dir, 'package.json');
  return existsSync(packageJsonPath);
}

/**
 * Checks if the current directory is an example directory within the monorepo
 * @param directory - The directory to check
 * @returns True if this is an example directory
 */
export function isExampleDirectory(directory?: string): boolean {
  const dir = directory || process.cwd();

  // Must be inside monorepo first
  if (!isInsideHydrogenMonorepo(dir)) {
    return false;
  }

  // Check if the path contains 'examples/' directory
  const monorepoRoot = getMonorepoRoot(dir);
  if (!monorepoRoot) {
    return false;
  }

  // Normalize paths for comparison
  const normalizedDir = resolvePath(dir);
  const examplesPath = resolvePath(joinPath(monorepoRoot, 'examples'));

  // Check if current directory is under examples/
  return normalizedDir.startsWith(examplesPath);
}

/**
 * Checks if the Hydrogen CLI plugin is currently linked
 * @returns Plugin status information
 */
export async function isPluginLinked(): Promise<PluginStatus> {
  // Check if we've already auto-linked in this session
  if (process.env.HYDROGEN_CLI_AUTOLINKED === 'true') {
    return {
      isLinked: true,
      isAutoLinked: true,
    };
  }

  try {
    // Run shopify plugins inspect to check plugin status
    const result = await execAsync(
      'npx shopify plugins inspect @shopify/cli-hydrogen 2>&1',
      {cwd: process.cwd()},
    );

    // Check for the "linked ESM module" warning which indicates it's linked
    const isLinked =
      result.stdout.includes('linked ESM module') ||
      (result.stdout.includes('location') &&
        result.stdout.includes('/packages/cli'));

    if (isLinked) {
      // Extract the location path if available
      const locationMatch = result.stdout.match(/location\s+(.+)/);
      const linkedPath = locationMatch ? locationMatch[1].trim() : undefined;

      return {
        isLinked: true,
        linkedPath,
        isAutoLinked: false,
      };
    }

    return {
      isLinked: false,
      isAutoLinked: false,
    };
  } catch (error) {
    // If the command fails, assume not linked
    outputDebug(`Failed to check plugin status: ${error}`);
    return {
      isLinked: false,
      isAutoLinked: false,
    };
  }
}

/**
 * Links the Hydrogen CLI plugin for monorepo development
 * @param pluginPath - Path to the plugin directory
 * @returns Result of the linking operation
 */
export async function linkPlugin(pluginPath: string): Promise<LinkResult> {
  try {
    outputDebug(`Auto-linking Hydrogen CLI plugin from: ${pluginPath}`);

    // Verify the plugin path exists
    if (!existsSync(pluginPath)) {
      return {
        success: false,
        error: `Plugin path does not exist: ${pluginPath}`,
      };
    }

    // Run the shopify plugins link command
    // Using npx to ensure we use the local shopify CLI
    const command = `npx shopify plugins link ${pluginPath}`;
    outputDebug(`Running: ${command}`);

    const result = await execAsync(command, {
      cwd: process.cwd(),
      // Silent mode - we don't want to show output to users
      stdio: 'pipe',
    });

    // Check if the command was successful
    if (
      result.stdout.includes('Linked') ||
      result.stdout.includes('already linked')
    ) {
      outputDebug('Plugin successfully linked');

      // Set environment variable to cache the linked state
      process.env.HYDROGEN_CLI_AUTOLINKED = 'true';

      return {
        success: true,
        linkedPath: pluginPath,
      };
    }

    // If we get here, linking might have failed silently
    outputDebug(`Link command output: ${result.stdout}`);

    return {
      success: false,
      error: `Unexpected output from link command: ${result.stdout}`,
    };
  } catch (error) {
    // Silent failure - we don't want to break the user's workflow
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputDebug(`Failed to auto-link plugin: ${errorMessage}`);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Commands that should NOT trigger auto-linking
 * These are typically remote commands or commands that don't need local code
 */
const SKIP_COMMANDS = [
  'hydrogen:init',
  'hydrogen:login',
  'hydrogen:logout',
  'hydrogen:list',
  'hydrogen:link',
  'hydrogen:unlink',
  'hydrogen:shortcut',
  'hydrogen:upgrade',
];

/**
 * Determines whether auto-linking should occur for the current command
 * @param options - Options for the auto-link decision
 * @returns True if auto-linking should proceed
 */
export function shouldAutoLink(options: AutoLinkOptions): boolean {
  const {command, workingDirectory, args} = options;

  // Check if auto-linking is disabled
  if (process.env.HYDROGEN_DISABLE_AUTOLINK === 'true') {
    outputDebug('Auto-linking disabled via HYDROGEN_DISABLE_AUTOLINK');
    return false;
  }

  // Skip if command is in the skip list
  if (command && SKIP_COMMANDS.includes(command)) {
    outputDebug(`Skipping auto-link for command: ${command}`);
    return false;
  }

  // Check if we're in the monorepo
  const inMonorepo = isInsideHydrogenMonorepo(workingDirectory);

  // Check if using --path flag (indicates external project)
  const hasPathFlag = args?.includes('--path');

  // Decision matrix:
  // 1. In monorepo (examples, packages) -> auto-link
  // 2. External project with --path flag -> auto-link
  // 3. Running via npm scripts in monorepo -> auto-link
  // 4. Skeleton template itself -> skip (avoid circular issues)

  if (inMonorepo) {
    // Check if we're in the skeleton template itself
    const dir = workingDirectory || process.cwd();
    if (dir.includes('templates/skeleton')) {
      outputDebug('Skipping auto-link for skeleton template');
      return false;
    }

    outputDebug('In monorepo - should auto-link');
    return true;
  }

  // --path flag triggers auto-linking when running from monorepo
  // This enables the workflow: shopify hydrogen dev --path /external/project
  if (hasPathFlag && isInsideHydrogenMonorepo()) {
    // When running from monorepo with --path flag, always auto-link
    const pathIndex = args!.indexOf('--path');
    if (pathIndex !== -1 && pathIndex < args!.length - 1) {
      const targetPath = args![pathIndex + 1];
      outputDebug(
        `--path flag detected, target: ${targetPath} - auto-linking for external project workflow`,
      );
      return true;
    }
  }

  // Check if running via node_modules (npm run scripts)
  if (isRunningViaNodeModules() && inMonorepo) {
    outputDebug('Running via npm script in monorepo - should auto-link');
    return true;
  }

  outputDebug('No auto-link conditions met');
  return false;
}

/**
 * Main orchestrator function that ensures the monorepo plugin is linked
 * @param options - Options for the auto-link operation
 * @returns True if linking was successful or already linked
 */
export async function ensureMonorepoPluginLinked(
  options: AutoLinkOptions = {},
): Promise<boolean> {
  const startTime = Date.now();

  try {
    // Step 1: Check if we should auto-link
    if (!shouldAutoLink(options)) {
      return false;
    }

    // Step 2: Check if already linked
    const status = await isPluginLinked();
    if (status.isLinked) {
      outputDebug(`Plugin already linked at: ${status.linkedPath}`);
      return true;
    }

    // Step 3: Find the plugin path
    const pluginPath = getMonorepoPluginPath(options.workingDirectory);
    if (!pluginPath) {
      outputDebug('Could not locate monorepo plugin path');
      return false;
    }

    // Step 4: Perform the linking
    outputDebug(`Auto-linking plugin from: ${pluginPath}`);
    const linkResult = await linkPlugin(pluginPath);

    if (linkResult.success) {
      const elapsed = Date.now() - startTime;
      outputDebug(`Auto-linking completed successfully in ${elapsed}ms`);

      // Cache the result for this session
      process.env.HYDROGEN_CLI_AUTOLINKED = 'true';

      // Show a subtle message to the user (skip in CI)
      if (process.env.CI !== 'true' && process.env.GITHUB_ACTIONS !== 'true') {
        console.log('🔗 Auto-linked local Hydrogen CLI for development');
      }

      return true;
    } else {
      outputDebug(`Auto-linking failed: ${linkResult.error}`);
      // In CI, this is expected - the local version is used directly
      // Don't treat this as a failure
      if (process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true') {
        outputDebug(
          'Auto-linking failed in CI, but local CLI will be used via npm scripts',
        );
        return true;
      }
      return false;
    }
  } catch (error) {
    // Silent failure - don't break the user's workflow
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputDebug(`Auto-linking error: ${errorMessage}`);
    return false;
  }
}

/**
 * Gets the path to the CLI plugin within the monorepo
 * @param directory - The directory to search from
 * @returns Path to the plugin or undefined if not found
 */
export function getMonorepoPluginPath(directory?: string): string | undefined {
  const dir = directory || process.cwd();
  const monorepoRoot = getMonorepoRoot(dir);

  if (!monorepoRoot) {
    return undefined;
  }

  // The CLI plugin is at packages/cli in the monorepo
  const pluginPath = joinPath(monorepoRoot, 'packages', 'cli');

  // Verify it exists and has a package.json
  const packageJsonPath = joinPath(pluginPath, 'package.json');
  if (existsSync(packageJsonPath)) {
    return pluginPath;
  }

  return undefined;
}

/**
 * Checks if running via npm script (npm run) vs global command (shopify)
 * @returns True if running via npm script
 */
export function isRunningViaNodeModules(): boolean {
  // Check if the process was started from node_modules/.bin
  // This indicates it was run via npm scripts or npx
  const scriptPath = process.argv[1];

  if (!scriptPath) {
    return false;
  }

  // Check if the script path contains node_modules
  // This happens when running via npm scripts or npx
  const isNodeModules = scriptPath.includes('node_modules');

  // Also check npm_lifecycle_event which is set when running npm scripts
  const isNpmScript = !!process.env.npm_lifecycle_event;

  return isNodeModules || isNpmScript;
}
