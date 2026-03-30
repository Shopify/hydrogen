import {describe, expect, it, vi} from 'vitest';
import {
  parseCatalogFromWorkspaceYaml,
  parseWorkspacePackagesFromYaml,
  resolveWorkspaceProtocols,
} from './upgrade-e2e-utils.js';

describe('parseCatalogFromWorkspaceYaml', () => {
  it('parses catalog entries with unquoted package names', () => {
    const yaml = `packages:
  - packages/*
  - templates/skeleton

catalog:
  react: '^18.3.1'
  react-dom: '^18.3.1'
`;
    expect(parseCatalogFromWorkspaceYaml(yaml)).toEqual({
      react: '^18.3.1',
      'react-dom': '^18.3.1',
    });
  });

  it('parses catalog entries with quoted package names', () => {
    const yaml = `packages:
  - packages/*

catalog:
  '@types/react': '^18.3.28'
  '@types/react-dom': '^18.3.7'
  '@shopify/prettier-config': '^1.1.2'
`;
    expect(parseCatalogFromWorkspaceYaml(yaml)).toEqual({
      '@types/react': '^18.3.28',
      '@types/react-dom': '^18.3.7',
      '@shopify/prettier-config': '^1.1.2',
    });
  });

  it('handles catalog at end of file without trailing content', () => {
    const yaml = `packages:
  - packages/*

overrides:
  vite: '^6.2.1'

catalog:
  react: '^18.3.1'
  react-dom: '^18.3.1'
`;
    // This is the exact scenario that caused the \Z bug:
    // catalog is the last section in the YAML with no subsequent top-level key
    expect(parseCatalogFromWorkspaceYaml(yaml)).toEqual({
      react: '^18.3.1',
      'react-dom': '^18.3.1',
    });
  });

  it('handles catalog followed by another top-level key', () => {
    const yaml = `catalog:
  react: '^18.3.1'

somethingElse:
  key: value
`;
    expect(parseCatalogFromWorkspaceYaml(yaml)).toEqual({
      react: '^18.3.1',
    });
  });

  it('returns empty object when no catalog section exists', () => {
    const yaml = `packages:
  - packages/*

overrides:
  vite: '^6.2.1'
`;
    expect(parseCatalogFromWorkspaceYaml(yaml)).toEqual({});
  });

  it('ignores malformed lines in catalog section', () => {
    const yaml = `catalog:
  react: '^18.3.1'
  this is not valid yaml
  react-dom: '^18.3.1'
`;
    const result = parseCatalogFromWorkspaceYaml(yaml);
    expect(result.react).toBe('^18.3.1');
    expect(result['react-dom']).toBe('^18.3.1');
  });

  it('handles unquoted version values', () => {
    const yaml = `catalog:
  '@types/node': ^22
`;
    expect(parseCatalogFromWorkspaceYaml(yaml)).toEqual({
      '@types/node': '^22',
    });
  });
});

describe('parseWorkspacePackagesFromYaml', () => {
  it('parses explicit package paths', () => {
    const yaml = `packages:
  - cookbook
  - packages/cli
  - packages/hydrogen
  - templates/skeleton

catalog:
  react: '^18.3.1'
`;
    expect(parseWorkspacePackagesFromYaml(yaml)).toEqual([
      'cookbook',
      'packages/cli',
      'packages/hydrogen',
      'templates/skeleton',
    ]);
  });

  it('returns empty array when no packages section exists', () => {
    const yaml = `catalog:
  react: '^18.3.1'
`;
    expect(parseWorkspacePackagesFromYaml(yaml)).toEqual([]);
  });

  it('handles packages at end of file', () => {
    const yaml = `catalog:
  react: '^18.3.1'

packages:
  - packages/hydrogen
  - packages/cli
`;
    expect(parseWorkspacePackagesFromYaml(yaml)).toEqual([
      'packages/hydrogen',
      'packages/cli',
    ]);
  });
});

