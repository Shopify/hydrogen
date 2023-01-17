import Command from '@shopify/cli-kit/node/base-command';
import {path, file, error, output, ui} from '@shopify/cli-kit';
import {commonFlags} from '../../../utils/flags.js';
import Flags from '@oclif/core/lib/flags.js';
import ts from 'typescript';
import prettier from 'prettier';

const ROUTE_MAP: Record<string, string | string[]> = {
  page: '/page/$pageHandle',
  cart: '/cart',
  product: '/products/$productHandle',
  collection: '/collections/$collectionHandle',
  collections: '/collections/index',
  policies: '/policies/index',
  policy: '/policies/$policyHandle',
  robots: '/[robots.txt]',
  sitemap: '/[sitemap.xml]',
  account: ['/account/login', '/account/register'],
};

const RESOURCES = Object.keys(ROUTE_MAP);

export default class GenerateRoute extends Command {
  static flags = {
    path: commonFlags.path,
    adapter: Flags.string({
      description:
        'The Remix adapter for imports in the template (default: @shopify/remix-oxygen)',
    }),
    force: Flags.boolean({
      char: 'f',
      description: 'Overwrite existing files',
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

    if (!resourcePath) {
      throw new error.Abort(
        `No template generator found for ${resource}. Try one of ${RESOURCES.join()}`,
      );
    }

    for (const item of [
      ...(Array.isArray(resourcePath) ? resourcePath : [resourcePath]),
    ]) {
      runGenerate(item, {
        directory,
        typescript: isTypescript,
        force: flags.force,
        adapter: flags.adapter,
      });
    }
  }
}

async function runGenerate(
  resource: string,
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
  const templatePath = path.join(distPath, 'templates', `${resource}.tsx`);
  const destinationPath = path.join(
    directory,
    'app',
    'routes',
    `${resource}${extension}`,
  );
  const relativeDestinationPath = path.relative(directory, destinationPath);

  if (!force && (await file.exists(destinationPath))) {
    const options = [
      {name: 'No', value: 'abort'},
      {name: `Yes`, value: 'overwrite'},
    ];

    const choice = await ui.prompt([
      {
        type: 'select',
        name: 'value',
        message: `The file ${path.relative(
          process.cwd(),
          relativeDestinationPath,
        )} already exists. Do you want to overwrite it?`,
        choices: options,
      },
    ]);

    if (choice.value === 'abort') {
      throw new error.Abort(
        output.content`The route file ${relativeDestinationPath} already exists. Either delete it or re-run this command with ${output.token.genericShellCommand(
          `--force`,
        )}.`,
      );
    }
  }

  let templateContent = await file.read(templatePath);

  // If the project is not using TypeScript, we need to compile the template
  // to JavaScript. We try to read the project's jsconfig.json, but if it
  // doesn't exist, we use a default configuration.
  if (!typescript) {
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
  if (!(await file.exists(path.dirname(destinationPath)))) {
    await file.mkdir(path.dirname(destinationPath));
  }
  // Write the final file to the user's project.
  await file.write(destinationPath, templateContent);

  output.success(`Created ${resource} at ${relativeDestinationPath}`);
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
  const ext = path.extname(filePath);

  const formattedContent = await prettier.format(content, {
    // Specify the TypeScript parser for ts/tsx files. Otherwise
    // we need to use the babel parser because the default parser
    // Otherwise prettier will print a warning.
    parser: ext === '.tsx' || ext === '.ts' ? 'typescript' : 'babel',
    ...config,
  });

  return formattedContent;
}
