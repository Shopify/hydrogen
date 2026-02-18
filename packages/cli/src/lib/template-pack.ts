import {execFileSync} from 'node:child_process';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

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

export async function getPackedTemplatePackageJson(sourceTemplateDir: string) {
  const tempDir = await mkdtemp(join(tmpdir(), 'hydrogen-template-pack-'));

  try {
    const rawPackResult = execFileSync(
      'pnpm',
      ['pack', '--pack-destination', tempDir, '--json'],
      {
        cwd: sourceTemplateDir,
        encoding: 'utf8',
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

    const packedManifestRaw = execFileSync(
      'tar',
      [
        '-xOf',
        packedTarball.startsWith('/')
          ? packedTarball
          : join(tempDir, packedTarball),
        'package/package.json',
      ],
      {encoding: 'utf8'},
    );

    return JSON.parse(packedManifestRaw) as PackageJsonWithDeps;
  } finally {
    await rm(tempDir, {recursive: true, force: true});
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

  for (const section of DEPENDENCY_SECTIONS) {
    const targetDeps = targetPackageJson[section];
    if (!targetDeps) continue;

    for (const [name, version] of Object.entries(targetDeps)) {
      if (!version.startsWith('workspace:')) continue;

      const packedVersion = packedManifest[section]?.[name];
      if (!packedVersion) {
        throw new Error(
          `Unable to resolve ${name} from ${section} in packed template manifest.`,
        );
      }

      targetDeps[name] = packedVersion;
    }
  }

  await writeFile(
    targetPackageJsonPath,
    `${JSON.stringify(targetPackageJson, null, 2)}\n`,
  );
}
