import './setup-template.mocks.js';
import {describe, it, expect, vi, beforeEach} from 'vitest';
import {glob} from 'fast-glob';
import {inTemporaryDirectory, readFile} from '@shopify/cli-kit/node/fs';
import {setupTemplate} from './index.js';
import {type Language} from './common.js';
import {type I18nChoice} from '../setups/i18n/index.js';
import {type StylingChoice} from '../setups/css/index.js';

interface Permutation {
  language: Language;
  markets: I18nChoice;
  styling: StylingChoice;
  routes: boolean;
}

// Test each dimension (language/markets/styling/routes) independently,
// then add combinations to verify feature interactions
const permutations: Permutation[] = [
  {language: 'ts', markets: 'none', styling: 'none', routes: true},
  {language: 'ts', markets: 'none', styling: 'none', routes: false},
  {language: 'js', markets: 'none', styling: 'none', routes: true},
  {language: 'js', markets: 'none', styling: 'none', routes: false},

  {language: 'ts', markets: 'subfolders', styling: 'none', routes: true},
  {language: 'ts', markets: 'subdomains', styling: 'none', routes: true},
  {language: 'ts', markets: 'domains', styling: 'none', routes: true},

  {language: 'ts', markets: 'none', styling: 'tailwind', routes: true},
  {language: 'ts', markets: 'none', styling: 'vanilla-extract', routes: true},

  // PostCSS and CSS Modules don't modify files (Vite built-in), but included to verify they don't break scaffolding
  {language: 'ts', markets: 'none', styling: 'css-modules', routes: true},
  {language: 'ts', markets: 'none', styling: 'postcss', routes: true},

  {language: 'js', markets: 'subfolders', styling: 'tailwind', routes: true},
  {
    language: 'js',
    markets: 'domains',
    styling: 'vanilla-extract',
    routes: true,
  },
  {
    language: 'js',
    markets: 'subdomains',
    styling: 'css-modules',
    routes: false,
  },
];

function expectRoutesScaffolded(
  files: string[],
  markets: I18nChoice,
  jsxExt: string,
) {
  const indexRoute =
    markets === 'subfolders'
      ? `app/routes/($locale)._index${jsxExt}`
      : `app/routes/_index${jsxExt}`;
  expect(files).toContain(indexRoute);

  // Verify additional common routes were scaffolded
  const routeFiles = files.filter((f) => f.startsWith('app/routes/'));
  expect(routeFiles.length).toBeGreaterThan(1);
  expect(
    routeFiles.some((f) =>
      /routes\/(\(\$locale\)\.)?products\.\$handle\.(tsx|jsx)$/.test(f),
    ),
  ).toBe(true);
  expect(
    routeFiles.some((f) => /routes\/(\(\$locale\)\.)?account[._]/.test(f)),
  ).toBe(true);
}

function expectNoRoutes(files: string[]) {
  const routeFiles = files.filter((f) => f.startsWith('app/routes/'));
  expect(routeFiles).toHaveLength(0);
}

describe('scaffolding permutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it.each(permutations)(
    '$language / $markets / $styling / routes=$routes',
    async ({language, markets, styling, routes}) => {
      await inTemporaryDirectory(async (tmpDir) => {
        await setupTemplate({
          path: tmpDir,
          git: false,
          language,
          mockShop: true,
          i18n: markets,
          styling,
          routes,
        });

        const files = await glob('**/*', {
          cwd: tmpDir,
          ignore: ['**/node_modules/**', '**/dist/**'],
        });

        const ext = language === 'ts' ? '.ts' : '.js';
        const jsxExt = language === 'ts' ? '.tsx' : '.jsx';

        // Core files expected in all projects
        const coreFiles = [
          `server${ext}`,
          `app/root${jsxExt}`,
          `app/entry.client${jsxExt}`,
          `app/entry.server${jsxExt}`,
          `vite.config${ext}`,
          language === 'ts' ? 'tsconfig.json' : 'jsconfig.json',
          'package.json',
        ];

        coreFiles.forEach((file) => {
          expect(files).toContain(file);
        });

        if (routes) {
          expectRoutesScaffolded(files, markets, jsxExt);
        } else {
          expectNoRoutes(files);
        }

        if (markets !== 'none') {
          expect(files).toContain(`app/lib/i18n${ext}`);

          const contextContent = await readFile(
            `${tmpDir}/app/lib/context${ext}`,
          );
          expect(contextContent).toMatch(
            /i18n: getLocaleFromRequest\(request\)/,
          );

          const i18nContent = await readFile(`${tmpDir}/app/lib/i18n${ext}`);
          switch (markets) {
            case 'subfolders':
              expect(i18nContent).toMatch(/url\.pathname/);
              break;
            case 'subdomains':
              expect(i18nContent).toMatch(/firstSubdomain = url\.hostname/);
              break;
            case 'domains':
              expect(i18nContent).toMatch(/domain = url\.hostname/);
              break;
            default:
              markets satisfies never;
              throw new Error(`Unhandled markets option: ${markets}`);
          }
        }

        switch (styling) {
          case 'tailwind': {
            const packageJson = await readFile(`${tmpDir}/package.json`);
            expect(packageJson).toMatch(/"@tailwindcss\/vite": "/);
            const viteConfig = await readFile(`${tmpDir}/vite.config${ext}`);
            expect(viteConfig).toMatch(/tailwindcss\(\)/);
            expect(files).toContain('app/styles/tailwind.css');
            break;
          }
          case 'vanilla-extract': {
            const packageJson = await readFile(`${tmpDir}/package.json`);
            expect(packageJson).toMatch(/"@vanilla-extract\/vite-plugin": "/);
            expect(packageJson).toMatch(/"@vanilla-extract\/css": "/);
            const viteConfig = await readFile(`${tmpDir}/vite.config${ext}`);
            expect(viteConfig).toMatch(/vanillaExtractPlugin\(\)/);
            break;
          }
          case 'none':
          case 'css-modules':
          case 'postcss':
            // No additional setup required
            break;
          default:
            styling satisfies never;
            throw new Error(`Unhandled styling option: ${styling}`);
        }
      });
    },
    30_000,
  );
});
