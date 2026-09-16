import {describe, expect, it} from 'vitest';
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {getViteConfig} from './vite-config.js';

const repoRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../..',
);

function sourceImport(sourcePath: string) {
  return pathToFileURL(sourcePath).href;
}

function createSkeletonFixture({
  reactRouterConfig,
}: {reactRouterConfig?: string} = {}) {
  const root = mkdtempSync(join(tmpdir(), 'hydrogen-skeleton-'));
  const skeletonRoot = join(repoRoot, 'templates/skeleton');

  cpSync(skeletonRoot, root, {
    recursive: true,
    filter: (source) => !source.split(/[\\/]/).includes('node_modules'),
  });

  symlinkSync(join(repoRoot, 'node_modules'), join(root, 'node_modules'));

  writeFileSync(
    join(root, 'vite.config.ts'),
    readFileSync(join(skeletonRoot, 'vite.config.ts'), 'utf8')
      .replace(
        "from 'vite'",
        `from '${sourceImport(
          join(repoRoot, 'packages/cli/node_modules/vite/dist/node/index.js'),
        )}'`,
      )
      .replace(
        "from '@shopify/hydrogen/vite'",
        `from '${sourceImport(
          join(repoRoot, 'packages/hydrogen/src/vite/plugin.ts'),
        )}'`,
      )
      .replace(
        "from '@shopify/mini-oxygen/vite'",
        `from '${sourceImport(
          join(repoRoot, 'packages/mini-oxygen/src/vite/plugin.ts'),
        )}'`,
      ),
  );

  writeFileSync(
    join(root, 'react-router.config.ts'),
    reactRouterConfig ??
      readFileSync(
        join(skeletonRoot, 'react-router.config.ts'),
        'utf8',
      ).replace(
        "from '@shopify/hydrogen/react-router-preset'",
        `from '${sourceImport(
          join(repoRoot, 'packages/hydrogen/src/react-router-preset.ts'),
        )}'`,
      ),
  );

  writeFileSync(
    join(root, 'app/routes.ts'),
    readFileSync(join(skeletonRoot, 'app/routes.ts'), 'utf8').replace(
      "import {hydrogenRoutes} from '@shopify/hydrogen';",
      `import {hydrogenRoutes} from '${sourceImport(
        join(repoRoot, 'packages/hydrogen/src/dev/hydrogen-routes.ts'),
      )}';`,
    ),
  );

  return root;
}

function createViteFixture(viteConfig: string) {
  const root = mkdtempSync(join(tmpdir(), 'hydrogen-vite-'));

  symlinkSync(
    join(repoRoot, 'packages/cli/node_modules'),
    join(root, 'node_modules'),
  );
  writeFileSync(join(root, 'vite.config.ts'), viteConfig);

  return root;
}

async function withNodeEnv<T>(env: string, callback: () => Promise<T>) {
  const original = process.env.NODE_ENV;
  process.env.NODE_ENV = env;

  try {
    return await callback();
  } finally {
    process.env.NODE_ENV = original;
  }
}

describe('getViteConfig', () => {
  it('infers deploy output directories from the skeleton template Vite config', async () => {
    const root = createSkeletonFixture();

    try {
      const viteConfig = await withNodeEnv('production', () =>
        getViteConfig(root),
      );

      expect(viteConfig.resolvedViteConfig.build.outDir).toBe(
        join(root, 'dist/server'),
      );
      expect(
        viteConfig.resolvedViteConfig.environments.client?.build.outDir,
      ).toBe(join(root, 'dist/server'));

      const reactRouterPluginContext = (viteConfig.resolvedViteConfig as any)
        .__reactRouterPluginContext;

      expect(
        reactRouterPluginContext.reactRouterConfig.future.v8_viteEnvironmentApi,
      ).toBe(false);
      expect(reactRouterPluginContext.reactRouterConfig.buildDirectory).toBe(
        join(root, 'dist'),
      );
      expect(viteConfig.clientOutDir).toBe(join(root, 'dist/client'));
      expect(viteConfig.serverOutDir).toBe(join(root, 'dist/server'));
      expect(viteConfig.serverOutFile).toBe(join(root, 'dist/server/index.js'));
    } finally {
      rmSync(root, {recursive: true, force: true});
    }
  });

  it('uses React Router default build directories when the config does not set buildDirectory', async () => {
    const root = createSkeletonFixture({
      reactRouterConfig: `import type {Config} from '@react-router/dev/config';

export default {} satisfies Config;
`,
    });

    try {
      const viteConfig = await withNodeEnv('production', () =>
        getViteConfig(root),
      );

      expect(viteConfig.resolvedViteConfig.build.outDir).toBe(
        join(root, 'build/server'),
      );
      expect(
        viteConfig.resolvedViteConfig.environments.client?.build.outDir,
      ).toBe(join(root, 'build/server'));

      const reactRouterPluginContext = (viteConfig.resolvedViteConfig as any)
        .__reactRouterPluginContext;

      expect(reactRouterPluginContext.reactRouterConfig.buildDirectory).toBe(
        join(root, 'build'),
      );
      expect(viteConfig.clientOutDir).toBe(join(root, 'build/client'));
      expect(viteConfig.serverOutDir).toBe(join(root, 'build/server'));
      expect(viteConfig.serverOutFile).toBe(
        join(root, 'build/server/index.js'),
      );
    } finally {
      rmSync(root, {recursive: true, force: true});
    }
  });

  it('falls back to Vite output directories when React Router config is not available', async () => {
    const root = createViteFixture(`import {defineConfig} from 'vite';

export default defineConfig({
  build: {
    outDir: '.output/server',
  },
});
`);

    try {
      const viteConfig = await withNodeEnv('production', () =>
        getViteConfig(root),
      );

      expect(
        (viteConfig.resolvedViteConfig as any).__reactRouterPluginContext,
      ).toBeUndefined();
      expect(viteConfig.resolvedViteConfig.build.outDir).toBe('.output/server');
      expect(viteConfig.clientOutDir).toBe('.output/client');
      expect(viteConfig.serverOutDir).toBe('.output/server');
      expect(viteConfig.serverOutFile).toBe('.output/server/index.js');
    } finally {
      rmSync(root, {recursive: true, force: true});
    }
  });

  it('keeps the fixture aligned with the skeleton template entry points', async () => {
    await expect(
      readFile(join(repoRoot, 'templates/skeleton/vite.config.ts'), 'utf8'),
    ).resolves.toContain('@shopify/hydrogen/vite');
    await expect(
      readFile(
        join(repoRoot, 'templates/skeleton/react-router.config.ts'),
        'utf8',
      ),
    ).resolves.toContain('@shopify/hydrogen/react-router-preset');
  });
});
