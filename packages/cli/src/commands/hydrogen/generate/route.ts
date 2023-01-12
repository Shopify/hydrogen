import Command from '@shopify/cli-kit/node/base-command';
import {path, file, error, output} from '@shopify/cli-kit';
import {commonFlags} from '../../../utils/flags.js';
import Flags from '@oclif/core/lib/flags.js';
import ts from 'typescript';
import prettier from 'prettier';

const ROUTE_MAP = {
  cart: '/cart',
  product: '/products/$productHandle',
  collection: '/collections/$collectionHandle',
  collections: '/collections/index',
  page: '/pages/$pageHandle',
  policies: '/policies/index',
  policy: '/policies/$policyHandle',
  robots: '/[robots.txt]',
  sitemap: '/[sitemap.xml]',
  discounts: '/discounts/$discountHandle',
  search: '/search',
  account: '/account',
};

const RESOURCES = Object.keys(ROUTE_MAP);

export default class GenerateRoute extends Command {
  static flags = {
    path: commonFlags.path,
    adaptor: Flags.string({
      description:
        'The Remix adaptor for imports in the template (default: @shopify/remix-oxygen)',
    }),
  };

  static args = [
    {
      name: 'resource',
      description: `The resource to generate a route for.`,
      required: true,
      options: RESOURCES,
    },
  ];

  async run(): Promise<void> {
    // @ts-ignore
    const {flags, args} = await this.parse(GenerateRoute);
    const directory = flags.path ? path.resolve(flags.path) : process.cwd();

    const {resource} = args;
    const resourcePath = ROUTE_MAP[resource as keyof typeof ROUTE_MAP];

    const isTypescript = await file.exists(
      path.join(directory, 'tsconfig.json'),
    );
    const extension = isTypescript ? '.tsx' : '.jsx';
    const distPath = new URL('../../../', import.meta.url).pathname;

    const templatePath = path.join(
      distPath,
      'templates',
      `${resourcePath}.tsx`,
    );
    const destinationPath = path.join(
      directory,
      'app',
      'routes',
      `${resourcePath}${extension}`,
    );

    let templateContent = await file.read(templatePath);

    // If the project is not using TypeScript, we need to compile the template
    // to JavaScript. We try to read the project's jsconfig.json, but if it
    // doesn't exist, we use a default configuration.
    if (!isTypescript) {
      const config = (await file.exists(path.join(directory, 'jsconfig.json')))
        ? await import(path.join(directory, 'jsconfig.json'))
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

      ts.transpileModule(withArtificialNewLines, {
        reportDiagnostics: false,
        compilerOptions: {
          ...config,
          jsx: 1,
          removeComments: false,
        },
      });

      // Here we restore the new lines that were removed by TypeScript.
      templateContent = restoreNewLines(compiled.outputText);
    }

    // If the command was run with an adaptor flag, we replace the default
    // import with the adaptor that was passed.
    if (flags.adaptor) {
      templateContent = templateContent.replace(
        /@shopify\/remix-oxygen/g,
        flags.adaptor,
      );
    }

    // We format the template content with Prettier.
    templateContent = await format(templateContent, destinationPath);

    // Write the final file to the user's project.
    await file.write(destinationPath, templateContent);
  }
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
  const formattedContent = await prettier.format(content, {
    // We need to use the babel parser because the default parser
    // Otherwise prettier will print a warning.
    parser: 'babel',
    ...config,
  });

  return formattedContent;
}
