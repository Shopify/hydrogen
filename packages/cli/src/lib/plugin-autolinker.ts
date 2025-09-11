import {appendFileSync, existsSync, readFileSync, writeFileSync} from 'node:fs';
import {join, dirname, resolve, sep, basename} from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {outputContent, outputInfo} from '@shopify/cli-kit/node/output';
import {fileExists} from '@shopify/cli-kit/node/fs';
import {cwd as getCwd} from '@shopify/cli-kit/node/path';
import {isTruthy} from '@shopify/cli-kit/node/context/utilities';

export interface AutoLinkOptions {
  command?: string;
  args?: string[];
  workingDirectory?: string;
}

const SHOPIFY_CLI_LINK_FILE = '.shopify-plugin-links.yml';
const HYDROGEN_PLUGIN_NAME = '@shopify/cli-hydrogen';
const HYDROGEN_ROOT_MARKER = 'package.json'; // Check for root package.json with workspaces
const REQUIRED_FILES = ['package.json'];
const CHECK_TIMEOUT_MS = 3000;
const MONOREPO_ROOT_CACHE = new Map<string, string | null>();
const LINKED_STATUS_CACHE = new Map<string, boolean>();

// No commands are excluded - auto-linking should work for ALL commands
// to ensure developers always use the correct local CLI version
const SKIP_COMMANDS = new Set<string>([]);

export async function ensureMonorepoPluginLinked(
  options: AutoLinkOptions = {},
): Promise<boolean> {
  const startTime = performance.now();

  try {
    if (!shouldAutoLink(options)) {
      return false;
    }

    const cwd = options.workingDirectory ?? getCwd();
    const linkKey = `${cwd}-${options.args?.join('-')}`;

    const cachedStatus = LINKED_STATUS_CACHE.get(linkKey);
    if (cachedStatus !== undefined) {
      return cachedStatus;
    }

    const monorepoRoot = await findMonorepoRoot(cwd);
    if (!monorepoRoot) {
      LINKED_STATUS_CACHE.set(linkKey, false);
      return false;
    }

    const pluginPath = join(monorepoRoot, 'packages', 'cli');
    if (!(await fileExists(join(pluginPath, 'package.json')))) {
      LINKED_STATUS_CACHE.set(linkKey, false);
      return false;
    }

    const projectPath = await getProjectPath(cwd, options.args);
    const isLinked = await isPluginLinked(projectPath, pluginPath);

    if (!isLinked) {
      const linked = await linkPlugin(projectPath, pluginPath);
      LINKED_STATUS_CACHE.set(linkKey, linked);
      return linked;
    }

    LINKED_STATUS_CACHE.set(linkKey, true);
    return true;
  } catch (error) {
    const elapsed = performance.now() - startTime;
    if (elapsed < CHECK_TIMEOUT_MS && process.env.NODE_ENV !== 'test') {
      console.error('[Auto-link] Unexpected error:', error);
    }
    return false;
  }
}

export function shouldAutoLink(options: AutoLinkOptions = {}): boolean {
  if (isTruthy(process.env.HYDROGEN_DISABLE_AUTOLINK)) {
    return false;
  }

  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === 'production' || nodeEnv === 'test') {
    return false;
  }

  if (options.command && SKIP_COMMANDS.has(options.command)) {
    return false;
  }

  return true;
}

export async function findMonorepoRoot(
  startPath: string,
): Promise<string | null> {
  const cachedRoot = MONOREPO_ROOT_CACHE.get(startPath);
  if (cachedRoot !== undefined) {
    return cachedRoot;
  }

  const normalizedStart = resolve(startPath);
  let currentPath = normalizedStart;
  const rootPath = dirname(currentPath).split(sep)[0] + sep;

  while (currentPath !== rootPath) {
    const packageJsonPath = join(currentPath, 'package.json');
    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
        // Check if this is the Hydrogen monorepo root:
        // 1. Has workspaces field (npm/yarn workspaces)
        // 2. Name is "hydrogen"
        // 3. Has packages/cli in workspaces
        if (
          packageJson.workspaces &&
          packageJson.name === 'hydrogen' &&
          packageJson.workspaces.some((ws: string) =>
            ws.includes('packages/cli'),
          )
        ) {
          MONOREPO_ROOT_CACHE.set(startPath, currentPath);
          return currentPath;
        }
      } catch {
        // Invalid package.json, continue searching
      }
    }

    const parent = dirname(currentPath);
    if (parent === currentPath) break;
    currentPath = parent;
  }

  MONOREPO_ROOT_CACHE.set(startPath, null);
  return null;
}