describe('resolveWorkspaceProtocols', () => {
  it('resolves workspace:* in dependencies', async () => {
    const pkg = {
      dependencies: {
        '@shopify/hydrogen': 'workspace:*',
        graphql: '^16.10.0',
      },
    };

    const resolveWorkspaceVersion = vi.fn().mockResolvedValue('2026.1.3');

    const result = await resolveWorkspaceProtocols({
      packageJson: pkg,
      catalogVersions: {},
      resolveWorkspaceVersion,
      fallbackVersion: '0.0.0',
    });

    expect(result.dependencies!['@shopify/hydrogen']).toBe('2026.1.3');
    expect(result.dependencies!.graphql).toBe('^16.10.0');
    expect(resolveWorkspaceVersion).toHaveBeenCalledWith('@shopify/hydrogen');
  });

  it('resolves workspace:* in devDependencies', async () => {
    const pkg = {
      dependencies: {
        graphql: '^16.10.0',
      },
      devDependencies: {
        '@shopify/hydrogen-codegen': 'workspace:*',
        '@shopify/mini-oxygen': 'workspace:*',
        typescript: '^5.9.2',
      },
    };

    const resolveWorkspaceVersion = vi
      .fn()
      .mockResolvedValueOnce('0.6.2')
      .mockResolvedValueOnce('3.1.0');

    const result = await resolveWorkspaceProtocols({
      packageJson: pkg,
      catalogVersions: {},
      resolveWorkspaceVersion,
      fallbackVersion: '0.0.0',
    });

    expect(result.devDependencies!['@shopify/hydrogen-codegen']).toBe('0.6.2');
    expect(result.devDependencies!['@shopify/mini-oxygen']).toBe('3.1.0');
    expect(result.devDependencies!.typescript).toBe('^5.9.2');
  });

  it('resolves catalog: in dependencies and devDependencies', async () => {
    const pkg = {
      dependencies: {
        react: 'catalog:',
        'react-dom': 'catalog:',
      },
      devDependencies: {
        '@types/react': 'catalog:',
        '@shopify/prettier-config': 'catalog:',
      },
    };

    const catalogVersions = {
      react: '^18.3.1',
      'react-dom': '^18.3.1',
      '@types/react': '^18.3.28',
      '@shopify/prettier-config': '^1.1.2',
    };

    const result = await resolveWorkspaceProtocols({
      packageJson: pkg,
      catalogVersions,
      resolveWorkspaceVersion: vi.fn(),
      fallbackVersion: '0.0.0',
    });

    expect(result.dependencies!.react).toBe('^18.3.1');
    expect(result.dependencies!['react-dom']).toBe('^18.3.1');
    expect(result.devDependencies!['@types/react']).toBe('^18.3.28');
    expect(result.devDependencies!['@shopify/prettier-config']).toBe('^1.1.2');
  });

  it('uses fallback version when workspace package is not found', async () => {
    const pkg = {
      dependencies: {
        '@shopify/hydrogen': 'workspace:*',
      },
    };

    const resolveWorkspaceVersion = vi.fn().mockResolvedValue(null);

    const result = await resolveWorkspaceProtocols({
      packageJson: pkg,
      catalogVersions: {},
      resolveWorkspaceVersion,
      fallbackVersion: '2026.1.3',
    });

    expect(result.dependencies!['@shopify/hydrogen']).toBe('2026.1.3');
  });

  it('leaves non-protocol versions unchanged', async () => {
    const pkg = {
      dependencies: {
        graphql: '^16.10.0',
        isbot: '^5.1.22',
      },
      devDependencies: {
        typescript: '^5.9.2',
        vite: '^6.2.4',
      },
    };

    const result = await resolveWorkspaceProtocols({
      packageJson: pkg,
      catalogVersions: {},
      resolveWorkspaceVersion: vi.fn(),
      fallbackVersion: '0.0.0',
    });

    expect(result.dependencies).toEqual(pkg.dependencies);
    expect(result.devDependencies).toEqual(pkg.devDependencies);
  });

  it('handles package.json with missing dependency sections', async () => {
    const pkg = {
      name: 'skeleton',
      version: '2026.1.3',
    };

    const result = await resolveWorkspaceProtocols({
      packageJson: pkg,
      catalogVersions: {},
      resolveWorkspaceVersion: vi.fn(),
      fallbackVersion: '0.0.0',
    });

    expect(result.dependencies).toBeUndefined();
    expect(result.devDependencies).toBeUndefined();
  });

  it('leaves catalog: unchanged when catalog version is not found', async () => {
    const pkg = {
      dependencies: {
        'unknown-package': 'catalog:',
      },
    };

    const result = await resolveWorkspaceProtocols({
      packageJson: pkg,
      catalogVersions: {},
      resolveWorkspaceVersion: vi.fn(),
      fallbackVersion: '0.0.0',
    });

    // catalog: without a matching entry stays as-is (better to fail loudly at npm install)
    expect(result.dependencies!['unknown-package']).toBe('catalog:');
  });

  it('does not mutate the original package.json object', async () => {
    const pkg = {
      dependencies: {
        '@shopify/hydrogen': 'workspace:*',
        react: 'catalog:',
      },
    };
    const original = JSON.parse(JSON.stringify(pkg));

    await resolveWorkspaceProtocols({
      packageJson: pkg,
      catalogVersions: {react: '^18.3.1'},
      resolveWorkspaceVersion: vi.fn().mockResolvedValue('2026.1.3'),
      fallbackVersion: '0.0.0',
    });

    expect(pkg).toEqual(original);
  });
});
