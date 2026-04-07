type DependencySection = 'dependencies' | 'devDependencies';

const DEPENDENCY_SECTIONS: DependencySection[] = [
  'dependencies',
  'devDependencies',
];

type PackageJsonWithDeps = Record<string, unknown> & {
  [K in DependencySection]?: Record<string, string>;
};

/**
 * Parses the `catalog:` section from pnpm-workspace.yaml content.
 *
 * Uses a regex rather than a full YAML parser to avoid adding a
 * dependency for this test utility. The regex captures all consecutive
 * indented lines after `catalog:`, matching YAML block mapping semantics
 * where indentation defines the block boundary.
 */
export function parseCatalogFromWorkspaceYaml(
  yamlContent: string,
): Record<string, string> {
  const catalogVersions: Record<string, string> = {};

  const catalogMatch = yamlContent.match(/^catalog:\s*\n((?:[ \t]+.+\n?)*)/m);

  const catalogSection = catalogMatch?.[1];
  if (!catalogSection) return catalogVersions;

  for (const line of catalogSection.split('\n')) {
    const match = line.match(
      /^\s+['"]?([^'":]+?)['"]?\s*:\s*['"]?([^'"]+?)['"]?\s*$/,
    );
    if (match?.[1] && match[2]) {
      catalogVersions[match[1].trim()] = match[2].trim();
    }
  }

  return catalogVersions;
}

/**
 * Parses the `packages:` section from pnpm-workspace.yaml content.
 * Returns raw path entries (e.g., ['packages/cli', 'templates/skeleton']).
 * Glob patterns are returned as-is — the Hydrogen monorepo uses explicit paths.
 */
export function parseWorkspacePackagesFromYaml(yamlContent: string): string[] {
  const packagesMatch = yamlContent.match(
    /^packages:\s*\n((?:[ \t]+-.+\n?)*)/m,
  );

  const packagesSection = packagesMatch?.[1];
  if (!packagesSection) return [];

  return packagesSection
    .split('\n')
    .map((line) => line.match(/^\s+-\s+(.+)/)?.[1]?.trim())
    .filter((path): path is string => Boolean(path));
}

interface ResolveWorkspaceProtocolsOptions {
  packageJson: PackageJsonWithDeps;
  catalogVersions: Record<string, string>;
  resolveWorkspaceVersion: (packageName: string) => Promise<string | null>;
  fallbackVersion: string;
}

/**
 * Resolves pnpm-specific protocols (`workspace:*` and `catalog:`) in a
 * package.json's dependency sections.
 *
 * Handles `workspace:*` (plain) and `workspace:*<version>` (with suffix,
 * seen in some changesets-published releases like 2026.1.1).
 *
 * Returns a new object — the input is not mutated.
 */
export async function resolveWorkspaceProtocols({
  packageJson,
  catalogVersions,
  resolveWorkspaceVersion,
  fallbackVersion,
}: ResolveWorkspaceProtocolsOptions): Promise<PackageJsonWithDeps> {
  const resolved: PackageJsonWithDeps = JSON.parse(JSON.stringify(packageJson));

  for (const section of DEPENDENCY_SECTIONS) {
    const deps = resolved[section];
    if (!deps) continue;

    for (const [name, version] of Object.entries(deps)) {
      if (version.startsWith('workspace:')) {
        const resolvedVersion = await resolveWorkspaceVersion(name);
        deps[name] = resolvedVersion ?? fallbackVersion;
      } else if (version === 'catalog:' && catalogVersions[name]) {
        deps[name] = catalogVersions[name];
      }
    }
  }

  return resolved;
}