export async function getProjectPath(
  workingDir: string,
  args: string[] = [],
): Promise<string> {
  const pathFlagIndex = args.findIndex((arg) => /^--path($|=)/.test(arg));

  if (pathFlagIndex !== -1) {
    const pathValue = args[pathFlagIndex]?.includes('=')
      ? args[pathFlagIndex]?.split('=')[1]
      : args[pathFlagIndex + 1];

    if (pathValue && !pathValue.startsWith('--')) {
      return resolve(workingDir, pathValue);
    }
  }

  return workingDir;
}

export async function isPluginLinked(
  projectPath: string,
  expectedPluginPath: string,
): Promise<boolean> {
  const linkFile = join(projectPath, SHOPIFY_CLI_LINK_FILE);

  if (!existsSync(linkFile)) {
    return false;
  }

  try {
    const content = readFileSync(linkFile, 'utf8');
    const normalizedExpected = resolve(expectedPluginPath);

    const lines = content.split('\n');
    for (const line of lines) {
      if (line.includes(HYDROGEN_PLUGIN_NAME)) {
        const pathMatch = line.match(/path:\s*['"]?([^'"]+)['"]?/);
        if (pathMatch && pathMatch[1]) {
          const linkedPath = resolve(projectPath, pathMatch[1]);
          return linkedPath === normalizedExpected;
        }
      }
    }

    return false;
  } catch {
    return false;
  }
}

export async function linkPlugin(
  projectPath: string,
  pluginPath: string,
): Promise<boolean> {
  try {
    const absolutePluginPath = resolve(pluginPath);
    const absoluteProjectPath = resolve(projectPath);

    if (absolutePluginPath === absoluteProjectPath) {
      return false;
    }

    if (!existsSync(join(absoluteProjectPath, 'package.json'))) {
      return false;
    }

    const isInCI =
      isTruthy(process.env.CI) || isTruthy(process.env.GITHUB_ACTIONS);
    const shouldShowMessage = !isInCI && process.stdout.isTTY;

    if (shouldShowMessage) {
      const relativePluginPath = getRelativePath(
        absoluteProjectPath,
        absolutePluginPath,
      );
      const projectName = basename(absoluteProjectPath);

      outputContent``;
      outputInfo(
        outputContent`Auto-linking Hydrogen CLI plugin for ${projectName} → ${relativePluginPath}`
          .value,
      );
    }

    const linkFile = join(absoluteProjectPath, SHOPIFY_CLI_LINK_FILE);
    const yamlContent = `${HYDROGEN_PLUGIN_NAME}:\n  path: ${absolutePluginPath}\n`;

    if (existsSync(linkFile)) {
      const existingContent = readFileSync(linkFile, 'utf8');

      const lines = existingContent.split('\n');
      const hydrogenIndex = lines.findIndex((line) =>
        line.includes(HYDROGEN_PLUGIN_NAME),
      );

      if (hydrogenIndex !== -1) {
        let endIndex = hydrogenIndex + 1;
        while (endIndex < lines.length && lines[endIndex]?.startsWith('  ')) {
          endIndex++;
        }
        lines.splice(hydrogenIndex, endIndex - hydrogenIndex);
      }

      const newContent = lines.filter((line) => line.trim()).join('\n');
      const finalContent = newContent
        ? `${newContent}\n${yamlContent}`
        : yamlContent;
      writeFileSync(linkFile, finalContent);
    } else {
      writeFileSync(linkFile, yamlContent);
    }

    clearNodeModulesCache(absoluteProjectPath);

    return true;
  } catch (error) {
    const isInCI =
      isTruthy(process.env.CI) || isTruthy(process.env.GITHUB_ACTIONS);
    if (!isInCI && process.env.NODE_ENV !== 'test') {
      console.error('[Auto-link] Failed to link plugin:', error);
    }
    return false;
  }
}

function clearNodeModulesCache(projectPath: string): void {
  try {
    const shopifyModulesPath = join(projectPath, 'node_modules', '.shopify');
    if (existsSync(shopifyModulesPath)) {
      execFileSync('rm', ['-rf', shopifyModulesPath], {
        cwd: projectPath,
        stdio: 'ignore',
      });
    }
  } catch {
    // Ignore cache clear errors
  }
}

function getRelativePath(from: string, to: string): string {
  const fromParts = resolve(from).split(sep);
  const toParts = resolve(to).split(sep);

  let commonLength = 0;
  for (let i = 0; i < Math.min(fromParts.length, toParts.length); i++) {
    if (fromParts[i] !== toParts[i]) break;
    commonLength++;
  }

  const upCount = fromParts.length - commonLength;
  const downPath = toParts.slice(commonLength);

  const relativeParts = [];
  for (let i = 0; i < upCount; i++) {
    relativeParts.push('..');
  }
  relativeParts.push(...downPath);

  return relativeParts.length > 0 ? relativeParts.join(sep) : '.';
}
