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
};

export default class GenerateRoute extends Command {
  static flags = {
    path: commonFlags.path,
    adaptor: Flags.string({
      description:
        'The Remix adaptor for imports in the template (default: @shopify/remix-oxygen)',
    }),
  };

  static args = [
    {name: 'resource', required: true, options: Object.keys(ROUTE_MAP)},
  ];

  async run(): Promise<void> {
    // @ts-ignore
    const {flags, args} = await this.parse(GenerateRoute);
    const directory = flags.path ? path.resolve(flags.path) : process.cwd();
    const {resource} = args;
    const isTypescript = await file.exists(
      path.join(directory, 'tsconfig.json'),
    );
    const resourcePath = ROUTE_MAP[resource as keyof typeof ROUTE_MAP];
    const extension = isTypescript ? '.tsx' : '.jsx';

    // @todo use findup util from cli-kit
    // copy the template file to the routes folder
    const distPath = new URL('../../../', import.meta.url).pathname;

    console.log(
      await path.findUp(
        async (directory) => {
          const hasUnicorns = await file.exists(
            path.join(directory, 'templates'),
          );
          return hasUnicorns ? directory : '';
        },
        {type: 'directory'},
      ),
    );

    console.log(distPath);
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
      const withArtificialNewLines = escapeNewLines(templateContent);
      const compiled = compile(withArtificialNewLines, config);

      templateContent = restoreNewLines(compiled.outputText);
    }

    if (flags.adaptor) {
      templateContent = templateContent.replace(
        /@shopify\/remix-oxygen/g,
        flags.adaptor,
      );
    }

    await file.write(
      destinationPath,
      await format(templateContent, destinationPath),
    );

    console.log('done');
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
      jsx: 1,
      removeComments: false,
    },
  });
}

async function format(content: string, filePath: string) {
  const config = (await prettier.resolveConfig(filePath)) || {};
  const formattedContent = await prettier.format(content, {
    parser: 'babel',
    ...config,
  });

  return formattedContent;
}
