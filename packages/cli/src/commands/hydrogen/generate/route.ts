import Command from '@shopify/cli-kit/node/base-command';
import {ui} from '@shopify/cli-kit';
import {outputContent, outputToken} from '@shopify/cli-kit/node/output';
import {readFile, fileExists, mkdir, writeFile} from '@shopify/cli-kit/node/fs';
import {
  dirname,
  extname,
  joinPath,
  resolvePath,
  relativePath,
  relativizePath,
} from '@shopify/cli-kit/node/path';
import {AbortError} from '@shopify/cli-kit/node/error';
import {renderSuccess} from '@shopify/cli-kit/node/ui';
import {commonFlags} from '../../../utils/flags.js';
import Flags from '@oclif/core/lib/flags.js';
import ts from 'typescript';
import prettier from 'prettier';

const ROUTE_MAP: Record<string, string | string[]> = {
  page: '/page/$pageHandle',
  cart: '/cart',
  products: '/products/$productHandle',
  collections: '/collections/$collectionHandle',
  policies: ['/policies/index', '/policies/$policyHandle'],
  robots: '/[robots.txt]',
  sitemap: '/[sitemap.xml]',
  account: ['/account/login', '/account/register'],
};

const ROUTES = Object.keys(ROUTE_MAP);

// @ts-ignore TODO
export default class GenerateRoute extends Command {
  static flags = {
    path: commonFlags.path,
    adapter: Flags.string({
      description:
        'The Remix adapter for imports in the template (default: @shopify/remix-oxygen)',
      env: 'SHOPIFY_HYDROGEN_FLAG_ADAPTER',
    }),
    force: Flags.boolean({
      char: 'f',
      description: 'Overwrite existing files',
      env: 'SHOPIFY_HYDROGEN_FLAG_FORCE',
    }),
  };

  static args = [
    {
      name: 'route',
      description: `The route to generate a route for.`,
      required: true,
      options: ROUTES,
      env: 'SHOPIFY_HYDROGEN_ARG_ROUTE',
    },
  ];

  async run(): Promise<void> {
    // @ts-ignore
    const {flags, args} = await this.parse(GenerateRoute);
    const directory = flags.path ? resolvePath(flags.path) : process.cwd();

    const {route} = args;
    const routePath = ROUTE_MAP[route as keyof typeof ROUTE_MAP];

    if (!routePath) {
      throw new AbortError(
        `No template generator found for ${route}. Try one of ${ROUTES.join()}`,
      );
    }
    const isTypescript = await fileExists(joinPath(directory, 'tsconfig.json'));

    const routesArray = Array.isArray(routePath) ? routePath : [routePath];

    try {
      for (const item of routesArray) {
        await runGenerate(item, {
          directory,
          typescript: isTypescript,
          force: flags.force,
          adapter: flags.adapter,
        });
      }
    } catch (err: unknown) {
      throw new AbortError((err as Error).message);
    }

    const extension = isTypescript ? '.tsx' : '.jsx';

    renderSuccess({
      // TODO update to `customSection` when available
      // customSections: [
      //   {
      //     title: `${routesArray.length} route${
      //       routesArray.length > 1 ? 's' : ''
      //     } generated`,
      //     body: {
      //       list: {
      //         items: routesArray.map(
      //           (route) => `app/routes${route}${extension}`,
      //         ),
      //       },
      //     },
      //   },
      // ],
      headline: `${routesArray.length} route${
        routesArray.length > 1 ? 's' : ''
      } generated`,
      body: routesArray
        .map((route) => `• app/routes${route}${extension}`)
        .join('\n'),
    });
  }
}

