import { globSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, isAbsolute, join, matchesGlob, relative, resolve } from "node:path";

const SOURCE_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"];
const DECLARATION_FILE_PATTERN = /\.d\.[cm]?ts$/;
const JS_EXTENSION_PATTERN = /\.[cm]?jsx?$/;
const DEFAULT_INCLUDE = ["**/*"];
const DEFAULT_EXCLUDE = ["node_modules", "bower_components", "jspm_packages"];
const ALWAYS_SKIPPED_DIRECTORIES = new Set(DEFAULT_EXCLUDE);
const WILDCARD_PATTERN = /[*?]/;

/** Patterns from a tsconfig, resolved against the directory of the config that declares them. */
interface ScopedPatterns {
  baseDirectory: string;
  patterns: string[];
}

interface ResolvedConfig {
  files?: ScopedPatterns;
  include?: ScopedPatterns;
  exclude?: ScopedPatterns;
  paths?: { baseDirectory: string; mapping: Record<string, string[]> };
}

interface RawConfig {
  extends?: string | string[];
  files?: string[];
  include?: string[];
  exclude?: string[];
  compilerOptions?: { paths?: Record<string, string[]> };
}

/** The source files of a TypeScript project and how its imports resolve, without the TypeScript API. */
export interface SourceProject {
  files: string[];
  resolveImport: (specifier: string, importer: string) => string | undefined;
}

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

/** Returns the index just past the JSON string that starts at `start`. */
function skipString(text: string, start: number): number {
  let index = start + 1;
  while (index < text.length && text[index] !== '"') index += text[index] === "\\" ? 2 : 1;
  return index + 1;
}

/** Returns the index just past whitespace and comments that start at `start`. */
function skipTrivia(text: string, start: number): number {
  let index = start;
  while (index < text.length) {
    if (/\s/.test(text[index] ?? "")) {
      index++;
    } else if (text.startsWith("//", index)) {
      const end = text.indexOf("\n", index);
      index = end === -1 ? text.length : end;
    } else if (text.startsWith("/*", index)) {
      const end = text.indexOf("*/", index + 2);
      index = end === -1 ? text.length : end + 2;
    } else {
      break;
    }
  }
  return index;
}

/** Strips comments and trailing commas so tsconfig files parse as JSON. */
function parseJsonc(text: string): unknown {
  let output = "";
  let index = 0;
  while (index < text.length) {
    const char = text[index] ?? "";
    if (char === '"') {
      const end = skipString(text, index);
      output += text.slice(index, end);
      index = end;
    } else if (char === "/" || /\s/.test(char)) {
      index = Math.max(skipTrivia(text, index), index + 1);
    } else if (char === "," && "}]".includes(text[skipTrivia(text, index + 1)] ?? "")) {
      index++;
    } else {
      output += char;
      index++;
    }
  }
  return JSON.parse(output);
}

function resolveExtendsPath(specifier: string, configPath: string): string {
  if (specifier.startsWith(".") || isAbsolute(specifier)) {
    const candidate = resolve(dirname(configPath), specifier);
    const found = [candidate, `${candidate}.json`].find(isFile);
    if (found) return found;
    throw new Error(`Could not find tsconfig "${specifier}" extended by ${configPath}.`);
  }

  const require = createRequire(configPath);
  const candidates = specifier.endsWith(".json")
    ? [specifier]
    : [`${specifier}.json`, `${specifier}/tsconfig.json`, specifier];
  for (const candidate of candidates) {
    try {
      const resolved = require.resolve(candidate);
      if (resolved.endsWith(".json")) return resolved;
    } catch {
      // Try the next candidate the way TypeScript does.
    }
  }
  throw new Error(`Could not resolve tsconfig "${specifier}" extended by ${configPath}.`);
}

function loadConfig(configPath: string, visited: Set<string>): ResolvedConfig {
  if (visited.has(configPath)) {
    throw new Error(`Circular tsconfig "extends" chain at ${configPath}.`);
  }
  visited.add(configPath);

  // oxlint-disable-next-line typescript-eslint/consistent-type-assertions -- tsconfig files are user JSON; each field read below is optional.
  const raw = parseJsonc(readFileSync(configPath, "utf8")) as RawConfig;
  const baseDirectory = dirname(configPath);
  const config: ResolvedConfig = {};

  for (const parent of raw.extends === undefined ? [] : [raw.extends].flat()) {
    Object.assign(config, loadConfig(resolveExtendsPath(parent, configPath), new Set(visited)));
  }

  if (raw.files) config.files = { baseDirectory, patterns: raw.files };
  if (raw.include) config.include = { baseDirectory, patterns: raw.include };
  if (raw.exclude) config.exclude = { baseDirectory, patterns: raw.exclude };
  const paths = raw.compilerOptions?.paths;
  if (paths) config.paths = { baseDirectory, mapping: paths };

  return config;
}

