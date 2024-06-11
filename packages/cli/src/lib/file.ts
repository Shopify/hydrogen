import {readdir} from 'node:fs/promises';
import {resolvePath, joinPath} from '@shopify/cli-kit/node/path';
import {
  readFile,
  writeFile,
  fileExists,
  isDirectory,
} from '@shopify/cli-kit/node/fs';
import {
  readAndParsePackageJson,
  writePackageJSON,
  type PackageJson as _PackageJson,
} from '@shopify/cli-kit/node/node-package-manager';
import {formatCode, type FormatOptions} from './format-code.js';
import ts from 'typescript';

export async function replaceFileContent(
  filepath: string,
  formatConfig: FormatOptions | false,
  replacer: (
    content: string,
  ) => Promise<string | null | undefined> | string | null | undefined,
) {
  let content = await replacer(await readFile(filepath));
  if (typeof content !== 'string') return;

  if (formatConfig) {
    content = await formatCode(content, formatConfig, filepath);
  }

  return writeFile(filepath, content);
}

const DEFAULT_EXTENSIONS = [
  'tsx' as const,
  'ts' as const,
  'jsx' as const,
  'js' as const,
  'mjs' as const,
  'cjs' as const,
];

export async function findFileWithExtension(
  directory: string,
  fileBase: string,
  extensions = DEFAULT_EXTENSIONS,
) {
  const dirFiles = await readdir(directory);

  if (dirFiles.includes(fileBase)) {
    const filepath = resolvePath(directory, fileBase);
    if (!(await isDirectory(filepath))) {
      return {filepath};
    }

    for (const extension of ['ts', 'js'] as const) {
      const filepath = resolvePath(directory, `${fileBase}/index.${extension}`);
      if (await fileExists(resolvePath(directory, filepath))) {
        return {filepath, extension, astType: extension};
      }
    }
  } else {
    for (const extension of extensions) {
      const filename = `${fileBase}.${extension}`;
      if (dirFiles.includes(filename)) {
        const astType =
          extension === 'mjs' || extension === 'cjs' ? 'js' : extension;

        return {filepath: resolvePath(directory, filename), extension, astType};
      }
    }
  }

  return {};
}

type PackageJson = _PackageJson & {
  peerDependencies?: _PackageJson['dependencies'];
  comment?: string;
};

const MANAGED_PACKAGE_JSON_KEYS = Object.freeze([
  'dependencies',
  'devDependencies',
  'peerDependencies',
] as const);

type ManagedKey = (typeof MANAGED_PACKAGE_JSON_KEYS)[number];

export async function mergePackageJson(
  sourceDir: string,
  targetDir: string,
  options?: {
    ignoredKeys?: string[];
    onResult?: (pkgJson: PackageJson) => PackageJson;
  },
) {
  const targetPkgJson: PackageJson = await readAndParsePackageJson(
    joinPath(targetDir, 'package.json'),
  );
  const sourcePkgJson: PackageJson = await readAndParsePackageJson(
    joinPath(sourceDir, 'package.json'),
  );

  const ignoredKeys = new Set(['comment', ...(options?.ignoredKeys ?? [])]);

  const unmanagedKeys = Object.keys(sourcePkgJson).filter(
    (key) => !MANAGED_PACKAGE_JSON_KEYS.includes(key as ManagedKey),
  ) as Exclude<keyof PackageJson, ManagedKey>[];

  for (const key of unmanagedKeys) {
    if (ignoredKeys.has(key)) continue;

    const sourceValue = sourcePkgJson[key];
    const targetValue = targetPkgJson[key];

    const newValue =
      Array.isArray(sourceValue) && Array.isArray(targetValue)
        ? [...targetValue, ...sourceValue]
        : typeof sourceValue === 'object' && typeof targetValue === 'object'
        ? {...targetValue, ...sourceValue}
        : sourceValue;

    targetPkgJson[key] = newValue as any;
  }

  const remixVersion = Object.entries(targetPkgJson.dependencies || {}).find(
    ([dep]) => dep.startsWith('@remix-run/'),
  )?.[1];

  for (const key of MANAGED_PACKAGE_JSON_KEYS) {
    if (ignoredKeys.has(key)) continue;

    if (sourcePkgJson[key]) {
      targetPkgJson[key] = [
        ...new Set([
          ...Object.keys(targetPkgJson[key] ?? {}),
          ...Object.keys(sourcePkgJson[key] ?? {}),
        ]),
      ]
        .sort()
        .reduce((acc, dep) => {
          let version = (sourcePkgJson[key]?.[dep] ??
            targetPkgJson[key]?.[dep])!;

          if (dep.startsWith('@remix-run/') && remixVersion) {
            version = remixVersion;
          }

          acc[dep] = version;
          return acc;
        }, {} as Record<string, string>);
    }
  }

  await writePackageJSON(
    targetDir,
    options?.onResult?.(targetPkgJson) ?? targetPkgJson,
  );
}

export function mergeTsConfig(sourceDir: string, targetDir: string) {
  const sourceConfig = ts.readConfigFile(
    joinPath(sourceDir, 'tsconfig.json'),
    ts.sys.readFile,
  ).config;

  if (sourceConfig?.compilerOptions?.types) {
    replaceFileContent(joinPath(targetDir, 'tsconfig.json'), false, (content) =>
      content.replace(
        /"types":\s*\[[^\]]*\]/,
        `"types": ${JSON.stringify(sourceConfig.compilerOptions.types)}`,
      ),
    );
  }
}