async function runGenerate(
  route: string,
  {
    directory,
    typescript,
    force,
    adapter,
  }: {
    directory: string;
    typescript: boolean;
    force?: boolean;
    adapter?: string;
  },
) {
  const extension = typescript ? '.tsx' : '.jsx';
  const distPath = new URL('../../../', import.meta.url).pathname;
  const templatePath = joinPath(
    distPath,
    'templates',
    'skeleton',
    'app',
    'routes',
    `${route}.tsx`,
  );
  const destinationPath = joinPath(
    directory,
    'app',
    'routes',
    `${route}${extension}`,
  );
  const relativeDestinationPath = relativePath(directory, destinationPath);

  if (!force && (await fileExists(destinationPath))) {
    const options = [
      {name: 'No', value: 'abort'},
      {name: `Yes`, value: 'overwrite'},
    ];

    const choice = await ui.prompt([
      {
        type: 'select',
        name: 'value',
        message: `The file ${relativizePath(
          relativeDestinationPath,
        )} already exists. Do you want to overwrite it?`,
        choices: options,
      },
    ]);

    if (choice.value === 'abort') {
      throw new AbortError(
        outputContent`The route file ${relativeDestinationPath} already exists. Either delete it or re-run this command with ${outputToken.genericShellCommand(
          `--force`,
        )}.`,
      );
    }
  }

  let templateContent = await readFile(templatePath);

  // If the project is not using TypeScript, we need to compile the template
  // to JavaScript. We try to read the project's jsconfig.json, but if it
  // doesn't exist, we use a default configuration.
  if (!typescript) {
    const config = (await fileExists(joinPath(directory, 'jsconfig.json')))
      ? await import(joinPath(directory, 'jsconfig.json'))
      : {
          lib: ['DOM', 'DOM.Iterable', 'ES2022'],
          isolatedModules: true,
          esModuleInterop: true,
          resolveJsonModule: true,
          target: 'ES2022',
          strict: true,
          allowJs: true,
          forceConsistentCasingInFileNames: true,
          skipLibCheck: true,
        };
    // We need to escape new lines in the template because TypeScript
    // will remove them when compiling.
    const withArtificialNewLines = escapeNewLines(templateContent);

    // We compile the template to JavaScript.
    const compiled = compile(withArtificialNewLines, config);

    // Here we restore the new lines that were removed by TypeScript.
    templateContent = restoreNewLines(compiled.outputText);
  }

  // If the command was run with an adapter flag, we replace the default
  // import with the adapter that was passed.
  if (adapter) {
    templateContent = templateContent.replace(
      /@shopify\/remix-oxygen/g,
      adapter,
    );
  }

  // We format the template content with Prettier.
  // TODO use @shopify/cli-kit's format function once it supports TypeScript
  // templateContent = await file.format(templateContent, destinationPath);
  templateContent = await format(templateContent, destinationPath);

  // Create the directory if it doesn't exist.
  if (!(await fileExists(dirname(destinationPath)))) {
    await mkdir(dirname(destinationPath));
  }
  // Write the final file to the user's project.
  await writeFile(destinationPath, templateContent);
}

const escapeNewLines = (code: string) =>
  code.replace(/\n\n/g, '\n/* :newline: */');
const restoreNewLines = (code: string) =>
  code.replace(/\/\* :newline: \*\//g, '\n');

function compile(code: string, options: ts.CompilerOptions = {}) {
  return ts.transpileModule(code, {
    reportDiagnostics: false,
    compilerOptions: {
      ...options,
      // '1' tells TypeScript to preserve the JSX syntax.
      jsx: 1,
      removeComments: false,
    },
  });
}

async function format(content: string, filePath: string) {
  // Try to read a prettier config file from the project.
  const config = (await prettier.resolveConfig(filePath)) || {};
  const ext = extname(filePath);

  const formattedContent = await prettier.format(content, {
    // Specify the TypeScript parser for ts/tsx files. Otherwise
    // we need to use the babel parser because the default parser
    // Otherwise prettier will print a warning.
    parser: ext === '.tsx' || ext === '.ts' ? 'typescript' : 'babel',
    ...config,
  });

  return formattedContent;
}
