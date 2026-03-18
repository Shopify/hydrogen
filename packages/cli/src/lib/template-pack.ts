import {createReadStream} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {isAbsolute, join} from 'node:path';
import {pipeline} from 'node:stream/promises';
import {tmpdir} from 'node:os';
import gunzipMaybe from 'gunzip-maybe';
import {extract as tarExtract} from 'tar-fs';

// On Windows, .cmd wrappers cannot be directly executed by execFileSync (which
// calls CreateProcess and bypasses the shell). Use shell: true on Windows so
// cmd.exe resolves 'pnpm' to 'pnpm.cmd' via PATH.
export const WINDOWS_SHELL_OPTS =
  process.platform === 'win32' ? {shell: true} : {};
const PNPM_PACK_TIMEOUT_IN_MS = 60_000;

type DependencySection =
  | 'dependencies'
  | 'devDependencies'
  | 'peerDependencies'
  | 'optionalDependencies';

const DEPENDENCY_SECTIONS: DependencySection[] = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
];

type PackageJsonWithDeps = Record<string, unknown> & {
  [K in DependencySection]?: Record<string, string>;
};

type PnpmPackResult = {
  filename: string;
};

function hasReplaceableProtocol(version: string) {
  return version.startsWith('workspace:') || version.startsWith('catalog:');
}

async function getPackedTemplatePackageJson(sourceTemplateDir: string) {
  const tempDir = await mkdtemp(join(tmpdir(), 'hydrogen-template-pack-'));

  try {
    const rawPackResult = execFileSync(
      'pnpm',
      ['pack', '--pack-destination', tempDir, '--json'],
      {
        cwd: sourceTemplateDir,
        encoding: 'utf8',
        timeout: PNPM_PACK_TIMEOUT_IN_MS,
        ...WINDOWS_SHELL_OPTS,
      },
    );

    const parsedResult = JSON.parse(rawPackResult.trim()) as
      | PnpmPackResult
      | PnpmPackResult[];
    const packedTarball = Array.isArray(parsedResult)
      ? parsedResult[0]?.filename
      : parsedResult.filename;

    if (!packedTarball) {
      throw new Error('pnpm pack did not return a tarball filename.');
    }

    const tarballPath = isAbsolute(packedTarball)
      ? packedTarball
      : join(tempDir, packedTarball);

    const PACKAGE_JSON_ENTRY = 'package/package.json';
    await pipeline(
      createReadStream(tarballPath),
      gunzipMaybe(),
      tarExtract(tempDir, {
        filter(name) {
          return name === PACKAGE_JSON_ENTRY;
        },
      }),
    );

    const packedManifestRaw = await readFile(
      join(tempDir, 'package', 'package.json'),
      'utf8',
    );

    return JSON.parse(packedManifestRaw) as PackageJsonWithDeps;
  } finally {
    await rm(tempDir, {recursive: true, force: true});
  }
}

function replaceWorkspaceProtocolVersionsInPackageJson({
  packedManifest,
  targetPackageJson,
}: {
  packedManifest: PackageJsonWithDeps;
  targetPackageJson: PackageJsonWithDeps;
}) {
  for (const section of DEPENDENCY_SECTIONS) {
    const targetDeps = targetPackageJson[section];
    if (!targetDeps) continue;

    for (const [name, version] of Object.entries(targetDeps)) {
      if (!hasReplaceableProtocol(version)) continue;

      const packedVersion = packedManifest[section]?.[name];
      if (!packedVersion) {
        throw new Error(
          `Unable to resolve ${name} from ${section} in packed template manifest.`,
        );
      }

      targetDeps[name] = packedVersion;
    }
  }
}

export async function replaceWorkspaceProtocolVersions({
  sourceTemplateDir,
  targetTemplateDir,
}: {
  sourceTemplateDir: string;
  targetTemplateDir: string;
}) {
  const packedManifest = await getPackedTemplatePackageJson(sourceTemplateDir);
  const targetPackageJsonPath = join(targetTemplateDir, 'package.json');
  const targetPackageJson = JSON.parse(
    await readFile(targetPackageJsonPath, 'utf8'),
  ) as PackageJsonWithDeps;

  replaceWorkspaceProtocolVersionsInPackageJson({
    packedManifest,
    targetPackageJson,
  });

  await writeFile(
    targetPackageJsonPath,
    `${JSON.stringify(targetPackageJson, null, 2)}\n`,
  );
}