function isSourceFile(path: string): boolean {
  return (
    SOURCE_EXTENSIONS.some((extension) => path.endsWith(extension)) &&
    !DECLARATION_FILE_PATTERN.test(path)
  );
}

/** A pattern without wildcards that names a directory matches everything below it. */
function expandDirectoryPattern(pattern: string, baseDirectory: string): string {
  if (WILDCARD_PATTERN.test(basename(pattern)) || isFile(resolve(baseDirectory, pattern))) {
    return pattern;
  }
  return join(pattern, "**/*");
}

function isExcluded(file: string, exclude: ScopedPatterns): boolean {
  const relativePath = relative(exclude.baseDirectory, file);
  return exclude.patterns.some(
    (pattern) =>
      matchesGlob(relativePath, pattern) || matchesGlob(relativePath, join(pattern, "**/*")),
  );
}

function matchIncludePattern(pattern: string, include: ScopedPatterns, exclude: ScopedPatterns) {
  const matches = globSync(expandDirectoryPattern(pattern, include.baseDirectory), {
    cwd: include.baseDirectory,
    exclude: (entry) => ALWAYS_SKIPPED_DIRECTORIES.has(basename(entry)),
  });
  return matches
    .map((match) => resolve(include.baseDirectory, match))
    .filter((file) => isSourceFile(file) && !isExcluded(file, exclude) && isFile(file));
}

function listSourceFiles(config: ResolvedConfig, configDirectory: string): string[] {
  const files = (config.files?.patterns ?? [])
    .map((pattern) => resolve(config.files?.baseDirectory ?? configDirectory, pattern))
    .filter((file) => isSourceFile(file) && isFile(file));
  // Like TypeScript, a config without `files` or `include` lists everything below it.
  const include =
    config.include ??
    (config.files ? undefined : { baseDirectory: configDirectory, patterns: DEFAULT_INCLUDE });
  const exclude = config.exclude ?? { baseDirectory: configDirectory, patterns: DEFAULT_EXCLUDE };
  const included = include
    ? include.patterns.flatMap((pattern) => matchIncludePattern(pattern, include, exclude))
    : [];

  return [...new Set([...files, ...included])].toSorted();
}

function findExistingSourceFile(candidate: string): string | undefined {
  const withoutJsExtension = candidate.replace(JS_EXTENSION_PATTERN, "");
  return [
    candidate,
    ...SOURCE_EXTENSIONS.map((extension) => withoutJsExtension + extension),
    ...SOURCE_EXTENSIONS.map((extension) => join(candidate, `index${extension}`)),
  ].find((path) => isSourceFile(path) && isFile(path));
}

function matchPathPatterns(specifier: string, mapping: Record<string, string[]>): string[] {
  let bestMatch: { prefixLength: number; captured: string; targets: string[] } | undefined;

  for (const [pattern, targets] of Object.entries(mapping)) {
    const wildcardIndex = pattern.indexOf("*");
    if (wildcardIndex === -1) {
      if (pattern === specifier) return targets;
      continue;
    }

    const prefix = pattern.slice(0, wildcardIndex);
    const suffix = pattern.slice(wildcardIndex + 1);
    const matches =
      specifier.length >= prefix.length + suffix.length &&
      specifier.startsWith(prefix) &&
      specifier.endsWith(suffix);
    if (matches && (!bestMatch || prefix.length > bestMatch.prefixLength)) {
      bestMatch = {
        prefixLength: prefix.length,
        captured: specifier.slice(prefix.length, specifier.length - suffix.length),
        targets,
      };
    }
  }

  return bestMatch?.targets.map((target) => target.replace("*", bestMatch.captured)) ?? [];
}

/**
 * Reads a tsconfig file and its `extends` chain to find the project's source files and resolve
 * relative and `paths`-mapped imports. Package imports don't resolve.
 */
export function loadSourceProject(tsconfigPath: string): SourceProject {
  const config = loadConfig(tsconfigPath, new Set());

  return {
    files: listSourceFiles(config, dirname(tsconfigPath)),
    resolveImport(specifier, importer) {
      const candidates =
        specifier.startsWith(".") || isAbsolute(specifier)
          ? [resolve(dirname(importer), specifier)]
          : matchPathPatterns(specifier, config.paths?.mapping ?? {}).map((target) =>
              resolve(config.paths?.baseDirectory ?? "", target),
            );
      for (const candidate of candidates) {
        const file = findExistingSourceFile(candidate);
        if (file) return file;
      }
      return undefined;
    },
  };
}
